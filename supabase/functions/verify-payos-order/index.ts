import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { withPerf } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(withPerf({ functionName: 'verify-payos-order' }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const payosClientId = Deno.env.get('PAYOS_CLIENT_ID');
    const payosApiKey = Deno.env.get('PAYOS_API_KEY');

    if (!payosClientId || !payosApiKey) {
      return new Response(JSON.stringify({ error: 'PayOS not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Auth
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

    const { orderCode } = await req.json();
    if (!orderCode) {
      return new Response(JSON.stringify({ error: 'Missing orderCode' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Check if order belongs to user's org
    const { data: order } = await supabase
      .from('payment_orders')
      .select('*')
      .eq('payment_provider', 'payos')
      .eq('user_id', userId)
      .filter('metadata->>payos_order_code', 'eq', String(orderCode))
      .maybeSingle();

    if (!order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Already processed
    if (order.status === 'success') {
      return new Response(JSON.stringify({ status: 'success', already_processed: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Query PayOS API for order status
    const payosRes = await fetch(`https://api-merchant.payos.vn/v2/payment-requests/${orderCode}`, {
      headers: {
        'x-client-id': payosClientId,
        'x-api-key': payosApiKey,
      },
    });
    const payosData = await payosRes.json();
    console.log('PayOS order status:', JSON.stringify(payosData));

    if (payosData.code !== '00' || !payosData.data) {
      return new Response(JSON.stringify({ status: 'pending', payos_status: payosData.data?.status || 'unknown' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const payosStatus = payosData.data.status;

    if (payosStatus === 'PAID') {
      // Update payment_orders
      await supabase
        .from('payment_orders')
        .update({ status: 'success', updated_at: new Date().toISOString() })
        .eq('id', order.id);

      // Update subscription
      const periodEnd = new Date();
      periodEnd.setDate(periodEnd.getDate() + 30);

      await supabase
        .from('subscriptions')
        .update({
          plan_type: order.plan_type,
          status: 'active',
          payment_provider: 'payos',
          payment_reference: String(orderCode),
          current_period_start: new Date().toISOString(),
          current_period_end: periodEnd.toISOString(),
        })
        .eq('organization_id', order.organization_id);

      // Increment voucher usage if applicable
      const voucherId = (order.metadata as Record<string, unknown>)?.voucher_id;
      if (voucherId) {
        const { data: voucher } = await supabase
          .from('vouchers')
          .select('used_count')
          .eq('id', voucherId)
          .maybeSingle();
        if (voucher) {
          await supabase
            .from('vouchers')
            .update({ used_count: voucher.used_count + 1 })
            .eq('id', voucherId);
        }
      }

      console.log(`Order ${orderCode} verified as PAID, subscription updated to ${order.plan_type}`);
      return new Response(JSON.stringify({ status: 'success', plan_type: order.plan_type }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (payosStatus === 'CANCELLED' || payosStatus === 'EXPIRED') {
      await supabase
        .from('payment_orders')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('id', order.id);

      return new Response(JSON.stringify({ status: 'failed', payos_status: payosStatus }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ status: 'pending', payos_status: payosStatus }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('verify-payos-order error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}));
