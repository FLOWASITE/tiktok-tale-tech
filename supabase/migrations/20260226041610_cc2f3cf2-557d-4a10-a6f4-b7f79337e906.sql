-- Drop and recreate views with SECURITY INVOKER
DROP VIEW IF EXISTS v_daily_metrics;
DROP VIEW IF EXISTS v_node_performance;
DROP VIEW IF EXISTS v_cache_and_revision;

CREATE VIEW v_daily_metrics
WITH (security_invoker = true)
AS
SELECT date(created_at) AS day,
    count(*) AS total_requests,
    percentile_cont(0.5) WITHIN GROUP (ORDER BY total_duration_ms::double precision) AS p50_ms,
    percentile_cont(0.95) WITHIN GROUP (ORDER BY total_duration_ms::double precision) AS p95_ms,
    percentile_cont(0.99) WITHIN GROUP (ORDER BY total_duration_ms::double precision) AS p99_ms,
    avg(CASE WHEN had_error THEN 1.0 ELSE 0.0 END) AS error_rate,
    avg(estimated_cost_usd) AS avg_cost_usd,
    sum(estimated_cost_usd) AS total_cost_usd,
    count(*) FILTER (WHERE had_error = true) AS error_count
FROM ai_metrics
GROUP BY date(created_at);

CREATE VIEW v_node_performance
WITH (security_invoker = true)
AS
SELECT function_name,
    count(*) AS total_calls,
    round(avg(total_duration_ms), 2) AS avg_duration_ms,
    percentile_cont(0.95) WITHIN GROUP (ORDER BY total_duration_ms::double precision) AS p95_duration_ms,
    avg(CASE WHEN exit_reason = 'fast_path' OR quality_mode = 'fast' THEN 1.0 ELSE 0.0 END) AS fast_path_ratio,
    avg(CASE WHEN had_error THEN 1.0 ELSE 0.0 END) AS error_rate,
    avg(estimated_cost_usd) AS avg_cost_usd
FROM ai_metrics
GROUP BY function_name;

CREATE VIEW v_cache_and_revision
WITH (security_invoker = true)
AS
SELECT date(created_at) AS day,
    avg(CASE WHEN cache_hit THEN 1.0 ELSE 0.0 END) AS cache_hit_rate,
    count(*) FILTER (WHERE cache_hit = true) AS cache_hits,
    count(*) FILTER (WHERE cache_hit = false OR cache_hit IS NULL) AS cache_misses,
    avg(CASE WHEN exit_reason ~~ 'revised_%' OR exit_reason = 'quality_warning' THEN 1.0 ELSE 0.0 END) AS revision_rate,
    count(*) FILTER (WHERE exit_reason ~~ 'revised_%' OR exit_reason = 'quality_warning') AS revision_count,
    count(*) FILTER (WHERE used_fallback = true) AS circuit_breaker_trips,
    avg(CASE WHEN used_fallback THEN 1.0 ELSE 0.0 END) AS fallback_rate
FROM ai_metrics
GROUP BY date(created_at);

-- Fix mutable search_path functions
CREATE OR REPLACE FUNCTION public.update_industry_v2_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_next_crawl_at(frequency text, last_crawled timestamp with time zone DEFAULT now())
RETURNS timestamp with time zone
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  CASE frequency
    WHEN 'daily' THEN RETURN last_crawled + INTERVAL '1 day';
    WHEN 'weekly' THEN RETURN last_crawled + INTERVAL '1 week';
    WHEN 'monthly' THEN RETURN last_crawled + INTERVAL '1 month';
    ELSE RETURN last_crawled + INTERVAL '1 week';
  END CASE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_regulation_sources_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;