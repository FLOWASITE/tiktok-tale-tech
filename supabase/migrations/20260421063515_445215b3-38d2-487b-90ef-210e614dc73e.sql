CREATE TABLE public.telegram_pending_links (
  telegram_chat_id BIGINT PRIMARY KEY,
  telegram_user_id BIGINT,
  telegram_username TEXT,
  token TEXT NOT NULL,
  payload_uid UUID NOT NULL,
  payload_org UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE public.telegram_pending_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role manage pending links"
  ON public.telegram_pending_links
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_telegram_pending_links_expires
  ON public.telegram_pending_links(expires_at);