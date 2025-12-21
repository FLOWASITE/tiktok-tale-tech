-- Create subscription_status enum
CREATE TYPE public.subscription_status AS ENUM ('active', 'cancelled', 'expired', 'pending', 'trial');

-- Create plan_type enum
CREATE TYPE public.plan_type AS ENUM ('free', 'starter', 'pro', 'enterprise');

-- Create usage_type enum
CREATE TYPE public.usage_type AS ENUM ('script', 'carousel', 'multichannel', 'image_generation', 'ai_edit');

-- Plan limits table (defines limits for each plan)
CREATE TABLE public.plan_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_type plan_type NOT NULL UNIQUE,
  monthly_scripts integer NOT NULL DEFAULT 10,
  monthly_carousels integer NOT NULL DEFAULT 10,
  monthly_multichannel integer NOT NULL DEFAULT 10,
  monthly_images integer NOT NULL DEFAULT 50,
  monthly_ai_edits integer NOT NULL DEFAULT 20,
  price_monthly numeric(10,2) NOT NULL DEFAULT 0,
  price_yearly numeric(10,2) NOT NULL DEFAULT 0,
  features jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Insert default plan limits
INSERT INTO public.plan_limits (plan_type, monthly_scripts, monthly_carousels, monthly_multichannel, monthly_images, monthly_ai_edits, price_monthly, price_yearly, features) VALUES
  ('free', 5, 5, 5, 20, 10, 0, 0, '["Basic support", "Limited features"]'),
  ('starter', 20, 20, 20, 100, 50, 99000, 990000, '["Email support", "All basic features", "Priority queue"]'),
  ('pro', 100, 100, 100, 500, 200, 299000, 2990000, '["Priority support", "All features", "API access", "Custom branding"]'),
  ('enterprise', -1, -1, -1, -1, -1, 999000, 9990000, '["24/7 support", "Unlimited usage", "Dedicated account manager", "Custom integrations"]');

-- Subscriptions table
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_type plan_type NOT NULL DEFAULT 'free',
  status subscription_status NOT NULL DEFAULT 'active',
  payment_provider text, -- vnpay, momo, bank_transfer, etc.
  payment_reference text, -- external payment ID
  current_period_start timestamp with time zone NOT NULL DEFAULT now(),
  current_period_end timestamp with time zone NOT NULL DEFAULT (now() + interval '30 days'),
  trial_end timestamp with time zone,
  cancelled_at timestamp with time zone,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- Usage logs table
CREATE TABLE public.usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  usage_type usage_type NOT NULL,
  reference_id uuid, -- ID of the created content
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.plan_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

-- Plan limits: Everyone can read
CREATE POLICY "Anyone can view plan_limits"
ON public.plan_limits FOR SELECT
USING (true);

-- Subscriptions: Users can view own
CREATE POLICY "Users can view own subscription"
ON public.subscriptions FOR SELECT
USING (auth.uid() = user_id);

-- Usage logs: Users can view own
CREATE POLICY "Users can view own usage_logs"
ON public.usage_logs FOR SELECT
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_plan_limits_updated_at
  BEFORE UPDATE ON public.plan_limits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to auto-create free subscription for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  INSERT INTO public.subscriptions (user_id, plan_type, status)
  VALUES (NEW.id, 'free', 'active');
  
  RETURN NEW;
END;
$$;

-- Create function to get user usage count for current period
CREATE OR REPLACE FUNCTION public.get_user_usage(
  _user_id uuid,
  _usage_type usage_type
)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM public.usage_logs ul
  JOIN public.subscriptions s ON s.user_id = ul.user_id
  WHERE ul.user_id = _user_id
    AND ul.usage_type = _usage_type
    AND ul.created_at >= s.current_period_start
    AND ul.created_at <= s.current_period_end
$$;

-- Create function to check if user can use feature
CREATE OR REPLACE FUNCTION public.can_use_feature(
  _user_id uuid,
  _usage_type usage_type
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _plan_type plan_type;
  _limit integer;
  _current_usage integer;
BEGIN
  -- Get user's plan
  SELECT plan_type INTO _plan_type
  FROM public.subscriptions
  WHERE user_id = _user_id AND status = 'active';
  
  IF _plan_type IS NULL THEN
    RETURN false;
  END IF;
  
  -- Get limit for this plan/usage type
  SELECT 
    CASE _usage_type
      WHEN 'script' THEN monthly_scripts
      WHEN 'carousel' THEN monthly_carousels
      WHEN 'multichannel' THEN monthly_multichannel
      WHEN 'image_generation' THEN monthly_images
      WHEN 'ai_edit' THEN monthly_ai_edits
    END INTO _limit
  FROM public.plan_limits
  WHERE plan_type = _plan_type;
  
  -- -1 means unlimited
  IF _limit = -1 THEN
    RETURN true;
  END IF;
  
  -- Get current usage
  _current_usage := public.get_user_usage(_user_id, _usage_type);
  
  RETURN _current_usage < _limit;
END;
$$;

-- Create index for faster usage queries
CREATE INDEX idx_usage_logs_user_type ON public.usage_logs (user_id, usage_type, created_at);