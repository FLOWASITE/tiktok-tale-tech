-- Fix pending payment orders that were already paid via PayOS
UPDATE public.payment_orders
SET status = 'success', updated_at = now()
WHERE payment_provider = 'payos'
  AND status = 'pending'
  AND (metadata->>'payos_order_code')::text IN ('177623065749', '177622981687');

-- Update subscription to enterprise for the organization that owns these orders
UPDATE public.subscriptions
SET plan_type = 'enterprise',
    status = 'active',
    payment_provider = 'payos',
    current_period_start = now(),
    current_period_end = now() + interval '30 days',
    updated_at = now()
WHERE organization_id IN (
  SELECT DISTINCT organization_id 
  FROM public.payment_orders 
  WHERE payment_provider = 'payos'
    AND (metadata->>'payos_order_code')::text IN ('177623065749', '177622981687')
);