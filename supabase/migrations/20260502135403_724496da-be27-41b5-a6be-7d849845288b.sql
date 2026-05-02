
-- 1. keyword_clusters
CREATE TABLE public.keyword_clusters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  parent_cluster_id UUID REFERENCES public.keyword_clusters(id) ON DELETE SET NULL,
  pillar_keyword_id UUID,
  target_pillar_page_slug TEXT,
  color TEXT DEFAULT '#94a3b8',
  keyword_count INTEGER NOT NULL DEFAULT 0,
  avg_priority NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);

CREATE INDEX idx_keyword_clusters_org ON public.keyword_clusters(organization_id);
CREATE INDEX idx_keyword_clusters_parent ON public.keyword_clusters(parent_cluster_id);

-- 2. seo_keywords
CREATE TABLE public.seo_keywords (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  keyword TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'vi',
  search_volume INTEGER DEFAULT 0,
  difficulty INTEGER DEFAULT 50 CHECK (difficulty >= 0 AND difficulty <= 100),
  cpc_vnd NUMERIC(12,2) DEFAULT 0,
  intent TEXT NOT NULL DEFAULT 'informational' CHECK (intent IN ('informational','commercial','transactional','navigational')),
  funnel_stage TEXT NOT NULL DEFAULT 'TOFU' CHECK (funnel_stage IN ('TOFU','MOFU','BOFU')),
  serp_features JSONB DEFAULT '[]'::jsonb,
  top_competitors JSONB DEFAULT '[]'::jsonb,
  content_gap_score INTEGER DEFAULT 0 CHECK (content_gap_score >= 0 AND content_gap_score <= 100),
  priority_score INTEGER DEFAULT 0 CHECK (priority_score >= 0 AND priority_score <= 100),
  cluster_id UUID REFERENCES public.keyword_clusters(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','researching','planned','assigned','published','tracking','archived')),
  assigned_landing_page_id UUID REFERENCES public.seo_landing_pages(id) ON DELETE SET NULL,
  current_rank INTEGER,
  last_checked_at TIMESTAMPTZ,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','ai_suggested','gsc_import','competitor_scrape','csv_import')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, keyword, locale)
);

CREATE INDEX idx_seo_keywords_org ON public.seo_keywords(organization_id);
CREATE INDEX idx_seo_keywords_cluster ON public.seo_keywords(cluster_id);
CREATE INDEX idx_seo_keywords_status ON public.seo_keywords(status);
CREATE INDEX idx_seo_keywords_priority ON public.seo_keywords(priority_score DESC);
CREATE INDEX idx_seo_keywords_assigned ON public.seo_keywords(assigned_landing_page_id);

-- FK pillar_keyword_id (sau khi seo_keywords tạo xong)
ALTER TABLE public.keyword_clusters
  ADD CONSTRAINT fk_pillar_keyword
  FOREIGN KEY (pillar_keyword_id) REFERENCES public.seo_keywords(id) ON DELETE SET NULL;

-- 3. keyword_research_jobs
CREATE TABLE public.keyword_research_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  seed_keyword TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'expand' CHECK (mode IN ('expand','cluster','gap_analysis','serp_scan')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','done','failed')),
  result JSONB DEFAULT '{}'::jsonb,
  keywords_added INTEGER NOT NULL DEFAULT 0,
  ai_model TEXT,
  cost_usd NUMERIC(10,4) DEFAULT 0,
  error_message TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_keyword_jobs_org ON public.keyword_research_jobs(organization_id);
CREATE INDEX idx_keyword_jobs_status ON public.keyword_research_jobs(status);

-- RLS
ALTER TABLE public.keyword_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.keyword_research_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_clusters_all" ON public.keyword_clusters
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  ) WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "org_members_keywords_all" ON public.seo_keywords
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  ) WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "org_members_jobs_select" ON public.keyword_research_jobs
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "org_members_jobs_insert" ON public.keyword_research_jobs
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "org_members_jobs_update" ON public.keyword_research_jobs
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

-- Hàm tính priority score
CREATE OR REPLACE FUNCTION public.calc_keyword_priority(
  _volume INTEGER,
  _difficulty INTEGER,
  _intent TEXT
) RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  intent_weight NUMERIC;
  score NUMERIC;
BEGIN
  intent_weight := CASE _intent
    WHEN 'transactional' THEN 1.5
    WHEN 'commercial' THEN 1.3
    WHEN 'informational' THEN 1.0
    WHEN 'navigational' THEN 0.7
    ELSE 1.0
  END;
  score := LN(GREATEST(_volume, 1) + 1) * 12 * intent_weight * (100 - COALESCE(_difficulty, 50)) / 100.0;
  RETURN LEAST(100, GREATEST(0, ROUND(score)::INTEGER));
END;
$$;

-- Trigger auto-compute priority + updated_at
CREATE OR REPLACE FUNCTION public.tg_seo_keywords_before_write()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.priority_score := public.calc_keyword_priority(NEW.search_volume, NEW.difficulty, NEW.intent);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_seo_keywords_before_write
BEFORE INSERT OR UPDATE ON public.seo_keywords
FOR EACH ROW EXECUTE FUNCTION public.tg_seo_keywords_before_write();

-- Trigger update cluster stats
CREATE OR REPLACE FUNCTION public.tg_recompute_cluster_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  affected_cluster UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    affected_cluster := OLD.cluster_id;
  ELSE
    affected_cluster := NEW.cluster_id;
    -- Cập nhật cluster cũ nếu đã thay đổi
    IF TG_OP = 'UPDATE' AND OLD.cluster_id IS DISTINCT FROM NEW.cluster_id AND OLD.cluster_id IS NOT NULL THEN
      UPDATE public.keyword_clusters
      SET keyword_count = (SELECT COUNT(*) FROM public.seo_keywords WHERE cluster_id = OLD.cluster_id),
          avg_priority = COALESCE((SELECT AVG(priority_score) FROM public.seo_keywords WHERE cluster_id = OLD.cluster_id), 0),
          updated_at = now()
      WHERE id = OLD.cluster_id;
    END IF;
  END IF;

  IF affected_cluster IS NOT NULL THEN
    UPDATE public.keyword_clusters
    SET keyword_count = (SELECT COUNT(*) FROM public.seo_keywords WHERE cluster_id = affected_cluster),
        avg_priority = COALESCE((SELECT AVG(priority_score) FROM public.seo_keywords WHERE cluster_id = affected_cluster), 0),
        updated_at = now()
    WHERE id = affected_cluster;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_recompute_cluster_stats
AFTER INSERT OR UPDATE OR DELETE ON public.seo_keywords
FOR EACH ROW EXECUTE FUNCTION public.tg_recompute_cluster_stats();

-- Trigger updated_at cho cluster
CREATE TRIGGER trg_keyword_clusters_updated
BEFORE UPDATE ON public.keyword_clusters
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
