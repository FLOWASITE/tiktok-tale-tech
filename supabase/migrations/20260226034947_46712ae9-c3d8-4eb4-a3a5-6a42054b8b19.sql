
-- Sprint 6C: Observability SQL Views for ai_metrics

-- View 1: Daily overview metrics
CREATE OR REPLACE VIEW v_daily_metrics AS
SELECT
  DATE(created_at) as day,
  COUNT(*) as total_requests,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY total_duration_ms) as p50_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY total_duration_ms) as p95_ms,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY total_duration_ms) as p99_ms,
  AVG(CASE WHEN had_error THEN 1.0 ELSE 0.0 END) as error_rate,
  AVG(estimated_cost_usd) as avg_cost_usd,
  SUM(estimated_cost_usd) as total_cost_usd,
  COUNT(*) FILTER (WHERE had_error = true) as error_count
FROM ai_metrics
GROUP BY DATE(created_at);

-- View 2: Node-level performance
CREATE OR REPLACE VIEW v_node_performance AS
SELECT
  function_name,
  COUNT(*) as total_calls,
  ROUND(AVG(total_duration_ms)::numeric, 2) as avg_duration_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY total_duration_ms) as p95_duration_ms,
  AVG(CASE WHEN exit_reason = 'fast_path' OR quality_mode = 'fast' THEN 1.0 ELSE 0.0 END) as fast_path_ratio,
  AVG(CASE WHEN had_error THEN 1.0 ELSE 0.0 END) as error_rate,
  AVG(estimated_cost_usd) as avg_cost_usd
FROM ai_metrics
GROUP BY function_name;

-- View 3: Cache, revision, and circuit breaker metrics
CREATE OR REPLACE VIEW v_cache_and_revision AS
SELECT
  DATE(created_at) as day,
  AVG(CASE WHEN cache_hit THEN 1.0 ELSE 0.0 END) as cache_hit_rate,
  COUNT(*) FILTER (WHERE cache_hit = true) as cache_hits,
  COUNT(*) FILTER (WHERE cache_hit = false OR cache_hit IS NULL) as cache_misses,
  AVG(CASE WHEN exit_reason LIKE 'revised_%' OR exit_reason = 'quality_warning' THEN 1.0 ELSE 0.0 END) as revision_rate,
  COUNT(*) FILTER (WHERE exit_reason LIKE 'revised_%' OR exit_reason = 'quality_warning') as revision_count,
  COUNT(*) FILTER (WHERE used_fallback = true) as circuit_breaker_trips,
  AVG(CASE WHEN used_fallback THEN 1.0 ELSE 0.0 END) as fallback_rate
FROM ai_metrics
GROUP BY DATE(created_at);
