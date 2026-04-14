import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { withPerf } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PLAN_ORDER = ['free', 'starter', 'pro', 'business', 'enterprise'];

async function hmacSHA256(secret: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(withPerf({ functionName: 'payos-webhook' }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payosChecksumKey = Deno.env.get('PAYOS_CHECKSUM_KEY');
    if (!payosChecksumKey) {
      console.error('PAYOS_CHECKSUM_KEY not configured');
      return new Response(JSON.stringify({ error: 'Configuration error' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    console.log('payOS webhook received:', JSON.stringify(body));

    const { code, desc, data, signature } = body;

    if (!data || !signature) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify signature
    // payOS webhook signature: orderCode + amount + description + ... sorted alphabetically
    const { orderCode, amount, description, accountNumber, reference, transactionDateTime, currency, paymentLinkId, code: dataCode, desc: dataDesc, counterAccountBankId, counterAccountBankName, counterAccountName, counterAccountNumber, virtualAccountName, virtualAccountNumber } = data;

    // Build checksum data from webhook data fields sorted alphabetically
    const checksumFields: Record<string, string> = {};
    if (accountNumber !== undefined) checksumFields['accountNumber'] = String(accountNumber);
    if (amount !== undefined) checksumFields['amount'] = String(amount);
    if (counterAccountBankId !== undefined) checksumFields['counterAccountBankId'] = String(counterAccountBankId || '');
    if (counterAccountBankName !== undefined) checksumFields['counterAccountBankName'] = String(counterAccountBankName || '');
    if (counterAccountName !== undefined) checksumFields['counterAccountName'] = String(counterAccountName || '');
    if (counterAccountNumber !== undefined) checksumFields['counterAccountNumber'] = String(counterAccountNumber || '');
    if (currency !== undefined) checksumFields['currency'] = String(currency);
    if (dataCode !== undefined) checksumFields['code'] = String(dataCode);
    if (dataDesc !== undefined) checksumFields['desc'] = String(dataDesc);
    if (description !== undefined) checksumFields['description'] = String(description);
    if (orderCode !== undefined) checksumFields['orderCode'] = String(orderCode);
    if (paymentLinkId !== undefined) checksumFields['paymentLinkId'] = String(paymentLinkId);
    if (reference !== undefined) checksumFields['reference'] = String(reference);
    if (transactionDateTime !== undefined) checksumFields['transactionDateTime'] = String(transactionDateTime);
    if (virtualAccountName !== undefined) checksumFields['virtualAccountName'] = String(virtualAccountName || '');
    if (virtualAccountNumber !== undefined) checksumFields['virtualAccountNumber'] = String(virtualAccountNumber || '');

    const sortedKeys = Object.keys(checksumFields).sort();
    const checksumData = sortedKeys.map(k => `${k}=${checksumFields[k]}`).join('&');
    const computedSignature = await hmacSHA256(payosChecksumKey, checksumData);

    if (computedSignature !== signature) {
      console.error('Invalid payOS webhook signature');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Find order by orderCode in metadata
    const { data: orders } = await supabase
      .from('payment_orders')
      .select('*')
      .eq('payment_provider', 'payos')
      .eq('status', 'pending');

    // Find the matching order by payos_order_code in metadata
    const order = (orders || []).find((o: any) => {
      const meta = o.metadata as Record<string, unknown> | null;
      return meta?.payos_order_code === orderCode;
    });

    if (!order) {
      console.error('Order not found for orderCode:', orderCode);
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check idempotency
    if (order.status === 'success') {
      return new Response(JSON.stringify({ success: true, message: 'Already processed' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const isSuccess = code === '00' && dataCode === '00';

    if (isSuccess) {
      const now = new Date();

      // Handle voucher usage if present
      const orderMetadata = (order.metadata as Record<string, unknown>) || {};
      if (orderMetadata.voucher_id) {
        try {
          const voucherId = orderMetadata.voucher_id as string;
          const { data: voucherRow } = await supabase
            .from('vouchers')
            .select('used_count')
            .eq('id', voucherId)
            .single();

          await supabase
            .from('vouchers')
            .update({ used_count: (voucherRow?.used_count || 0) + 1 })
            .eq('id', voucherId);

          await supabase
            .from('voucher_usages')
            .insert({
              voucher_id: voucherId,
              organization_id: order.organization_id,
              user_id: order.user_id,
              payment_order_id: order.id,
              discount_amount: orderMetadata.discount_amount as number || 0,
            });
          console.log(`Voucher ${orderMetadata.voucher_code} usage recorded`);
        } catch (voucherErr) {
          console.error('Failed to record voucher usage:', voucherErr);
        }
      }

      // Get current subscription
      const { data: currentSub } = await supabase
        .from('subscriptions')
        .select('plan_type, current_period_start, current_period_end, metadata')
        .eq('organization_id', order.organization_id)
        .eq('status', 'active')
        .maybeSingle();

      const currentRank = currentSub ? PLAN_ORDER.indexOf(currentSub.plan_type) : -1;
      const newRank = PLAN_ORDER.indexOf(order.plan_type);
      const isUpgrade = currentSub && newRank > currentRank && new Date(currentSub.current_period_end) > now;

      // Update order
      await supabase
        .from('payment_orders')
        .update({
          status: 'success',
          vnpay_response: data, // reuse column for payOS response
          updated_at: now.toISOString(),
        })
        .eq('id', order.id);

      if (isUpgrade) {
        const existingMetadata = (currentSub.metadata as Record<string, unknown>) || {};
        await supabase
          .from('subscriptions')
          .update({
            plan_type: order.plan_type,
            previous_plan_type: currentSub.plan_type,
            payment_provider: 'payos',
            payment_reference: String(reference || orderCode),
            metadata: {
              ...existingMetadata,
              last_payos_order_code: orderCode,
              amount,
              billing_cycle: order.billing_cycle,
              upgraded_at: now.toISOString(),
              upgrade_from: currentSub.plan_type,
            },
            updated_at: now.toISOString(),
          })
          .eq('organization_id', order.organization_id);

        console.log(`Subscription upgraded (mid-cycle) via payOS: org=${order.organization_id}, ${currentSub.plan_type} → ${order.plan_type}`);
      } else {
        const periodEnd = new Date(now);
        if (order.billing_cycle === 'yearly') {
          periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        } else {
          periodEnd.setMonth(periodEnd.getMonth() + 1);
        }

        await supabase
          .from('subscriptions')
          .update({
            plan_type: order.plan_type,
            previous_plan_type: currentSub?.plan_type || null,
            status: 'active',
            payment_provider: 'payos',
            payment_reference: String(reference || orderCode),
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString(),
            metadata: { last_payos_order_code: orderCode, amount, billing_cycle: order.billing_cycle },
            updated_at: now.toISOString(),
          })
          .eq('organization_id', order.organization_id);

        console.log(`Subscription updated (new/renewal) via payOS: org=${order.organization_id}, plan=${order.plan_type}`);
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else {
      // Payment failed
      await supabase
        .from('payment_orders')
        .update({
          status: 'failed',
          vnpay_response: data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      console.log(`payOS payment failed: orderCode=${orderCode}, code=${code}`);

      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  } catch (err) {
    console.error('payOS webhook error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}));
