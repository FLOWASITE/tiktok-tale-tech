
-- ============================================
-- Topic Cluster Architecture (Pillar-Cluster)
-- ============================================

-- 1) seo_clusters table
CREATE TABLE IF NOT EXISTS public.seo_clusters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  pillar_keyword_id UUID REFERENCES public.seo_keywords(id) ON DELETE SET NULL,
  pillar_content_id UUID REFERENCES public.multi_channel_contents(id) ON DELETE SET NULL,
  color TEXT DEFAULT '#6B7280',
  status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning','active','completed','archived')),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seo_clusters_org ON public.seo_clusters(organization_id);
CREATE INDEX IF NOT EXISTS idx_seo_clusters_pillar_kw ON public.seo_clusters(pillar_keyword_id);

ALTER TABLE public.seo_clusters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_select_clusters" ON public.seo_clusters
  FOR SELECT USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_members_insert_clusters" ON public.seo_clusters
  FOR INSERT WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_members_update_clusters" ON public.seo_clusters
  FOR UPDATE USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_members_delete_clusters" ON public.seo_clusters
  FOR DELETE USING (public.is_org_member(auth.uid(), organization_id));

CREATE TRIGGER trg_seo_clusters_updated_at
  BEFORE UPDATE ON public.seo_clusters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Add cluster_id to topic_history (FK to seo_clusters)
ALTER TABLE public.topic_history
  ADD COLUMN IF NOT EXISTS cluster_id UUID REFERENCES public.seo_clusters(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_topic_history_cluster ON public.topic_history(cluster_id);

-- 3) Add FK on existing seo_keywords.cluster_id (already exists as column, point it at the new table)
DO $$ BEGIN
  ALTER TABLE public.seo_keywords
    ADD CONSTRAINT seo_keywords_cluster_id_fkey
    FOREIGN KEY (cluster_id) REFERENCES public.seo_clusters(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS idx_seo_keywords_cluster ON public.seo_keywords(cluster_id);

-- 4) Coverage view (regular view; cheap aggregations)
CREATE OR REPLACE VIEW public.cluster_coverage AS
SELECT
  c.id AS cluster_id,
  c.organization_id,
  c.name,
  c.status,
  COUNT(DISTINCT k.id) AS keyword_count,
  COUNT(DISTINCT k.id) FILTER (WHERE k.assigned_landing_page_id IS NOT NULL) AS keywords_covered,
  COUNT(DISTINCT t.id) AS topic_count,
  COUNT(DISTINCT t.id) FILTER (WHERE t.was_used = true) AS topics_used,
  CASE WHEN COUNT(DISTINCT k.id) > 0
       THEN ROUND(100.0 * COUNT(DISTINCT k.id) FILTER (WHERE k.assigned_landing_page_id IS NOT NULL) / COUNT(DISTINCT k.id), 1)
       ELSE 0 END AS coverage_pct
FROM public.seo_clusters c
LEFT JOIN public.seo_keywords k ON k.cluster_id = c.id
LEFT JOIN public.topic_history t ON t.cluster_id = c.id
GROUP BY c.id;
