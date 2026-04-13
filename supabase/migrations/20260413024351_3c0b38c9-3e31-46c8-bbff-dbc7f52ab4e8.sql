
-- Create orchestrator daily stats table
CREATE TABLE public.orchestrator_daily_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  total_pipelines INTEGER NOT NULL DEFAULT 0,
  completed INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  avg_duration_ms INTEGER DEFAULT NULL,
  avg_quality_score NUMERIC(5,2) DEFAULT NULL,
  stage_bottleneck TEXT DEFAULT NULL,
  fast_path_hit_rate NUMERIC(5,2) DEFAULT NULL,
  top_failure_reason TEXT DEFAULT NULL,
  recovery_count INTEGER NOT NULL DEFAULT 0,
  concurrent_peak INTEGER NOT NULL DEFAULT 0,
  stage_durations JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (date, organization_id)
);

-- Enable RLS
ALTER TABLE public.orchestrator_daily_stats ENABLE ROW LEVEL SECURITY;

-- Policy: org members can read their org stats
CREATE POLICY "Org members can view orchestrator stats"
  ON public.orchestrator_daily_stats
  FOR SELECT
  TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

-- Policy: service role can insert/update (via edge functions)
CREATE POLICY "Service role can manage orchestrator stats"
  ON public.orchestrator_daily_stats
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Index for fast lookups
CREATE INDEX idx_orchestrator_daily_stats_org_date 
  ON public.orchestrator_daily_stats(organization_id, date DESC);

-- Trigger for updated_at
CREATE TRIGGER update_orchestrator_daily_stats_updated_at
  BEFORE UPDATE ON public.orchestrator_daily_stats
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
