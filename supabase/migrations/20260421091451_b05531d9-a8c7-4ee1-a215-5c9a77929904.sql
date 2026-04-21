CREATE TABLE IF NOT EXISTS public.telegram_example_cache (
  chat_id BIGINT NOT NULL,
  idx SMALLINT NOT NULL,
  prompt TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '1 hour'),
  PRIMARY KEY (chat_id, idx)
);

CREATE INDEX IF NOT EXISTS idx_telegram_example_cache_expires
  ON public.telegram_example_cache(expires_at);

ALTER TABLE public.telegram_example_cache ENABLE ROW LEVEL SECURITY;

-- Service role only; no user-facing policies needed.
-- Block all anon/authenticated access explicitly.
CREATE POLICY "telegram_example_cache_no_user_access"
  ON public.telegram_example_cache
  FOR ALL
  TO authenticated, anon
  USING (false)
  WITH CHECK (false);