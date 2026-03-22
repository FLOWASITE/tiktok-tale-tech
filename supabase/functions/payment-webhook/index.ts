import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
}

interface PaymentWebhookPayload {
  event: 'payment.success' | 'payment.failed' | 'subscription.cancelled' | 'subscription.renewed'
  organization_id: string
  plan_type: 'free' | 'starter' | 'pro' | 'enterprise'
  payment_provider: string
  payment_reference: string
  amount?: number
  metadata?: Record<string, unknown>
}

Deno.serve(withPerf({ functionName: 'payment-webhook' }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const webhookSecret = Deno.env.get('PAYMENT_WEBHOOK_SECRET')
    
    const requestSecret = req.headers.get('x-webhook-secret')
    if (webhookSecret && requestSecret !== webhookSecret) {
      console.error('Invalid webhook secret')
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const payload: PaymentWebhookPayload = await req.json()

    console.log('Received payment webhook:', payload)

    const { event, organization_id, plan_type, payment_provider, payment_reference, metadata } = payload

    if (!organization_id || !event) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: organization_id and event' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let result

    switch (event) {
      case 'payment.success': {
        const periodEnd = new Date()
        periodEnd.setDate(periodEnd.getDate() + 30)

        result = await supabase
          .from('subscriptions')
          .update({
            plan_type,
            status: 'active',
            payment_provider,
            payment_reference,
            current_period_start: new Date().toISOString(),
            current_period_end: periodEnd.toISOString(),
            metadata: metadata || {},
          })
          .eq('organization_id', organization_id)

        if (result.error) {
          console.error('Error updating subscription:', result.error)
          throw result.error
        }

        console.log(`Subscription upgraded for org ${organization_id} to ${plan_type}`)
        break
      }

      case 'payment.failed':
        result = await supabase
          .from('subscriptions')
          .update({
            status: 'pending',
            metadata: { ...metadata, last_failed_payment: new Date().toISOString() },
          })
          .eq('organization_id', organization_id)

        if (result.error) {
          console.error('Error updating subscription:', result.error)
          throw result.error
        }

        console.log(`Payment failed for org ${organization_id}`)
        break

      case 'subscription.cancelled':
        result = await supabase
          .from('subscriptions')
          .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
          })
          .eq('organization_id', organization_id)

        if (result.error) {
          console.error('Error cancelling subscription:', result.error)
          throw result.error
        }

        console.log(`Subscription cancelled for org ${organization_id}`)
        break

      case 'subscription.renewed': {
        const newPeriodEnd = new Date()
        newPeriodEnd.setDate(newPeriodEnd.getDate() + 30)

        result = await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            payment_reference,
            current_period_start: new Date().toISOString(),
            current_period_end: newPeriodEnd.toISOString(),
          })
          .eq('organization_id', organization_id)

        if (result.error) {
          console.error('Error renewing subscription:', result.error)
          throw result.error
        }

        console.log(`Subscription renewed for org ${organization_id}`)
        break
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown event: ${event}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    return new Response(
      JSON.stringify({ success: true, event, organization_id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Payment webhook error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}))
