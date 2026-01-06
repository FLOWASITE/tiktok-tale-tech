-- =============================================
-- PHASE 2: AUDIENCE & TARGETING
-- =============================================

-- 1. Bảng lưu audience definitions có thể tái sử dụng
CREATE TABLE public.saved_audiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  brand_template_id UUID REFERENCES public.brand_templates(id) ON DELETE SET NULL,
  
  -- Basic info
  name TEXT NOT NULL,
  description TEXT,
  
  -- Demographics
  age_min INTEGER CHECK (age_min >= 13 AND age_min <= 65),
  age_max INTEGER CHECK (age_max >= 13 AND age_max <= 100),
  genders TEXT[] DEFAULT '{}',
  locations TEXT[] DEFAULT '{}',
  languages TEXT[] DEFAULT ARRAY['vi'],
  
  -- Interests & Behaviors
  interests TEXT[] DEFAULT '{}',
  behaviors TEXT[] DEFAULT '{}',
  life_events TEXT[] DEFAULT '{}',
  
  -- Advanced targeting
  income_levels TEXT[] DEFAULT '{}',
  education_levels TEXT[] DEFAULT '{}',
  relationship_statuses TEXT[] DEFAULT '{}',
  device_types TEXT[] DEFAULT '{}',
  
  -- Exclusions
  exclude_interests TEXT[] DEFAULT '{}',
  exclude_behaviors TEXT[] DEFAULT '{}',
  
  -- Lookalike
  lookalike_source TEXT,
  lookalike_percentage INTEGER CHECK (lookalike_percentage BETWEEN 1 AND 10),
  
  -- Persona link
  source_persona_id UUID REFERENCES public.customer_personas(id) ON DELETE SET NULL,
  
  -- Estimated reach (cached)
  estimated_reach_min INTEGER,
  estimated_reach_max INTEGER,
  last_reach_check TIMESTAMPTZ,
  
  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  is_favorite BOOLEAN DEFAULT false,
  
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Bảng Ad Sequences
CREATE TABLE public.ad_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  brand_template_id UUID REFERENCES public.brand_templates(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  
  name TEXT NOT NULL,
  description TEXT,
  sequence_type TEXT NOT NULL CHECK (sequence_type IN ('funnel', 'retargeting', 'launch', 'seasonal')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Bảng Sequence Stages
CREATE TABLE public.ad_sequence_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES public.ad_sequences(id) ON DELETE CASCADE,
  
  stage_name TEXT NOT NULL,
  stage_order INTEGER NOT NULL,
  stage_label TEXT,
  
  delay_days INTEGER DEFAULT 0,
  duration_days INTEGER DEFAULT 7,
  budget_percentage INTEGER DEFAULT 25,
  
  audience_adjustments JSONB,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Bảng link ad copies vào stages
CREATE TABLE public.ad_sequence_stage_copies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id UUID NOT NULL REFERENCES public.ad_sequence_stages(id) ON DELETE CASCADE,
  ad_copy_id UUID NOT NULL REFERENCES public.ad_copies(id) ON DELETE CASCADE,
  
  sort_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(stage_id, ad_copy_id)
);

-- 5. Add columns to ad_copies
ALTER TABLE public.ad_copies 
ADD COLUMN IF NOT EXISTS saved_audience_id UUID REFERENCES public.saved_audiences(id) ON DELETE SET NULL;

ALTER TABLE public.ad_copies 
ADD COLUMN IF NOT EXISTS sequence_stage_id UUID REFERENCES public.ad_sequence_stages(id) ON DELETE SET NULL;

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE public.saved_audiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_sequence_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_sequence_stage_copies ENABLE ROW LEVEL SECURITY;

-- Saved Audiences policies
CREATE POLICY "Users can view saved_audiences in their org" ON public.saved_audiences
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert saved_audiences in their org" ON public.saved_audiences
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update saved_audiences in their org" ON public.saved_audiences
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete saved_audiences in their org" ON public.saved_audiences
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

-- Ad Sequences policies
CREATE POLICY "Users can view ad_sequences in their org" ON public.ad_sequences
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert ad_sequences in their org" ON public.ad_sequences
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update ad_sequences in their org" ON public.ad_sequences
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete ad_sequences in their org" ON public.ad_sequences
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

-- Sequence Stages policies
CREATE POLICY "Users can view stages via sequence" ON public.ad_sequence_stages
  FOR SELECT USING (
    sequence_id IN (
      SELECT id FROM public.ad_sequences WHERE organization_id IN (
        SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert stages via sequence" ON public.ad_sequence_stages
  FOR INSERT WITH CHECK (
    sequence_id IN (
      SELECT id FROM public.ad_sequences WHERE organization_id IN (
        SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update stages via sequence" ON public.ad_sequence_stages
  FOR UPDATE USING (
    sequence_id IN (
      SELECT id FROM public.ad_sequences WHERE organization_id IN (
        SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete stages via sequence" ON public.ad_sequence_stages
  FOR DELETE USING (
    sequence_id IN (
      SELECT id FROM public.ad_sequences WHERE organization_id IN (
        SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
      )
    )
  );

-- Stage Copies policies
CREATE POLICY "Users can view stage_copies via stage" ON public.ad_sequence_stage_copies
  FOR SELECT USING (
    stage_id IN (
      SELECT s.id FROM public.ad_sequence_stages s
      JOIN public.ad_sequences seq ON s.sequence_id = seq.id
      WHERE seq.organization_id IN (
        SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert stage_copies via stage" ON public.ad_sequence_stage_copies
  FOR INSERT WITH CHECK (
    stage_id IN (
      SELECT s.id FROM public.ad_sequence_stages s
      JOIN public.ad_sequences seq ON s.sequence_id = seq.id
      WHERE seq.organization_id IN (
        SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update stage_copies via stage" ON public.ad_sequence_stage_copies
  FOR UPDATE USING (
    stage_id IN (
      SELECT s.id FROM public.ad_sequence_stages s
      JOIN public.ad_sequences seq ON s.sequence_id = seq.id
      WHERE seq.organization_id IN (
        SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete stage_copies via stage" ON public.ad_sequence_stage_copies
  FOR DELETE USING (
    stage_id IN (
      SELECT s.id FROM public.ad_sequence_stages s
      JOIN public.ad_sequences seq ON s.sequence_id = seq.id
      WHERE seq.organization_id IN (
        SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
      )
    )
  );

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX idx_saved_audiences_org ON public.saved_audiences(organization_id);
CREATE INDEX idx_saved_audiences_brand ON public.saved_audiences(brand_template_id);
CREATE INDEX idx_saved_audiences_persona ON public.saved_audiences(source_persona_id);

CREATE INDEX idx_ad_sequences_org ON public.ad_sequences(organization_id);
CREATE INDEX idx_ad_sequences_campaign ON public.ad_sequences(campaign_id);
CREATE INDEX idx_ad_sequences_status ON public.ad_sequences(status);

CREATE INDEX idx_ad_sequence_stages_sequence ON public.ad_sequence_stages(sequence_id);
CREATE INDEX idx_ad_sequence_stage_copies_stage ON public.ad_sequence_stage_copies(stage_id);
CREATE INDEX idx_ad_sequence_stage_copies_adcopy ON public.ad_sequence_stage_copies(ad_copy_id);

CREATE INDEX idx_ad_copies_saved_audience ON public.ad_copies(saved_audience_id);
CREATE INDEX idx_ad_copies_sequence_stage ON public.ad_copies(sequence_stage_id);