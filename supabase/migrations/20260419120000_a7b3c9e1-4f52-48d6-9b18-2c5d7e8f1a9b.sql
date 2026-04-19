-- Telegram integration: per-org bot config + per-chat bindings
-- Supports: /start deeplink linking, /generate pipeline trigger, group broadcast

-- =====================================================
-- telegram_bot_configs: 1 row per organization
-- Admin-only (org admin manages bot credentials)
-- =====================================================
CREATE TABLE public.telegram_bot_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  bot_username TEXT NOT NULL,
  bot_token_encrypted TEXT NOT NULL,
  webhook_secret TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  group_chat_id BIGINT DEFAULT NULL,
  default_autonomy_level TEXT NOT NULL DEFAULT 'human_in_loop'
    CHECK (default_autonomy_level IN ('human_in_loop', 'human_on_loop', 'full_auto')),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_telegram_bot_configs_webhook_secret
  ON public.telegram_bot_configs(webhook_secret);

ALTER TABLE public.telegram_bot_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view telegram bot configs"
  ON public.telegram_bot_configs FOR SELECT
  TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Admins can insert telegram bot configs"
  ON public.telegram_bot_configs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Admins can update telegram bot configs"
  ON public.telegram_bot_configs FOR UPDATE
  TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Admins can delete telegram bot configs"
  ON public.telegram_bot_configs FOR DELETE
  TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE TRIGGER update_telegram_bot_configs_updated_at
  BEFORE UPDATE ON public.telegram_bot_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- telegram_chat_bindings: 1 row per Telegram chat
-- user_id NULL => group binding (org-wide broadcast/commands)
-- =====================================================
CREATE TABLE public.telegram_chat_bindings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  telegram_chat_id BIGINT NOT NULL,
  chat_type TEXT NOT NULL CHECK (chat_type IN ('private', 'group', 'supergroup')),
  telegram_user_id BIGINT DEFAULT NULL,
  telegram_username TEXT DEFAULT NULL,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_command_at TIMESTAMPTZ DEFAULT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(organization_id, telegram_chat_id)
);

CREATE INDEX idx_telegram_chat_bindings_chat_id
  ON public.telegram_chat_bindings(telegram_chat_id);

CREATE INDEX idx_telegram_chat_bindings_user
  ON public.telegram_chat_bindings(organization_id, user_id)
  WHERE user_id IS NOT NULL;

ALTER TABLE public.telegram_chat_bindings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own telegram bindings"
  ON public.telegram_chat_bindings FOR SELECT
  TO authenticated
  USING (
    public.is_org_member(auth.uid(), organization_id)
    AND (user_id = auth.uid() OR user_id IS NULL)
  );

CREATE POLICY "Users can delete own telegram bindings"
  ON public.telegram_chat_bindings FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (user_id IS NULL AND public.is_org_admin(auth.uid(), organization_id))
  );

-- INSERT/UPDATE go through service-role from telegram-webhook (no client policy)
