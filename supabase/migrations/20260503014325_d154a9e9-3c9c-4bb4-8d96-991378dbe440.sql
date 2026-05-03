CREATE TABLE IF NOT EXISTS public.firecrawl_serp_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword_normalized TEXT NOT NULL,
  lang TEXT NOT NULL DEFAULT 'vi',
  country TEXT NOT NULL DEFAULT 'VN',
  results JSONB NOT NULL DEFAULT '[]'::jsonb,
  hit_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days')
);

CREATE UNIQUE INDEX IF NOT EXISTS firecrawl_serp_cache_key_idx
  ON public.firecrawl_serp_cache (keyword_normalized, lang, country);

CREATE INDEX IF NOT EXISTS firecrawl_serp_cache_expires_idx
  ON public.firecrawl_serp_cache (expires_at);

ALTER TABLE public.firecrawl_serp_cache ENABLE ROW LEVEL SECURITY;

-- Internal cache: no client access; only service role bypasses RLS.
CREATE POLICY "No client access to firecrawl cache"
  ON public.firecrawl_serp_cache
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);