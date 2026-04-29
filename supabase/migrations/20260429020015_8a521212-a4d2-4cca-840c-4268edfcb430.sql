-- 1) Mở rộng plan_limits với 3 cột đơn vị mới (additive)
ALTER TABLE public.plan_limits
  ADD COLUMN IF NOT EXISTS monthly_content_units integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_image_units   integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_video_units   integer NOT NULL DEFAULT 0;

-- 2) Bảng cấu hình chi phí/đơn vị
CREATE TABLE IF NOT EXISTS public.plan_unit_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_type text NOT NULL UNIQUE CHECK (unit_type IN ('content','image','video')),
  cost_usd numeric(10,4) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plan_unit_costs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view plan_unit_costs" ON public.plan_unit_costs;
CREATE POLICY "Anyone can view plan_unit_costs"
  ON public.plan_unit_costs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can insert plan_unit_costs" ON public.plan_unit_costs;
CREATE POLICY "Admins can insert plan_unit_costs"
  ON public.plan_unit_costs FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update plan_unit_costs" ON public.plan_unit_costs;
CREATE POLICY "Admins can update plan_unit_costs"
  ON public.plan_unit_costs FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete plan_unit_costs" ON public.plan_unit_costs;
CREATE POLICY "Admins can delete plan_unit_costs"
  ON public.plan_unit_costs FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS update_plan_unit_costs_updated_at ON public.plan_unit_costs;
CREATE TRIGGER update_plan_unit_costs_updated_at
  BEFORE UPDATE ON public.plan_unit_costs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.plan_unit_costs (unit_type, cost_usd, notes) VALUES
  ('content', 0.0150, 'Mỗi nội dung text (script/caption/multichannel post)'),
  ('image',   0.0400, 'Mỗi ảnh AI generated'),
  ('video',   0.5000, 'Mỗi video render (script -> video)')
ON CONFLICT (unit_type) DO NOTHING;

-- 3) Update 4 tier với quota 3 đơn vị mới + giá rebalance
UPDATE public.plan_limits SET
  monthly_content_units = 5,  monthly_image_units = 5,   monthly_video_units = 0,
  monthly_brands = 1
  WHERE plan_type = 'free';

UPDATE public.plan_limits SET
  monthly_content_units = 50, monthly_image_units = 50,  monthly_video_units = 0,
  monthly_brands = 3, price_monthly = 199000, price_yearly = 1990000
  WHERE plan_type = 'starter';

UPDATE public.plan_limits SET
  monthly_content_units = 200, monthly_image_units = 200, monthly_video_units = 10,
  monthly_brands = 10, price_monthly = 549000, price_yearly = 5490000
  WHERE plan_type = 'pro';

UPDATE public.plan_limits SET
  monthly_content_units = 600, monthly_image_units = 600, monthly_video_units = 40,
  monthly_brands = 30, price_monthly = 1499000, price_yearly = 14990000
  WHERE plan_type = 'enterprise';

-- 4) Helper: usage theo đơn vị mới
CREATE OR REPLACE FUNCTION public.get_org_usage_units(_org_id uuid, _unit_type text)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE _unit_type
    WHEN 'content' THEN (
      SELECT COUNT(*)::int FROM public.usage_logs ul
      JOIN public.subscriptions s ON s.organization_id = ul.organization_id
      WHERE ul.organization_id = _org_id
        AND ul.usage_type::text IN ('script','carousel','multichannel','video_generation')
        AND ul.created_at >= s.current_period_start
        AND ul.created_at <= s.current_period_end
    )
    WHEN 'image' THEN (
      SELECT COUNT(*)::int FROM public.usage_logs ul
      JOIN public.subscriptions s ON s.organization_id = ul.organization_id
      WHERE ul.organization_id = _org_id
        AND ul.usage_type::text = 'image_generation'
        AND ul.created_at >= s.current_period_start
        AND ul.created_at <= s.current_period_end
    )
    WHEN 'video' THEN (
      SELECT COUNT(*)::int FROM public.usage_logs ul
      JOIN public.subscriptions s ON s.organization_id = ul.organization_id
      WHERE ul.organization_id = _org_id
        AND ul.usage_type::text = 'video_generation'
        AND ul.created_at >= s.current_period_start
        AND ul.created_at <= s.current_period_end
    )
    ELSE 0
  END
$$;

-- 5) Check feature theo unit type
CREATE OR REPLACE FUNCTION public.can_use_unit(_org_id uuid, _unit_type text, _amount integer DEFAULT 1)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _plan plan_type;
  _limit integer;
  _used integer;
BEGIN
  SELECT plan_type INTO _plan FROM public.subscriptions
    WHERE organization_id = _org_id AND status = 'active' LIMIT 1;
  IF _plan IS NULL THEN RETURN false; END IF;

  SELECT CASE _unit_type
    WHEN 'content' THEN monthly_content_units
    WHEN 'image'   THEN monthly_image_units
    WHEN 'video'   THEN monthly_video_units
  END INTO _limit FROM public.plan_limits WHERE plan_type = _plan;

  IF _limit IS NULL THEN RETURN false; END IF;
  IF _limit = -1 THEN RETURN true; END IF;

  _used := public.get_org_usage_units(_org_id, _unit_type);
  RETURN (_used + _amount) <= _limit;
END;
$$;

-- 6) Batch helper trả jsonb cho frontend
CREATE OR REPLACE FUNCTION public.get_org_usage_units_batch(_org_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'content', public.get_org_usage_units(_org_id, 'content'),
    'image',   public.get_org_usage_units(_org_id, 'image'),
    'video',   public.get_org_usage_units(_org_id, 'video')
  )
$$;