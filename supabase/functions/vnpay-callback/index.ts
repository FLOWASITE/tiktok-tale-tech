import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const vnpHashSecret = Deno.env.get('VNPAY_HASH_SECRET')!;
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // VNPay sends params as GET query params (return URL) or POST (IPN)
    let params: URLSearchParams;
    if (req.method === 'GET') {
      params = new URL(req.url).searchParams;
    } else {
      const body = await req.text();
      params = new URLSearchParams(body);
    }

    // Extract secure hash
    const vnpSecureHash = params.get('vnp_SecureHash') || '';
    
    // Remove hash fields for verification
    const verifyParams = new URLSearchParams(params);
    verifyParams.delete('vnp_SecureHash');
    verifyParams.delete('vnp_SecureHashType');

    // Sort params
    const sorted: Record<string, string> = {};
    const keys = Array.from(verifyParams.keys()).sort();
    for (const key of keys) {
      sorted[key] = verifyParams.get(key)!;
    }
    const signData = new URLSearchParams(sorted).toString();
    const checkHash = await hmacSHA512(vnpHashSecret, signData);

    const txnRef = params.get('vnp_TxnRef') || '';
    const responseCode = params.get('vnp_ResponseCode') || '';
    const transactionNo = params.get('vnp_TransactionNo') || '';
    const amount = parseInt(params.get('vnp_Amount') || '0') / 100; // Convert back from smallest unit

    console.log(`VNPay callback: txnRef=${txnRef}, code=${responseCode}, amount=${amount}`);

    // Verify checksum
    if (checkHash !== vnpSecureHash) {
      console.error('Invalid VNPay checksum');
      
      // Update order as failed
      await supabase
        .from('payment_orders')
        .update({ status: 'failed', vnpay_response: { error: 'invalid_checksum', responseCode }, updated_at: new Date().toISOString() })
        .eq('vnpay_txn_ref', txnRef);

      return new Response(JSON.stringify({ RspCode: '97', Message: 'Invalid Checksum' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get the order
    const { data: order, error: orderError } = await supabase
      .from('payment_orders')
      .select('*')
      .eq('vnpay_txn_ref', txnRef)
      .maybeSingle();

    if (!order) {
      console.error('Order not found:', txnRef);
      return new Response(JSON.stringify({ RspCode: '01', Message: 'Order not found' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Idempotency: already processed
    if (order.status === 'success') {
      return new Response(JSON.stringify({ RspCode: '02', Message: 'Already processed' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Save VNPay response
    const vnpayResponse: Record<string, string> = {};
    for (const [k, v] of params.entries()) {
      vnpayResponse[k] = v;
    }

    if (responseCode === '00') {
      // Payment successful
      const now = new Date();
      const periodEnd = new Date(now);
      if (order.billing_cycle === 'yearly') {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      // Update order
      await supabase
        .from('payment_orders')
        .update({
          status: 'success',
          vnpay_response: vnpayResponse,
          updated_at: now.toISOString(),
        })
        .eq('id', order.id);

      // Update subscription
      const { error: subError } = await supabase
        .from('subscriptions')
        .update({
          plan_type: order.plan_type,
          status: 'active',
          payment_provider: 'vnpay',
          payment_reference: transactionNo,
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          metadata: { last_vnpay_txn: txnRef, amount, billing_cycle: order.billing_cycle },
          updated_at: now.toISOString(),
        })
        .eq('organization_id', order.organization_id);

      if (subError) {
        console.error('Failed to update subscription:', subError);
      } else {
        console.log(`Subscription upgraded: org=${order.organization_id}, plan=${order.plan_type}`);
      }

      return new Response(JSON.stringify({ RspCode: '00', Message: 'Success' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else {
      // Payment failed
      await supabase
        .from('payment_orders')
        .update({
          status: 'failed',
          vnpay_response: vnpayResponse,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      console.log(`Payment failed: txnRef=${txnRef}, code=${responseCode}`);

      return new Response(JSON.stringify({ RspCode: '00', Message: 'Confirmed' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  } catch (err) {
    console.error('VNPay callback error:', err);
    return new Response(JSON.stringify({ RspCode: '99', Message: 'Internal error' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
