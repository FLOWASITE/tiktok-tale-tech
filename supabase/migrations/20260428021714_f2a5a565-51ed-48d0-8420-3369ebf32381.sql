-- Ensure service role and postgres can write/read cron_run_logs (bypasses RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cron_run_logs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cron_run_logs TO postgres;

-- Add explicit insert policy as defence-in-depth for any authenticated path
DROP POLICY IF EXISTS "Service role can insert cron logs" ON public.cron_run_logs;
CREATE POLICY "Service role can insert cron logs"
  ON public.cron_run_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);