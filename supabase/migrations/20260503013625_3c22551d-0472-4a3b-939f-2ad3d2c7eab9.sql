ALTER TABLE public.keyword_enrichment_jobs
ADD COLUMN IF NOT EXISTS keyword_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];

COMMENT ON COLUMN public.keyword_enrichment_jobs.keyword_ids IS 'Danh sách keyword IDs được enrich trong job này (để tra cứu chính xác success/failed)';