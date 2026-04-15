
-- Create addon_purchases table
CREATE TABLE public.addon_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_type plan_type NOT NULL,
  billing_cycle TEXT NOT NULL DEFAULT 'monthly',
  amount INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  payment_order_id UUID REFERENCES public.payment_orders(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_addon_purchases_org_id ON public.addon_purchases(organization_id);
CREATE INDEX idx_addon_purchases_status ON public.addon_purchases(status);
CREATE INDEX idx_addon_purchases_expires ON public.addon_purchases(expires_at);

-- Enable RLS
ALTER TABLE public.addon_purchases ENABLE ROW LEVEL SECURITY;

-- Org members can read their org's addon purchases
CREATE POLICY "Org members can view addon purchases"
  ON public.addon_purchases
  FOR SELECT
  TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

-- Trigger for updated_at
CREATE TRIGGER update_addon_purchases_updated_at
  BEFORE UPDATE ON public.addon_purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update can_use_feature to include addon purchases
CREATE OR REPLACE FUNCTION public.can_use_feature(_org_id uuid, _usage_type usage_type)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _plan_type plan_type;
  _base_limit integer;
  _addon_limit integer;
  _total_limit integer;
  _current_usage integer;
  _period_start timestamptz;
  _period_end timestamptz;
BEGIN
  IF _usage_type = 'ai_edit' THEN RETURN true; END IF;

  SELECT plan_type, current_period_start, current_period_end 
  INTO _plan_type, _period_start, _period_end
  FROM public.subscriptions
  WHERE organization_id = _org_id AND status = 'active';
  
  IF _plan_type IS NULL THEN RETURN false; END IF;
  
  SELECT 
    CASE _usage_type
      WHEN 'script' THEN monthly_scripts
      WHEN 'carousel' THEN monthly_carousels
      WHEN 'multichannel' THEN monthly_multichannel
      WHEN 'image_generation' THEN monthly_images
    END INTO _base_limit
  FROM public.plan_limits WHERE plan_type = _plan_type;
  
  IF _base_limit = -1 THEN RETURN true; END IF;
  
  -- Calculate addon limits
  SELECT COALESCE(SUM(
    CASE _usage_type
      WHEN 'script' THEN pl.monthly_scripts
      WHEN 'carousel' THEN pl.monthly_carousels
      WHEN 'multichannel' THEN pl.monthly_multichannel
      WHEN 'image_generation' THEN pl.monthly_images
    END
  ), 0) INTO _addon_limit
  FROM public.addon_purchases ap
  JOIN public.plan_limits pl ON pl.plan_type = ap.plan_type
  WHERE ap.organization_id = _org_id
    AND ap.status = 'active'
    AND ap.expires_at > now();

  _total_limit := _base_limit + _addon_limit;
  
  _current_usage := public.get_org_usage(_org_id, _usage_type);
  RETURN _current_usage < _total_limit;
END;
$function$;
