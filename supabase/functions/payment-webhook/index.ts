import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
}

interface PaymentWebhookPayload {
  event: 'payment.success' | 'payment.failed' | 'subscription.cancelled' | 'subscription.renewed'
  user_id: string
  plan_type: 'free' | 'starter' | 'pro' | 'enterprise'
  payment_provider: string // vnpay, momo, bank_transfer, etc.
  payment_reference: string
  amount?: number
  metadata?: Record<string, unknown>
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const webhookSecret = Deno.env.get('PAYMENT_WEBHOOK_SECRET')
    
    // Verify webhook secret if configured
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

    const { event, user_id, plan_type, payment_provider, payment_reference, metadata } = payload

    if (!user_id || !event) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: user_id and event' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let result

    switch (event) {
      case 'payment.success':
        // Upgrade/create subscription
        const periodEnd = new Date()
        periodEnd.setDate(periodEnd.getDate() + 30) // 30 days subscription

        result = await supabase
          .from('subscriptions')
          .upsert({
            user_id,
            plan_type,
            status: 'active',
            payment_provider,
            payment_reference,
            current_period_start: new Date().toISOString(),
            current_period_end: periodEnd.toISOString(),
            metadata: metadata || {},
          }, { onConflict: 'user_id' })

        if (result.error) {
          console.error('Error updating subscription:', result.error)
          throw result.error
        }

        console.log(`Subscription upgraded for user ${user_id} to ${plan_type}`)
        break

      case 'payment.failed':
        // Mark subscription as pending/expired
        result = await supabase
          .from('subscriptions')
          .update({
            status: 'pending',
            metadata: { ...metadata, last_failed_payment: new Date().toISOString() },
          })
          .eq('user_id', user_id)

        if (result.error) {
          console.error('Error updating subscription:', result.error)
          throw result.error
        }

        console.log(`Payment failed for user ${user_id}`)
        break

      case 'subscription.cancelled':
        result = await supabase
          .from('subscriptions')
          .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
          })
          .eq('user_id', user_id)

        if (result.error) {
          console.error('Error cancelling subscription:', result.error)
          throw result.error
        }

        console.log(`Subscription cancelled for user ${user_id}`)
        break

      case 'subscription.renewed':
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
          .eq('user_id', user_id)

        if (result.error) {
          console.error('Error renewing subscription:', result.error)
          throw result.error
        }

        console.log(`Subscription renewed for user ${user_id}`)
        break

      default:
        return new Response(
          JSON.stringify({ error: `Unknown event: ${event}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    return new Response(
      JSON.stringify({ success: true, event, user_id }),
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
})
