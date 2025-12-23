-- Create AI Response Cache table
CREATE TABLE public.ai_response_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Cache identification (separated keys for analytics)
  cache_key text UNIQUE NOT NULL,
  input_hash text NOT NULL,
  
  -- Function metadata
  function_name text NOT NULL,
  
  -- Cached data (only normalized + validated)
  response_data jsonb NOT NULL,
  response_schema_version text NOT NULL DEFAULT '1.0',
  
  -- Scope (org or global)
  cache_scope text NOT NULL DEFAULT 'org',
  organization_id uuid,
  
  -- Version tracking for invalidation
  brand_template_id uuid,
  industry_memory_version text,
  brand_voice_version text,
  
  -- TTL & Stats
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  hit_count integer NOT NULL DEFAULT 0,
  last_hit_at timestamptz,
  
  -- Constraints
  CONSTRAINT valid_cache_scope CHECK (
    (cache_scope = 'global' AND organization_id IS NULL) OR
    (cache_scope = 'org' AND organization_id IS NOT NULL)
  )
);

-- Enable RLS
ALTER TABLE public.ai_response_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage all cache entries"
ON public.ai_response_cache
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Org members can view org cache entries"
ON public.ai_response_cache
FOR SELECT
USING (
  cache_scope = 'global' OR 
  (cache_scope = 'org' AND is_org_member(auth.uid(), organization_id))
);

-- Indexes for performance (no partial index with now())
CREATE INDEX idx_cache_lookup ON public.ai_response_cache(cache_key, expires_at);
CREATE INDEX idx_cache_input_hash ON public.ai_response_cache(input_hash);
CREATE INDEX idx_cache_scope_function ON public.ai_response_cache(cache_scope, function_name);
CREATE INDEX idx_cache_org ON public.ai_response_cache(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX idx_cache_cleanup ON public.ai_response_cache(expires_at);
CREATE INDEX idx_cache_brand_template ON public.ai_response_cache(brand_template_id) WHERE brand_template_id IS NOT NULL;

-- Function to increment cache hit count
CREATE OR REPLACE FUNCTION public.increment_cache_hit(p_cache_key text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE ai_response_cache
  SET hit_count = hit_count + 1,
      last_hit_at = now()
  WHERE cache_key = p_cache_key;
END;
$$;

-- Function to cleanup expired cache entries
CREATE OR REPLACE FUNCTION public.cleanup_expired_cache()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM ai_response_cache
  WHERE expires_at < now();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Function to get cache statistics
CREATE OR REPLACE FUNCTION public.get_cache_stats(p_organization_id uuid DEFAULT NULL)
RETURNS TABLE (
  function_name text,
  cache_scope text,
  total_entries bigint,
  total_hits bigint,
  avg_hit_count numeric,
  oldest_entry timestamptz,
  newest_entry timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.function_name,
    c.cache_scope,
    COUNT(*)::bigint as total_entries,
    SUM(c.hit_count)::bigint as total_hits,
    ROUND(AVG(c.hit_count), 2) as avg_hit_count,
    MIN(c.created_at) as oldest_entry,
    MAX(c.created_at) as newest_entry
  FROM ai_response_cache c
  WHERE c.expires_at > now()
    AND (p_organization_id IS NULL OR c.organization_id = p_organization_id OR c.cache_scope = 'global')
  GROUP BY c.function_name, c.cache_scope
  ORDER BY total_hits DESC;
END;
$$;

-- Trigger to invalidate cache when brand template changes
CREATE OR REPLACE FUNCTION public.invalidate_cache_on_brand_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.forbidden_words IS DISTINCT FROM NEW.forbidden_words OR
     OLD.tone_of_voice IS DISTINCT FROM NEW.tone_of_voice OR
     OLD.preferred_words IS DISTINCT FROM NEW.preferred_words OR
     OLD.brand_positioning IS DISTINCT FROM NEW.brand_positioning OR
     OLD.formality_level IS DISTINCT FROM NEW.formality_level OR
     OLD.language_style IS DISTINCT FROM NEW.language_style THEN
    
    DELETE FROM ai_response_cache
    WHERE cache_scope = 'org' 
      AND organization_id = NEW.organization_id
      AND brand_template_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_invalidate_cache_on_brand_update
AFTER UPDATE ON public.brand_templates
FOR EACH ROW
EXECUTE FUNCTION public.invalidate_cache_on_brand_update();

-- Trigger to invalidate cache when industry memory version changes
CREATE OR REPLACE FUNCTION public.invalidate_cache_on_industry_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.version IS DISTINCT FROM NEW.version THEN
    DELETE FROM ai_response_cache
    WHERE industry_memory_version = OLD.version;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_invalidate_cache_on_industry_update
AFTER UPDATE ON public.industry_templates
FOR EACH ROW
EXECUTE FUNCTION public.invalidate_cache_on_industry_update();