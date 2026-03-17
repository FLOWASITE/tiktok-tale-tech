
-- Update expired free plan subscriptions to current month period
UPDATE public.subscriptions
SET 
  current_period_start = date_trunc('month', now()),
  current_period_end = (date_trunc('month', now()) + interval '1 month' - interval '1 second'),
  updated_at = now()
WHERE plan_type = 'free'
  AND status = 'active'
  AND current_period_end < now();
