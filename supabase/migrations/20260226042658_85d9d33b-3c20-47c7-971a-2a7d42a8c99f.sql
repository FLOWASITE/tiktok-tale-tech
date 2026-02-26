
-- Fix: Recreate safe view as SECURITY INVOKER (default, not DEFINER)
DROP VIEW IF EXISTS public.v_social_platform_settings_safe;
CREATE VIEW public.v_social_platform_settings_safe
WITH (security_invoker = true)
AS
SELECT 
  id,
  platform,
  app_name,
  is_active,
  created_by,
  created_at,
  updated_at,
  (consumer_key IS NOT NULL AND consumer_secret IS NOT NULL) AS has_credentials
FROM public.social_platform_settings;
