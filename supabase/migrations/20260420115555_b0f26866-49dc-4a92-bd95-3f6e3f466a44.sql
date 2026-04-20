-- P2: Track last quota threshold alert per Telegram binding (per month).
-- Stores both timestamp and which threshold (80 or 100) was last alerted to avoid spam.
ALTER TABLE public.telegram_chat_bindings
  ADD COLUMN IF NOT EXISTS last_quota_alert_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_quota_alert_threshold smallint;

COMMENT ON COLUMN public.telegram_chat_bindings.last_quota_alert_at IS
  'Last time we pushed a quota threshold alert (80% or 100%) to this Telegram chat. Used to throttle to 1/month per threshold.';
COMMENT ON COLUMN public.telegram_chat_bindings.last_quota_alert_threshold IS
  'Last threshold (80 or 100) we alerted on. Reset implicitly when last_quota_alert_at < current_period_start.';