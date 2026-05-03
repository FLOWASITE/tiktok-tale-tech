ALTER TABLE public.keyword_research_jobs DROP CONSTRAINT IF EXISTS keyword_research_jobs_mode_check;
ALTER TABLE public.keyword_research_jobs ADD CONSTRAINT keyword_research_jobs_mode_check
  CHECK (mode IN ('expand','cluster','gap_analysis','serp_scan','preview','deep'));