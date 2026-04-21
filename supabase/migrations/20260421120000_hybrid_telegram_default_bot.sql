-- =====================================================
-- Hybrid Telegram bot: allow one Flowa-operated default bot
-- alongside per-org BYOB bots. Single sentinel row with
-- organization_id = NULL + is_default = true holds the
-- default bot credentials.
-- =====================================================

-- 1. Relax organization_id to nullable (sentinel row has no org)
ALTER TABLE public.telegram_bot_configs
  ALTER COLUMN organization_id DROP NOT NULL;

-- Drop the implicit column-level UNIQUE so NULL orgs don't collide
ALTER TABLE public.telegram_bot_configs
  DROP CONSTRAINT IF EXISTS telegram_bot_configs_organization_id_key;

-- Per-org uniqueness still enforced when org is set (BYOB path)
CREATE UNIQUE INDEX IF NOT EXISTS uq_telegram_bot_configs_org
  ON public.telegram_bot_configs(organization_id)
  WHERE organization_id IS NOT NULL;

-- 2. is_default flag + exactly one default bot
ALTER TABLE public.telegram_bot_configs
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS uq_telegram_bot_configs_single_default
  ON public.telegram_bot_configs(is_default)
  WHERE is_default = true;

-- 3. Global uniqueness: one private chat can only bind to one active org
-- (prevents cross-org leak when many orgs share the default bot)
CREATE UNIQUE INDEX IF NOT EXISTS uq_telegram_chat_bindings_private_chat
  ON public.telegram_chat_bindings(telegram_chat_id)
  WHERE chat_type = 'private' AND is_active = true;

-- 4. Public view exposing default bot meta (username only, no secrets)
-- Frontend reads from this to decide whether default path is available.
CREATE OR REPLACE VIEW public.telegram_default_bot_public AS
  SELECT bot_username, is_active
  FROM public.telegram_bot_configs
  WHERE organization_id IS NULL
    AND is_default = true
    AND is_active = true;

GRANT SELECT ON public.telegram_default_bot_public TO authenticated, anon;

-- 5. RLS policy for direct sentinel-row reads (fallback path if view cached)
DROP POLICY IF EXISTS "Authed can view default bot meta" ON public.telegram_bot_configs;
CREATE POLICY "Authed can view default bot meta"
  ON public.telegram_bot_configs FOR SELECT
  TO authenticated
  USING (organization_id IS NULL AND is_default = true AND is_active = true);

-- 6. Realtime: let frontend detect /start bind completion
-- REPLICA IDENTITY FULL is required for filter-by-column on the client side.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'telegram_chat_bindings'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.telegram_chat_bindings';
  END IF;
END $$;

ALTER TABLE public.telegram_chat_bindings REPLICA IDENTITY FULL;
