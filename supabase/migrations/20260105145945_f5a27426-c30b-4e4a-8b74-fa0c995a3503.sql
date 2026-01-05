-- =============================================
-- Campaign Management System - Phase 1
-- Tables: campaigns, campaign_milestones, campaign_contents, campaign_kpi_logs
-- =============================================

-- 1. Table: campaigns (Main campaign table)
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  brand_template_id UUID REFERENCES public.brand_templates(id) ON DELETE SET NULL,
  
  -- Basic Info
  name TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  
  -- Timing
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Goals & KPIs (JSON array: [{ "metric": "reach", "label": "Reach", "target": 100000, "current": 0 }])
  campaign_type TEXT NOT NULL DEFAULT 'awareness' CHECK (campaign_type IN ('awareness', 'engagement', 'conversion', 'retention', 'launch')),
  goals JSONB DEFAULT '[]'::jsonb,
  
  -- Budget
  budget_total DECIMAL(15,2),
  budget_spent DECIMAL(15,2) DEFAULT 0,
  budget_currency TEXT DEFAULT 'VND',
  
  -- Channels
  target_channels TEXT[] DEFAULT '{}',
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'planning', 'active', 'paused', 'completed', 'cancelled')),
  
  -- Metadata
  tags TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Table: campaign_milestones
CREATE TABLE public.campaign_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'missed')),
  completed_at TIMESTAMPTZ,
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Table: campaign_contents (Polymorphic link to content)
CREATE TABLE public.campaign_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  
  -- Polymorphic content reference
  content_type TEXT NOT NULL CHECK (content_type IN ('multichannel', 'script', 'carousel')),
  content_id UUID NOT NULL,
  
  -- Position in campaign
  planned_publish_date DATE,
  sort_order INTEGER DEFAULT 0,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(campaign_id, content_type, content_id)
);

-- 4. Table: campaign_kpi_logs
CREATE TABLE public.campaign_kpi_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  
  logged_at DATE NOT NULL,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- Indexes for performance
-- =============================================
CREATE INDEX idx_campaigns_org ON public.campaigns(organization_id);
CREATE INDEX idx_campaigns_status ON public.campaigns(status);
CREATE INDEX idx_campaigns_dates ON public.campaigns(start_date, end_date);
CREATE INDEX idx_campaigns_brand ON public.campaigns(brand_template_id);

CREATE INDEX idx_campaign_milestones_campaign ON public.campaign_milestones(campaign_id);
CREATE INDEX idx_campaign_milestones_due_date ON public.campaign_milestones(due_date);

CREATE INDEX idx_campaign_contents_campaign ON public.campaign_contents(campaign_id);
CREATE INDEX idx_campaign_contents_content ON public.campaign_contents(content_type, content_id);

CREATE INDEX idx_campaign_kpi_logs_campaign ON public.campaign_kpi_logs(campaign_id);
CREATE INDEX idx_campaign_kpi_logs_logged_at ON public.campaign_kpi_logs(logged_at);

-- =============================================
-- Enable RLS
-- =============================================
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_kpi_logs ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS Policies for campaigns
-- =============================================
CREATE POLICY "campaigns_select" ON public.campaigns
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "campaigns_insert" ON public.campaigns
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "campaigns_update" ON public.campaigns
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "campaigns_delete" ON public.campaigns
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- =============================================
-- RLS Policies for campaign_milestones (inherit from campaign)
-- =============================================
CREATE POLICY "campaign_milestones_select" ON public.campaign_milestones
  FOR SELECT USING (
    campaign_id IN (
      SELECT id FROM public.campaigns WHERE organization_id IN (
        SELECT organization_id FROM public.organization_members 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "campaign_milestones_insert" ON public.campaign_milestones
  FOR INSERT WITH CHECK (
    campaign_id IN (
      SELECT id FROM public.campaigns WHERE organization_id IN (
        SELECT organization_id FROM public.organization_members 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "campaign_milestones_update" ON public.campaign_milestones
  FOR UPDATE USING (
    campaign_id IN (
      SELECT id FROM public.campaigns WHERE organization_id IN (
        SELECT organization_id FROM public.organization_members 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "campaign_milestones_delete" ON public.campaign_milestones
  FOR DELETE USING (
    campaign_id IN (
      SELECT id FROM public.campaigns WHERE organization_id IN (
        SELECT organization_id FROM public.organization_members 
        WHERE user_id = auth.uid()
      )
    )
  );

-- =============================================
-- RLS Policies for campaign_contents (inherit from campaign)
-- =============================================
CREATE POLICY "campaign_contents_select" ON public.campaign_contents
  FOR SELECT USING (
    campaign_id IN (
      SELECT id FROM public.campaigns WHERE organization_id IN (
        SELECT organization_id FROM public.organization_members 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "campaign_contents_insert" ON public.campaign_contents
  FOR INSERT WITH CHECK (
    campaign_id IN (
      SELECT id FROM public.campaigns WHERE organization_id IN (
        SELECT organization_id FROM public.organization_members 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "campaign_contents_update" ON public.campaign_contents
  FOR UPDATE USING (
    campaign_id IN (
      SELECT id FROM public.campaigns WHERE organization_id IN (
        SELECT organization_id FROM public.organization_members 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "campaign_contents_delete" ON public.campaign_contents
  FOR DELETE USING (
    campaign_id IN (
      SELECT id FROM public.campaigns WHERE organization_id IN (
        SELECT organization_id FROM public.organization_members 
        WHERE user_id = auth.uid()
      )
    )
  );

-- =============================================
-- RLS Policies for campaign_kpi_logs (inherit from campaign)
-- =============================================
CREATE POLICY "campaign_kpi_logs_select" ON public.campaign_kpi_logs
  FOR SELECT USING (
    campaign_id IN (
      SELECT id FROM public.campaigns WHERE organization_id IN (
        SELECT organization_id FROM public.organization_members 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "campaign_kpi_logs_insert" ON public.campaign_kpi_logs
  FOR INSERT WITH CHECK (
    campaign_id IN (
      SELECT id FROM public.campaigns WHERE organization_id IN (
        SELECT organization_id FROM public.organization_members 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "campaign_kpi_logs_update" ON public.campaign_kpi_logs
  FOR UPDATE USING (
    campaign_id IN (
      SELECT id FROM public.campaigns WHERE organization_id IN (
        SELECT organization_id FROM public.organization_members 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "campaign_kpi_logs_delete" ON public.campaign_kpi_logs
  FOR DELETE USING (
    campaign_id IN (
      SELECT id FROM public.campaigns WHERE organization_id IN (
        SELECT organization_id FROM public.organization_members 
        WHERE user_id = auth.uid()
      )
    )
  );

-- =============================================
-- Trigger: Auto-update updated_at on campaigns
-- =============================================
CREATE TRIGGER campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();