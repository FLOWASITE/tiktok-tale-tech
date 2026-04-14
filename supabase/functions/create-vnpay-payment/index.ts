import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PLAN_ORDER = ['free', 'starter', 'pro', 'business', 'enterprise'];

function sortObject(obj: Record<string, string>) {
  const sorted: Record<string, string> = {};
  const keys = Object.keys(obj).sort();
  for (const key of keys) {
    sorted[key] = obj[key];
  }
  return sorted;
}

async function hmacSHA512(secret: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function formatVNPayDate(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

interface VoucherRecord {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  max_uses: number | null;
  used_count: number;
  applicable_plans: string[] | null;
  min_amount: number;
  starts_at: string;
  expires_at: string | null;
  is_active: boolean;
}

function validateVoucher(voucher: VoucherRecord, planType: string, amount: number): string | null {
  if (!voucher.is_active) return 'Mã voucher không còn hoạt động';
  const now = new Date();
  if (voucher.starts_at && new Date(voucher.starts_at) > now) return 'Mã voucher chưa có hiệu lực';
  if (voucher.expires_at && new Date(voucher.expires_at) < now) return 'Mã voucher đã hết hạn';
  if (voucher.max_uses !== null && voucher.used_count >= voucher.max_uses) return 'Mã voucher đã hết lượt sử dụng';
  if (voucher.applicable_plans && voucher.applicable_plans.length > 0 && !voucher.applicable_plans.includes(planType)) {
    return 'Mã voucher không áp dụng cho gói này';
  }
  if (amount < voucher.min_amount) return `Đơn hàng tối thiểu ${voucher.min_amount}₫ để dùng mã này`;
  return null;
}

function calculateDiscount(voucher: VoucherRecord, amount: number): number {
  if (voucher.discount_type === 'percentage') {
    return Math.ceil(amount * Math.min(voucher.discount_value, 100) / 100);
  }
  return Math.min(voucher.discount_value, amount);
}

Deno.Deno.serve(withPerf({ functionName: 'create-vnpay-payment' }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const vnpTmnCode = Deno.env.get('VNPAY_TMN_CODE')!;
    const vnpHashSecret = Deno.env.get('VNPAY_HASH_SECRET')!;
    const vnpEnv = Deno.env.get('VNPAY_ENV') || 'sandbox';
    const vnpUrl = vnpEnv === 'production'
      ? 'https://pay.vnpay.vn/vpcpay.html'
      : 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';

    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    const userId = claimsData.claims.sub as string;

    // Parse body
    const { organization_id, plan_type, billing_cycle, return_url, voucher_code, bank_code } = await req.json();

    if (!organization_id || !plan_type || !['starter', 'pro', 'business', 'enterprise'].includes(plan_type)) {
      return new Response(JSON.stringify({ error: 'Invalid plan_type or missing organization_id' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const cycle = billing_cycle === 'yearly' ? 'yearly' : 'monthly';

    // Check org membership
    const serviceClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    
    const { data: membership } = await serviceClient
      .from('organization_members')
      .select('role')
      .eq('user_id', userId)
      .eq('organization_id', organization_id)
      .maybeSingle();

    if (!membership) {
      return new Response(JSON.stringify({ error: 'Not a member of this organization' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get plan price
    const { data: planLimit } = await serviceClient
      .from('plan_limits')
      .select('price_monthly, price_yearly')
      .eq('plan_type', plan_type)
      .maybeSingle();

    if (!planLimit) {
      return new Response(JSON.stringify({ error: 'Plan not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const fullPrice = cycle === 'yearly' ? planLimit.price_yearly : planLimit.price_monthly;
    if (!fullPrice || fullPrice <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid plan price' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check for existing active subscription to calculate proration
    const { data: currentSub } = await serviceClient
      .from('subscriptions')
      .select('plan_type, current_period_start, current_period_end, status')
      .eq('organization_id', organization_id)
      .eq('status', 'active')
      .maybeSingle();

    let amount = fullPrice;
    let isProrated = false;
    let daysRemaining = 0;
    let daysInPeriod = 0;

    if (currentSub && currentSub.current_period_end) {
      const now = new Date();
      const periodEnd = new Date(currentSub.current_period_end);
      const periodStart = new Date(currentSub.current_period_start);
      const currentRank = PLAN_ORDER.indexOf(currentSub.plan_type);
      const newRank = PLAN_ORDER.indexOf(plan_type);

      if (newRank > currentRank && periodEnd > now) {
        daysInPeriod = Math.max(1, Math.ceil((periodEnd.getTime() - periodStart.getTime()) / 86400000));
        daysRemaining = Math.max(1, Math.ceil((periodEnd.getTime() - now.getTime()) / 86400000));
        amount = Math.ceil(fullPrice * daysRemaining / daysInPeriod);
        isProrated = true;
        console.log(`Proration: ${daysRemaining}/${daysInPeriod} days, ${amount}₫ (full: ${fullPrice}₫)`);
      }
    }

    // Validate & apply voucher
    let voucherData: VoucherRecord | null = null;
    let discountAmount = 0;

    if (voucher_code && typeof voucher_code === 'string' && voucher_code.trim()) {
      const code = voucher_code.trim().toUpperCase();
      const { data: voucher } = await serviceClient
        .from('vouchers')
        .select('*')
        .eq('code', code)
        .eq('is_active', true)
        .maybeSingle();

      if (!voucher) {
        return new Response(JSON.stringify({ error: 'Mã voucher không tồn tại' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const validationError = validateVoucher(voucher as VoucherRecord, plan_type, amount);
      if (validationError) {
        return new Response(JSON.stringify({ error: validationError }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      voucherData = voucher as VoucherRecord;
      discountAmount = calculateDiscount(voucherData, amount);
      amount = Math.max(1000, amount - discountAmount); // VNPay minimum 1000₫
      console.log(`Voucher ${code}: discount ${discountAmount}₫, final amount ${amount}₫`);
    }

    // Create unique txn ref
    const txnRef = `${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

    // Save pending order with proration + voucher metadata
    const metadata: Record<string, unknown> = {};
    if (isProrated) {
      metadata.prorated = true;
      metadata.original_amount = fullPrice;
      metadata.days_remaining = daysRemaining;
      metadata.days_in_period = daysInPeriod;
      metadata.previous_plan = currentSub?.plan_type;
    }
    if (voucherData) {
      metadata.voucher_id = voucherData.id;
      metadata.voucher_code = voucherData.code;
      metadata.discount_amount = discountAmount;
      metadata.amount_before_discount = amount + discountAmount;
    }

    const { error: orderError } = await serviceClient
      .from('payment_orders')
      .insert({
        organization_id,
        user_id: userId,
        plan_type,
        billing_cycle: cycle,
        amount,
        vnpay_txn_ref: txnRef,
        status: 'pending',
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      });

    if (orderError) {
      console.error('Failed to create order:', orderError);
      return new Response(JSON.stringify({ error: 'Failed to create payment order' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Build VNPay payment URL
    const now = new Date();
    const clientReturnUrl = return_url || `${req.headers.get('origin') || 'https://app.flowa.one'}/payment/result`;

    const vnpParams: Record<string, string> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: vnpTmnCode,
      vnp_Locale: 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: txnRef,
      vnp_OrderInfo: `Nang cap goi ${plan_type} - ${cycle}${isProrated ? ' (prorate)' : ''}${voucherData ? ` [voucher: ${voucherData.code}]` : ''}`,
      vnp_OrderType: 'other',
      vnp_Amount: (amount * 100).toString(),
      vnp_ReturnUrl: clientReturnUrl,
      vnp_IpAddr: req.headers.get('x-forwarded-for') || '127.0.0.1',
      vnp_CreateDate: formatVNPayDate(now),
      vnp_ExpireDate: formatVNPayDate(new Date(now.getTime() + 15 * 60 * 1000)),
    };

    // Add bank code if specified
    if (bank_code && typeof bank_code === 'string' && ['VNPAYQR', 'VNBANK', 'VNPAYEWALLET', 'INTCARD'].includes(bank_code)) {
      vnpParams['vnp_BankCode'] = bank_code;
    }

    const sorted = sortObject(vnpParams);
    const signData = new URLSearchParams(sorted).toString();
    const secureHash = await hmacSHA512(vnpHashSecret, signData);

    const finalParams = new URLSearchParams(sorted);
    finalParams.append('vnp_SecureHash', secureHash);

    const paymentUrl = `${vnpUrl}?${finalParams.toString()}`;

    return new Response(JSON.stringify({
      payment_url: paymentUrl,
      txn_ref: txnRef,
      amount,
      environment: vnpEnv,
      is_prorated: isProrated,
      ...(isProrated && {
        original_amount: fullPrice,
        days_remaining: daysRemaining,
        days_in_period: daysInPeriod,
      }),
      ...(voucherData && {
        voucher_applied: true,
        voucher_code: voucherData.code,
        discount_amount: discountAmount,
        amount_before_discount: amount + discountAmount,
      }),
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Error creating VNPay payment:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}));
