-- Create telegram_bot_configs: per-organization Telegram bot configuration
CREATE TABLE IF NOT EXISTS public.telegram_bot_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  bot_username text NOT NULL,
  bot_token_encrypted text NOT NULL,
  webhook_secret text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  group_chat_id bigint,
  default_autonomy_level text NOT NULL DEFAULT 'human_in_loop' CHECK (default_autonomy_level IN ('human_in_loop','human_on_loop','full_auto')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_telegram_bot_configs_org ON public.telegram_bot_configs(organization_id);
CREATE INDEX IF NOT EXISTS idx_telegram_bot_configs_webhook_secret ON public.telegram_bot_configs(webhook_secret);

ALTER TABLE public.telegram_bot_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins can view bot config"
  ON public.telegram_bot_configs FOR SELECT
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete bot config"
  ON public.telegram_bot_configs FOR DELETE
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE TRIGGER update_telegram_bot_configs_updated_at
  BEFORE UPDATE ON public.telegram_bot_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create telegram_chat_bindings: links users/groups to Telegram chats
CREATE TABLE IF NOT EXISTS public.telegram_chat_bindings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  telegram_chat_id bigint NOT NULL,
  telegram_user_id bigint,
  chat_type text NOT NULL CHECK (chat_type IN ('private','group','supergroup')),
  telegram_username text,
  is_active boolean NOT NULL DEFAULT true,
  linked_at timestamptz NOT NULL DEFAULT now(),
  last_command_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, telegram_chat_id)
);

CREATE INDEX IF NOT EXISTS idx_telegram_chat_bindings_org ON public.telegram_chat_bindings(organization_id);
CREATE INDEX IF NOT EXISTS idx_telegram_chat_bindings_user ON public.telegram_chat_bindings(user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_chat_bindings_chat ON public.telegram_chat_bindings(telegram_chat_id);

ALTER TABLE public.telegram_chat_bindings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bindings or admins view all org"
  ON public.telegram_chat_bindings FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.is_org_admin(auth.uid(), organization_id)
  );

CREATE POLICY "Users can delete own bindings"
  ON public.telegram_chat_bindings FOR DELETE
  USING (
    auth.uid() = user_id
    OR public.is_org_admin(auth.uid(), organization_id)
  );

CREATE TRIGGER update_telegram_chat_bindings_updated_at
  BEFORE UPDATE ON public.telegram_chat_bindings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();