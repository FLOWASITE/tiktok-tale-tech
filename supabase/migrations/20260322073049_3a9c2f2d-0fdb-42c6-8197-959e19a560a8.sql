
-- Edge Function Metrics table for Phase 4 monitoring
CREATE TABLE public.edge_function_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  status_code INTEGER DEFAULT 200,
  is_cold_start BOOLEAN DEFAULT false,
  had_error BOOLEAN DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for dashboard queries
CREATE INDEX idx_efm_function_created ON public.edge_function_metrics (function_name, created_at DESC);
CREATE INDEX idx_efm_created ON public.edge_function_metrics (created_at DESC);

-- Daily aggregation table
CREATE TABLE public.edge_function_daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT NOT NULL,
  stat_date DATE NOT NULL,
  total_calls INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  cold_start_count INTEGER DEFAULT 0,
  avg_duration_ms NUMERIC(10,2) DEFAULT 0,
  p50_duration_ms INTEGER DEFAULT 0,
  p95_duration_ms INTEGER DEFAULT 0,
  max_duration_ms INTEGER DEFAULT 0,
  min_duration_ms INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(function_name, stat_date)
);

CREATE INDEX idx_efds_date ON public.edge_function_daily_stats (stat_date DESC);
CREATE INDEX idx_efds_function ON public.edge_function_daily_stats (function_name, stat_date DESC);

-- RLS
ALTER TABLE public.edge_function_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edge_function_daily_stats ENABLE ROW LEVEL SECURITY;

-- Admin-only read access
CREATE POLICY "Admins can view metrics"
  ON public.edge_function_metrics FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view daily stats"
  ON public.edge_function_daily_stats FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Service role insert (edge functions write via service client)
CREATE POLICY "Service can insert metrics"
  ON public.edge_function_metrics FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service can manage daily stats"
  ON public.edge_function_daily_stats FOR ALL
  USING (true) WITH CHECK (true);

-- Aggregation function
CREATE OR REPLACE FUNCTION public.aggregate_edge_function_stats(p_date DATE DEFAULT CURRENT_DATE - 1)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  INSERT INTO edge_function_daily_stats (
    function_name, stat_date, total_calls, error_count, cold_start_count,
    avg_duration_ms, p50_duration_ms, p95_duration_ms, max_duration_ms, min_duration_ms
  )
  SELECT
    function_name,
    p_date,
    COUNT(*)::INTEGER,
    COUNT(*) FILTER (WHERE had_error)::INTEGER,
    COUNT(*) FILTER (WHERE is_cold_start)::INTEGER,
    ROUND(AVG(duration_ms), 2),
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_ms)::INTEGER,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms)::INTEGER,
    MAX(duration_ms),
    MIN(duration_ms)
  FROM edge_function_metrics
  WHERE created_at >= p_date AND created_at < p_date + 1
  GROUP BY function_name
  ON CONFLICT (function_name, stat_date) DO UPDATE SET
    total_calls = EXCLUDED.total_calls,
    error_count = EXCLUDED.error_count,
    cold_start_count = EXCLUDED.cold_start_count,
    avg_duration_ms = EXCLUDED.avg_duration_ms,
    p50_duration_ms = EXCLUDED.p50_duration_ms,
    p95_duration_ms = EXCLUDED.p95_duration_ms,
    max_duration_ms = EXCLUDED.max_duration_ms,
    min_duration_ms = EXCLUDED.min_duration_ms;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Cleanup old raw metrics (keep 30 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_edge_metrics()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  DELETE FROM edge_function_metrics WHERE created_at < now() - INTERVAL '30 days';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
