CREATE TABLE public.cron_run_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_name TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'partial', 'failed', 'running')),
  triggered_by TEXT NOT NULL DEFAULT 'cron' CHECK (triggered_by IN ('cron', 'manual')),
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cron_run_logs_job_started ON public.cron_run_logs(job_name, started_at DESC);
CREATE INDEX idx_cron_run_logs_status ON public.cron_run_logs(status);

ALTER TABLE public.cron_run_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all cron logs"
  ON public.cron_run_logs
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete cron logs"
  ON public.cron_run_logs
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));