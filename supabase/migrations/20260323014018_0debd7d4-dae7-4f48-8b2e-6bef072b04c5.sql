
-- ============================================
-- GEO Engine - Phase 1: Database Infrastructure
-- ============================================

-- 1. geo_brand_monitors: Cấu hình theo dõi brand trên AI engines
CREATE TABLE public.geo_brand_monitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  brand_template_id UUID NOT NULL REFERENCES public.brand_templates(id) ON DELETE CASCADE,
  brand_name TEXT NOT NULL,
  ai_engines TEXT[] NOT NULL DEFAULT ARRAY['chatgpt', 'gemini', 'perplexity'],
  keywords TEXT[] NOT NULL DEFAULT '{}',
  competitors TEXT[] NOT NULL DEFAULT '{}',
  scan_frequency TEXT NOT NULL DEFAULT 'weekly',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_scanned_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. geo_monitoring_results: Kết quả mỗi lần scan
CREATE TABLE public.geo_monitoring_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  brand_monitor_id UUID NOT NULL REFERENCES public.geo_brand_monitors(id) ON DELETE CASCADE,
  ai_engine TEXT NOT NULL,
  prompt TEXT NOT NULL,
  response TEXT,
  brand_mentioned BOOLEAN NOT NULL DEFAULT false,
  mention_count INTEGER NOT NULL DEFAULT 0,
  citation_urls TEXT[] DEFAULT '{}',
  sentiment_score NUMERIC DEFAULT 0,
  sentiment_label TEXT,
  competitor_mentions JSONB DEFAULT '{}',
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. geo_content_scores: GEO Score cho mỗi bài content
CREATE TABLE public.geo_content_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  content_id UUID NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'multi_channel',
  overall_score INTEGER NOT NULL DEFAULT 0,
  factor_scores JSONB NOT NULL DEFAULT '{}',
  issues JSONB NOT NULL DEFAULT '[]',
  suggestions JSONB DEFAULT '[]',
  last_scored_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(content_id, content_type)
);

-- 4. geo_prompt_clusters: Nhóm prompt theo industry
CREATE TABLE public.geo_prompt_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  brand_monitor_id UUID REFERENCES public.geo_brand_monitors(id) ON DELETE CASCADE,
  cluster_name TEXT NOT NULL,
  intent_type TEXT NOT NULL DEFAULT 'informational',
  sample_prompts TEXT[] NOT NULL DEFAULT '{}',
  volume_estimate INTEGER DEFAULT 0,
  brand_appearance_rate NUMERIC DEFAULT 0,
  is_gap BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. geo_schema_outputs: Schema markup đã generate
CREATE TABLE public.geo_schema_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  content_id UUID NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'multi_channel',
  schema_type TEXT NOT NULL DEFAULT 'Article',
  json_ld_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. geo_action_tasks: Task từ Action Center
CREATE TABLE public.geo_action_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  brand_monitor_id UUID REFERENCES public.geo_brand_monitors(id) ON DELETE SET NULL,
  source_module TEXT NOT NULL DEFAULT 'monitor',
  priority TEXT NOT NULL DEFAULT 'medium',
  title TEXT NOT NULL,
  description TEXT,
  brief JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'open',
  impact_score INTEGER DEFAULT 50,
  effort_level TEXT DEFAULT 'medium',
  assigned_to UUID REFERENCES auth.users(id),
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- RLS Policies
-- ============================================

ALTER TABLE public.geo_brand_monitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geo_monitoring_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geo_content_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geo_prompt_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geo_schema_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geo_action_tasks ENABLE ROW LEVEL SECURITY;

-- geo_brand_monitors policies
CREATE POLICY "Users can view own org geo monitors" ON public.geo_brand_monitors
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can insert own org geo monitors" ON public.geo_brand_monitors
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can update own org geo monitors" ON public.geo_brand_monitors
  FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can delete own org geo monitors" ON public.geo_brand_monitors
  FOR DELETE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

-- geo_monitoring_results policies
CREATE POLICY "Users can view own org monitoring results" ON public.geo_monitoring_results
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can insert own org monitoring results" ON public.geo_monitoring_results
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- geo_content_scores policies
CREATE POLICY "Users can view own org content scores" ON public.geo_content_scores
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can manage own org content scores" ON public.geo_content_scores
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

-- geo_prompt_clusters policies
CREATE POLICY "Users can view own org prompt clusters" ON public.geo_prompt_clusters
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can manage own org prompt clusters" ON public.geo_prompt_clusters
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

-- geo_schema_outputs policies
CREATE POLICY "Users can view own org schema outputs" ON public.geo_schema_outputs
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can manage own org schema outputs" ON public.geo_schema_outputs
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

-- geo_action_tasks policies
CREATE POLICY "Users can view own org action tasks" ON public.geo_action_tasks
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can manage own org action tasks" ON public.geo_action_tasks
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

-- ============================================
-- Realtime
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.geo_monitoring_results;
ALTER PUBLICATION supabase_realtime ADD TABLE public.geo_action_tasks;

-- ============================================
-- Triggers for updated_at
-- ============================================
CREATE TRIGGER update_geo_brand_monitors_updated_at BEFORE UPDATE ON public.geo_brand_monitors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_geo_content_scores_updated_at BEFORE UPDATE ON public.geo_content_scores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_geo_prompt_clusters_updated_at BEFORE UPDATE ON public.geo_prompt_clusters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_geo_schema_outputs_updated_at BEFORE UPDATE ON public.geo_schema_outputs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_geo_action_tasks_updated_at BEFORE UPDATE ON public.geo_action_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- Indexes for performance
-- ============================================
CREATE INDEX idx_geo_monitoring_results_monitor ON public.geo_monitoring_results(brand_monitor_id, scanned_at DESC);
CREATE INDEX idx_geo_monitoring_results_org ON public.geo_monitoring_results(organization_id);
CREATE INDEX idx_geo_content_scores_content ON public.geo_content_scores(content_id, content_type);
CREATE INDEX idx_geo_action_tasks_org_status ON public.geo_action_tasks(organization_id, status);
CREATE INDEX idx_geo_prompt_clusters_monitor ON public.geo_prompt_clusters(brand_monitor_id);
