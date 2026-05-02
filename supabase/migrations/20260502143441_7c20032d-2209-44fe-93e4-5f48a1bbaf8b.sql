
ALTER TABLE public.multi_channel_contents
  ADD COLUMN IF NOT EXISTS target_keyword_ids UUID[] DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS content_embedding extensions.vector(384);

CREATE INDEX IF NOT EXISTS idx_mcc_target_keywords ON public.multi_channel_contents USING GIN(target_keyword_ids);
CREATE INDEX IF NOT EXISTS idx_mcc_embedding ON public.multi_channel_contents USING ivfflat (content_embedding extensions.vector_cosine_ops) WITH (lists = 100);

ALTER TABLE public.seo_keywords
  ADD COLUMN IF NOT EXISTS previous_rank INT,
  ADD COLUMN IF NOT EXISTS rank_change INT,
  ADD COLUMN IF NOT EXISTS tracking_url TEXT;

CREATE TABLE IF NOT EXISTS public.seo_rank_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  keyword_id UUID NOT NULL REFERENCES public.seo_keywords(id) ON DELETE CASCADE,
  rank INT,
  serp_url TEXT,
  serp_features JSONB DEFAULT '[]'::jsonb,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT DEFAULT 'serper'
);

CREATE INDEX IF NOT EXISTS idx_rank_history_keyword ON public.seo_rank_history(keyword_id, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_rank_history_org ON public.seo_rank_history(organization_id, checked_at DESC);

ALTER TABLE public.seo_rank_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_members_select_rank_history" ON public.seo_rank_history;
CREATE POLICY "org_members_select_rank_history" ON public.seo_rank_history
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "service_role_manage_rank_history" ON public.seo_rank_history;
CREATE POLICY "service_role_manage_rank_history" ON public.seo_rank_history
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION public.find_related_content(
  query_embedding extensions.vector,
  org_id UUID,
  exclude_id UUID DEFAULT NULL,
  match_count INT DEFAULT 5,
  similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  topic TEXT,
  similarity FLOAT,
  website_content TEXT,
  blogger_content TEXT,
  wordpress_content TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT
    mcc.id,
    mcc.title,
    mcc.topic,
    1 - (mcc.content_embedding <=> query_embedding) AS similarity,
    mcc.website_content,
    mcc.blogger_content,
    mcc.wordpress_content
  FROM public.multi_channel_contents mcc
  WHERE mcc.organization_id = org_id
    AND mcc.content_embedding IS NOT NULL
    AND (exclude_id IS NULL OR mcc.id != exclude_id)
    AND mcc.status = 'published'
    AND 1 - (mcc.content_embedding <=> query_embedding) >= similarity_threshold
  ORDER BY mcc.content_embedding <=> query_embedding ASC
  LIMIT match_count;
$$;
