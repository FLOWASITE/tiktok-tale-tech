CREATE OR REPLACE FUNCTION public.increment_firecrawl_cache_hit(
  _kw TEXT,
  _lang TEXT,
  _country TEXT
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.firecrawl_serp_cache
     SET hit_count = hit_count + 1
   WHERE keyword_normalized = _kw
     AND lang = _lang
     AND country = _country;
$$;

REVOKE ALL ON FUNCTION public.increment_firecrawl_cache_hit(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_firecrawl_cache_hit(TEXT, TEXT, TEXT) TO service_role;