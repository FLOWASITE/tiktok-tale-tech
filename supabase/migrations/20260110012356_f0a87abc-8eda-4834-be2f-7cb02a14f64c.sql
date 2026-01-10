-- ============================================
-- CORE CONTENT LAYER - Single Source of Truth
-- ============================================

-- 1. Create core_contents table
CREATE TABLE public.core_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Metadata cơ bản
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  
  -- Nội dung gốc (Long-form 800-2000 từ)
  content TEXT NOT NULL,
  word_count INTEGER,
  
  -- Context & Targeting
  content_goal TEXT NOT NULL DEFAULT 'education',
  content_angle TEXT,
  target_audience TEXT,
  key_messages JSONB DEFAULT '[]'::jsonb,
  
  -- Brand & Organization
  brand_template_id UUID REFERENCES public.brand_templates(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID,
  
  -- Source tracking
  source_type TEXT NOT NULL DEFAULT 'ai_generated',
  source_topic_history_id UUID REFERENCES public.topic_history(id) ON DELETE SET NULL,
  
  -- Quality metrics
  quality_score INTEGER CHECK (quality_score >= 0 AND quality_score <= 100),
  ai_model_used TEXT,
  
  -- Content Role (optional - for future Seed/Sprout/Harvest)
  content_role TEXT CHECK (content_role IN ('seed', 'sprout', 'harvest')),
  
  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'archived')),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Add core_content_id to multi_channel_contents
ALTER TABLE public.multi_channel_contents 
ADD COLUMN core_content_id UUID REFERENCES public.core_contents(id) ON DELETE SET NULL;

-- 3. Create indexes for performance
CREATE INDEX idx_core_contents_org ON public.core_contents(organization_id);
CREATE INDEX idx_core_contents_brand ON public.core_contents(brand_template_id);
CREATE INDEX idx_core_contents_topic ON public.core_contents(topic);
CREATE INDEX idx_core_contents_status ON public.core_contents(status);
CREATE INDEX idx_core_contents_created ON public.core_contents(created_at DESC);
CREATE INDEX idx_mcc_core_content ON public.multi_channel_contents(core_content_id);

-- 4. Add comments for documentation
COMMENT ON TABLE public.core_contents IS 'Single Source of Truth for content - long-form core content that can be transformed into platform-specific variants';
COMMENT ON COLUMN public.core_contents.content IS 'Long-form content (800-2000 words) - the master content before platform adaptation';
COMMENT ON COLUMN public.core_contents.key_messages IS 'Array of key messages/points that must be preserved when transforming to variants';
COMMENT ON COLUMN public.core_contents.content_role IS 'Content role in funnel: seed (awareness), sprout (trust), harvest (conversion)';
COMMENT ON COLUMN public.multi_channel_contents.core_content_id IS 'Link to parent core content. When not null, this content was derived/transformed from a core content source';

-- 5. Create trigger for updated_at
CREATE TRIGGER update_core_contents_updated_at
  BEFORE UPDATE ON public.core_contents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Enable RLS
ALTER TABLE public.core_contents ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies - using organization membership
CREATE POLICY "Users can view org core contents"
  ON public.core_contents FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create org core contents"
  ON public.core_contents FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update org core contents"
  ON public.core_contents FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete org core contents"
  ON public.core_contents FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members 
      WHERE user_id = auth.uid()
    )
  );