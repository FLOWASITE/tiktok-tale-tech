ALTER TABLE public.telegram_chat_bindings
  ADD COLUMN IF NOT EXISTS last_group_fallback_at timestamptz,
  ADD COLUMN IF NOT EXISTS group_fallback_count integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.telegram_chat_bindings.last_group_fallback_at IS
  'Last time we sent a "no admin DM bound" approval reminder to this group binding. Used to rate-limit group fallback notifications.';
COMMENT ON COLUMN public.telegram_chat_bindings.group_fallback_count IS
  'Total approval reminders sent to this group binding via fallback path (lifetime count, for observability).';