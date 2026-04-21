-- Telegram chat wizard state
CREATE TABLE public.telegram_chat_state (
  chat_id BIGINT NOT NULL,
  user_id UUID NOT NULL,
  flow TEXT NOT NULL,
  step TEXT NOT NULL,
  draft JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (chat_id, user_id)
);

CREATE INDEX idx_telegram_chat_state_updated_at ON public.telegram_chat_state(updated_at);

ALTER TABLE public.telegram_chat_state ENABLE ROW LEVEL SECURITY;

-- Service role only — no policies for authenticated users
-- (edge function uses service role key, bypasses RLS)

-- Auto-update updated_at
CREATE TRIGGER update_telegram_chat_state_updated_at
  BEFORE UPDATE ON public.telegram_chat_state
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Cleanup function for stale wizard states (>30 min)
CREATE OR REPLACE FUNCTION public.cleanup_stale_telegram_chat_state()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.telegram_chat_state
  WHERE updated_at < now() - INTERVAL '30 minutes';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;