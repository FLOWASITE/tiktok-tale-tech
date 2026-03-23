
-- 1. Table geo_prompts: Prompt Bank with intent classification
CREATE TABLE IF NOT EXISTS public.geo_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  brand_monitor_id UUID REFERENCES public.geo_brand_monitors(id) ON DELETE CASCADE NOT NULL,
  prompt_text TEXT NOT NULL,
  intent_type TEXT DEFAULT 'informational' CHECK (intent_type IN ('informational', 'commercial', 'transactional', 'navigational', 'comparison')),
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'auto_generated', 'industry_pack', 'ai_suggested')),
  cluster_name TEXT,
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Table geo_scan_jobs: Track scan history, status, cost
CREATE TABLE IF NOT EXISTS public.geo_scan_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  brand_monitor_id UUID REFERENCES public.geo_brand_monitors(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  total_prompts INTEGER DEFAULT 0,
  completed_prompts INTEGER DEFAULT 0,
  total_api_calls INTEGER DEFAULT 0,
  estimated_cost_usd NUMERIC(10,4) DEFAULT 0,
  actual_cost_usd NUMERIC(10,4) DEFAULT 0,
  engines_used TEXT[] DEFAULT '{}',
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Table geo_visibility_snapshots: Aggregated weekly snapshots for fast dashboard
CREATE TABLE IF NOT EXISTS public.geo_visibility_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  brand_monitor_id UUID REFERENCES public.geo_brand_monitors(id) ON DELETE CASCADE NOT NULL,
  snapshot_date DATE NOT NULL,
  sov_percentage NUMERIC(5,2) DEFAULT 0,
  citation_rate NUMERIC(5,2) DEFAULT 0,
  avg_sentiment NUMERIC(5,2) DEFAULT 0,
  total_scans INTEGER DEFAULT 0,
  mentions_count INTEGER DEFAULT 0,
  citations_count INTEGER DEFAULT 0,
  competitor_sov JSONB DEFAULT '{}',
  top_prompts JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(brand_monitor_id, snapshot_date)
);

-- 4. Table geo_alert_history: Alert tracking
CREATE TABLE IF NOT EXISTS public.geo_alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  brand_monitor_id UUID REFERENCES public.geo_brand_monitors(id) ON DELETE CASCADE NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('sov_drop', 'sov_spike', 'new_competitor', 'sentiment_drop', 'citation_lost', 'citation_gained')),
  severity TEXT DEFAULT 'info' CHECK (severity IN ('critical', 'warning', 'info')),
  title TEXT NOT NULL,
  description TEXT,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Enhance geo_action_tasks: Add closed-loop fields
ALTER TABLE public.geo_action_tasks 
  ADD COLUMN IF NOT EXISTS content_id UUID,
  ADD COLUMN IF NOT EXISTS generated_content_id UUID,
  ADD COLUMN IF NOT EXISTS pre_score NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS post_score NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

-- Update status check to include new statuses
ALTER TABLE public.geo_action_tasks DROP CONSTRAINT IF EXISTS geo_action_tasks_status_check;
ALTER TABLE public.geo_action_tasks ADD CONSTRAINT geo_action_tasks_status_check 
  CHECK (status IN ('pending', 'in_progress', 'content_generated', 'published', 'measuring', 'resolved', 'done'));

-- 6. Performance indexes
CREATE INDEX IF NOT EXISTS idx_geo_prompts_monitor ON public.geo_prompts(brand_monitor_id, is_active);
CREATE INDEX IF NOT EXISTS idx_geo_scan_jobs_monitor ON public.geo_scan_jobs(brand_monitor_id, status);
CREATE INDEX IF NOT EXISTS idx_geo_scan_jobs_org ON public.geo_scan_jobs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_geo_visibility_snapshots_lookup ON public.geo_visibility_snapshots(brand_monitor_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_geo_alert_history_org ON public.geo_alert_history(organization_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_geo_monitoring_results_composite ON public.geo_monitoring_results(brand_monitor_id, ai_engine, scanned_at DESC);

-- 7. RLS policies
ALTER TABLE public.geo_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geo_scan_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geo_visibility_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geo_alert_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own org geo_prompts" ON public.geo_prompts
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can manage own org geo_scan_jobs" ON public.geo_scan_jobs
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can view own org geo_visibility_snapshots" ON public.geo_visibility_snapshots
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can manage own org geo_alert_history" ON public.geo_alert_history
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
