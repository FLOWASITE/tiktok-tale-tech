CREATE TABLE public.keyword_enrichment_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','done','failed')),
  total int NOT NULL DEFAULT 0,
  done int NOT NULL DEFAULT 0,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX idx_keyword_enrichment_jobs_org ON public.keyword_enrichment_jobs(organization_id, created_at DESC);

ALTER TABLE public.keyword_enrichment_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_select_enrichment_jobs"
ON public.keyword_enrichment_jobs FOR SELECT
USING (organization_id IN (
  SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
));

CREATE POLICY "org_members_insert_enrichment_jobs"
ON public.keyword_enrichment_jobs FOR INSERT
WITH CHECK (organization_id IN (
  SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
));

CREATE POLICY "org_members_update_enrichment_jobs"
ON public.keyword_enrichment_jobs FOR UPDATE
USING (organization_id IN (
  SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
));