-- Telegram pipeline lifecycle notifications dedup table
CREATE TABLE IF NOT EXISTS public.telegram_notifications (
  goal_id UUID NOT NULL,
  event TEXT NOT NULL,
  chat_id BIGINT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  payload JSONB,
  PRIMARY KEY (goal_id, event)
);

ALTER TABLE public.telegram_notifications ENABLE ROW LEVEL SECURITY;

-- Service-role only (edge functions). No client policies.
CREATE POLICY "service_role_full_access_telegram_notifications"
  ON public.telegram_notifications
  FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_telegram_notifications_chat
  ON public.telegram_notifications (chat_id, sent_at DESC);