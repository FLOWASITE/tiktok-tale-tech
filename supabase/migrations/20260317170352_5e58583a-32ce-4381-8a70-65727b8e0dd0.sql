
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS previous_plan_type plan_type NULL;

COMMENT ON COLUMN public.subscriptions.previous_plan_type IS 'Tracks the previous plan before mid-cycle upgrade';
