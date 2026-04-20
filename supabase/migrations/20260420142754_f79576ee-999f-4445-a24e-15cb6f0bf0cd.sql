-- Idempotency table for Telegram webhook update_id deduplication
-- Telegram retries webhooks if response > 10s; this prevents double-processing
CREATE TABLE IF NOT EXISTS public.telegram_processed_updates (
  update_id BIGINT PRIMARY KEY,
  bot_config_id UUID,
  chat_id BIGINT,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_telegram_processed_updates_processed_at
  ON public.telegram_processed_updates (processed_at);

ALTER TABLE public.telegram_processed_updates ENABLE ROW LEVEL SECURITY;

-- Service-role only (no policies = no client access; service role bypasses RLS)
-- No SELECT/INSERT policies needed; only telegram-webhook edge function (service role) accesses it.

-- Cleanup function: drop entries older than 24h
CREATE OR REPLACE FUNCTION public.cleanup_telegram_processed_updates()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.telegram_processed_updates
  WHERE processed_at < now() - INTERVAL '24 hours';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Schedule cleanup every hour via pg_cron
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('cleanup-telegram-processed-updates')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-telegram-processed-updates');
    PERFORM cron.schedule(
      'cleanup-telegram-processed-updates',
      '0 * * * *',
      $cron$ SELECT public.cleanup_telegram_processed_updates(); $cron$
    );
  END IF;
END $$;