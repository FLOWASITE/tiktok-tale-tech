-- Phase 4: Advanced Analytics Tables

-- Table for aggregated daily analytics snapshots
CREATE TABLE public.ad_copy_analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  
  -- Aggregated metrics
  total_ad_copies INTEGER DEFAULT 0,
  active_ad_copies INTEGER DEFAULT 0,
  total_impressions BIGINT DEFAULT 0,
  total_clicks BIGINT DEFAULT 0,
  total_conversions INTEGER DEFAULT 0,
  total_spend NUMERIC(15,2) DEFAULT 0,
  total_revenue NUMERIC(15,2) DEFAULT 0,
  
  -- Calculated averages
  avg_ctr NUMERIC(5,4) DEFAULT 0,
  avg_cpc NUMERIC(12,2) DEFAULT 0,
  avg_cpm NUMERIC(12,2) DEFAULT 0,
  avg_conversion_rate NUMERIC(5,4) DEFAULT 0,
  overall_roas NUMERIC(6,2) DEFAULT 0,
  
  -- Breakdown data (JSONB)
  platform_breakdown JSONB DEFAULT '{}',
  objective_breakdown JSONB DEFAULT '{}',
  top_performers JSONB DEFAULT '[]',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id, snapshot_date)
);

-- Table for AI-generated insights
CREATE TABLE public.ad_copy_ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  ad_copy_id UUID REFERENCES public.ad_copies(id) ON DELETE CASCADE,
  
  insight_type TEXT NOT NULL, -- 'trend', 'anomaly', 'recommendation', 'forecast'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT DEFAULT 'info', -- 'info', 'warning', 'success', 'critical'
  
  -- Contextual data
  metrics_context JSONB DEFAULT '{}',
  suggested_action TEXT,
  action_impact_estimate NUMERIC(5,2),
  
  -- Validity
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  is_dismissed BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_analytics_snapshots_org_date ON public.ad_copy_analytics_snapshots(organization_id, snapshot_date DESC);
CREATE INDEX idx_ai_insights_org ON public.ad_copy_ai_insights(organization_id, is_dismissed, valid_until);
CREATE INDEX idx_ai_insights_ad_copy ON public.ad_copy_ai_insights(ad_copy_id);

-- Enable RLS
ALTER TABLE public.ad_copy_analytics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_copy_ai_insights ENABLE ROW LEVEL SECURITY;

-- RLS Policies for analytics_snapshots
CREATE POLICY "Users can view org analytics snapshots"
ON public.ad_copy_analytics_snapshots FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert org analytics snapshots"
ON public.ad_copy_analytics_snapshots FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update org analytics snapshots"
ON public.ad_copy_analytics_snapshots FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  )
);

-- RLS Policies for ai_insights
CREATE POLICY "Users can view org ai insights"
ON public.ad_copy_ai_insights FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert org ai insights"
ON public.ad_copy_ai_insights FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update org ai insights"
ON public.ad_copy_ai_insights FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete org ai insights"
ON public.ad_copy_ai_insights FOR DELETE
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  )
);