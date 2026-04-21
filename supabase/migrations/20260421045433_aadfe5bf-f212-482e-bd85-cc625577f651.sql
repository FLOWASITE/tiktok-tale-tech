CREATE OR REPLACE VIEW public.telegram_default_bot_public
WITH (security_invoker = on) AS
SELECT bot_username, is_active
FROM public.telegram_bot_configs
WHERE organization_id IS NULL AND is_default = true AND is_active = true;

GRANT SELECT ON public.telegram_default_bot_public TO anon, authenticated;