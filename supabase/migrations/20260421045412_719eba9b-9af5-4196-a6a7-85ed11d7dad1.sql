-- Telegram default bot: add is_default flag, allow NULL organization_id for sentinel,
-- promote Flowa123bot as global default, expose public view for FE.

ALTER TABLE public.telegram_bot_configs
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;

ALTER TABLE public.telegram_bot_configs
  ALTER COLUMN organization_id DROP NOT NULL;

-- Only one global default allowed
CREATE UNIQUE INDEX IF NOT EXISTS telegram_bot_configs_one_default
  ON public.telegram_bot_configs ((true))
  WHERE organization_id IS NULL AND is_default = true;

-- Promote existing Flowa123bot as the global default by snapshotting its token
INSERT INTO public.telegram_bot_configs (
  organization_id, is_default, bot_username, bot_token_encrypted,
  webhook_secret, is_active, default_autonomy_level
)
SELECT
  NULL,
  true,
  bot_username,
  bot_token_encrypted,
  encode(gen_random_bytes(24), 'hex'),
  true,
  default_autonomy_level
FROM public.telegram_bot_configs
WHERE bot_username = 'Flowa123bot' AND organization_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.telegram_bot_configs
    WHERE organization_id IS NULL AND is_default = true
  );

-- Public view: FE can read default bot username without exposing tokens
CREATE OR REPLACE VIEW public.telegram_default_bot_public AS
SELECT bot_username, is_active
FROM public.telegram_bot_configs
WHERE organization_id IS NULL AND is_default = true AND is_active = true;

GRANT SELECT ON public.telegram_default_bot_public TO anon, authenticated;