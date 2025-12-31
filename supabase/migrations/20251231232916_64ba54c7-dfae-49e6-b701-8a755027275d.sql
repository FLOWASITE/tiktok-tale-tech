-- Phase 2: Persistent Search Cache
CREATE TABLE public.web_search_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT UNIQUE NOT NULL,
  query TEXT NOT NULL,
  search_type TEXT NOT NULL DEFAULT 'general',
  industry TEXT,
  results JSONB NOT NULL DEFAULT '[]'::jsonb,
  citations TEXT[] DEFAULT '{}'::text[],
  source TEXT NOT NULL,
  hit_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast cache lookups
CREATE INDEX idx_web_search_cache_key ON public.web_search_cache(cache_key);
CREATE INDEX idx_web_search_cache_expires ON public.web_search_cache(expires_at);

-- Phase 3: Search Analytics
CREATE TABLE public.web_search_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  organization_id UUID,
  query TEXT NOT NULL,
  search_type TEXT NOT NULL DEFAULT 'general',
  industry TEXT,
  source TEXT,
  result_count INTEGER DEFAULT 0,
  latency_ms INTEGER,
  cache_hit BOOLEAN DEFAULT false,
  fallback_used BOOLEAN DEFAULT false,
  error TEXT,
  results_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for analytics queries
CREATE INDEX idx_web_search_analytics_org ON public.web_search_analytics(organization_id);
CREATE INDEX idx_web_search_analytics_created ON public.web_search_analytics(created_at DESC);

-- Enable RLS
ALTER TABLE public.web_search_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.web_search_analytics ENABLE ROW LEVEL SECURITY;

-- Cache policies: service role can manage, admins can view
CREATE POLICY "Service role can manage cache"
  ON public.web_search_cache FOR ALL
  USING ((auth.jwt() ->> 'role') = 'service_role')
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

CREATE POLICY "Admins can view cache"
  ON public.web_search_cache FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Analytics policies
CREATE POLICY "Service role can insert analytics"
  ON public.web_search_analytics FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

CREATE POLICY "Admins can view all analytics"
  ON public.web_search_analytics FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Org members can view org analytics"
  ON public.web_search_analytics FOR SELECT
  USING (organization_id IS NOT NULL AND is_org_member(auth.uid(), organization_id));

-- Trigger for updated_at
CREATE TRIGGER update_web_search_cache_updated_at
  BEFORE UPDATE ON public.web_search_cache
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

-- Function to cleanup expired cache
CREATE OR REPLACE FUNCTION public.cleanup_web_search_cache()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM web_search_cache WHERE expires_at < now();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Function to get cache stats
CREATE OR REPLACE FUNCTION public.get_web_search_cache_stats()
RETURNS TABLE(
  search_type TEXT,
  total_entries BIGINT,
  total_hits BIGINT,
  avg_hit_count NUMERIC,
  cache_size_estimate BIGINT
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.search_type,
    COUNT(*)::BIGINT as total_entries,
    SUM(c.hit_count)::BIGINT as total_hits,
    ROUND(AVG(c.hit_count), 2) as avg_hit_count,
    SUM(pg_column_size(c.results))::BIGINT as cache_size_estimate
  FROM web_search_cache c
  WHERE c.expires_at > now()
  GROUP BY c.search_type
  ORDER BY total_hits DESC;
END;
$$;