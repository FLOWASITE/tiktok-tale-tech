CREATE OR REPLACE FUNCTION public.recover_stuck_generation_tasks()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.generation_tasks
  SET status = 'failed',
      error_message = COALESCE(error_message, 'Auto-recovered: stale background task (>10min no update)'),
      completed_at = NOW(),
      updated_at = NOW()
  WHERE status IN ('pending', 'generating')
    AND updated_at < NOW() - INTERVAL '10 minutes';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'recover-stuck-generation-tasks') THEN
    PERFORM cron.unschedule('recover-stuck-generation-tasks');
  END IF;
END $$;

SELECT cron.schedule(
  'recover-stuck-generation-tasks',
  '*/5 * * * *',
  $$SELECT public.recover_stuck_generation_tasks();$$
);