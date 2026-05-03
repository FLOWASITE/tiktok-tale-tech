ALTER TABLE public.keyword_research_jobs
  ADD COLUMN IF NOT EXISTS seeds JSONB,
  ADD COLUMN IF NOT EXISTS competitor_urls JSONB,
  ADD COLUMN IF NOT EXISTS preset TEXT,
  ADD COLUMN IF NOT EXISTS serp_grounding JSONB,
  ADD COLUMN IF NOT EXISTS preview JSONB,
  ADD COLUMN IF NOT EXISTS selected_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS auto_enrich BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS enrich_job_id UUID;

CREATE INDEX IF NOT EXISTS idx_keyword_jobs_org_created
  ON public.keyword_research_jobs(organization_id, created_at DESC);