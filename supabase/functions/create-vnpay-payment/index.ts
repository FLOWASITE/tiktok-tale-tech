import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const vnpTmnCode = Deno.env.get('VNPAY_TMN_CODE')!;
    const vnpHashSecret = Deno.env.get('VNPAY_HASH_SECRET')!;
    const vnpUrl = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';

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
    const { organization_id, plan_type, billing_cycle, return_url } = await req.json();

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

    const amount = cycle === 'yearly' ? planLimit.price_yearly : planLimit.price_monthly;
    if (!amount || amount <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid plan price' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create unique txn ref
    const txnRef = `${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

    // Save pending order
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
      });

    if (orderError) {
      console.error('Failed to create order:', orderError);
      return new Response(JSON.stringify({ error: 'Failed to create payment order' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Build VNPay payment URL
    const now = new Date();
    const ipnUrl = `${supabaseUrl}/functions/v1/vnpay-callback`;
    const clientReturnUrl = return_url || `${req.headers.get('origin') || 'https://app.flowa.one'}/payment/result`;

    const vnpParams: Record<string, string> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: vnpTmnCode,
      vnp_Locale: 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: txnRef,
      vnp_OrderInfo: `Nang cap goi ${plan_type} - ${cycle}`,
      vnp_OrderType: 'other',
      vnp_Amount: (amount * 100).toString(), // VNPay requires smallest unit
      vnp_ReturnUrl: clientReturnUrl,
      vnp_IpAddr: req.headers.get('x-forwarded-for') || '127.0.0.1',
      vnp_CreateDate: formatVNPayDate(now),
      vnp_ExpireDate: formatVNPayDate(new Date(now.getTime() + 15 * 60 * 1000)),
    };

    // Sort and create query string for signing
    const sorted = sortObject(vnpParams);
    const signData = new URLSearchParams(sorted).toString();
    const secureHash = await hmacSHA512(vnpHashSecret, signData);

    // Build final URL
    const finalParams = new URLSearchParams(sorted);
    finalParams.append('vnp_SecureHash', secureHash);

    const paymentUrl = `${vnpUrl}?${finalParams.toString()}`;

    return new Response(JSON.stringify({ payment_url: paymentUrl, txn_ref: txnRef }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Error creating VNPay payment:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
