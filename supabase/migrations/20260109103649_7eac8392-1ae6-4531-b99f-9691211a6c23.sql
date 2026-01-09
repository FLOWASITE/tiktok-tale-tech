-- ============================================
-- Phase 4: Learning from User Edits
-- Tables for tracking user edit patterns and brand preferences
-- ============================================

-- Table to store individual edit events
CREATE TABLE public.content_learnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  brand_template_id UUID REFERENCES public.brand_templates(id) ON DELETE SET NULL,
  user_id UUID,
  channel TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'multichannel', -- 'multichannel', 'script', 'carousel'
  edit_type TEXT NOT NULL, -- 'tone', 'length', 'cta', 'hook', 'structure', 'emoji', 'format'
  original_snippet TEXT, -- First 500 chars of original
  edited_snippet TEXT, -- First 500 chars of edited
  edit_diff JSONB, -- Structured diff data
  content_id UUID, -- Reference to the content being edited
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table to store aggregated brand preferences learned from edits
CREATE TABLE public.brand_preferences_learned (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_template_id UUID NOT NULL REFERENCES public.brand_templates(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  preference_key TEXT NOT NULL, -- 'preferred_tone', 'avg_length_delta', 'emoji_preference', etc.
  preference_value JSONB NOT NULL, -- Flexible structure for different preference types
  confidence_score FLOAT NOT NULL DEFAULT 0.5, -- 0-1, increases with more samples
  sample_count INT NOT NULL DEFAULT 1, -- Number of edits this is based on
  last_edit_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(brand_template_id, channel, preference_key)
);

-- Indexes for performance
CREATE INDEX idx_content_learnings_org ON public.content_learnings(organization_id);
CREATE INDEX idx_content_learnings_brand ON public.content_learnings(brand_template_id);
CREATE INDEX idx_content_learnings_channel ON public.content_learnings(channel);
CREATE INDEX idx_content_learnings_created ON public.content_learnings(created_at DESC);
CREATE INDEX idx_brand_preferences_brand_channel ON public.brand_preferences_learned(brand_template_id, channel);

-- Enable RLS
ALTER TABLE public.content_learnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_preferences_learned ENABLE ROW LEVEL SECURITY;

-- RLS Policies for content_learnings
CREATE POLICY "Users can view their org's learnings"
  ON public.content_learnings
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert learnings for their org"
  ON public.content_learnings
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for brand_preferences_learned
CREATE POLICY "Users can view brand preferences"
  ON public.brand_preferences_learned
  FOR SELECT
  USING (
    brand_template_id IN (
      SELECT id FROM public.brand_templates
      WHERE organization_id IN (
        SELECT organization_id FROM public.organization_members 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage brand preferences"
  ON public.brand_preferences_learned
  FOR ALL
  USING (
    brand_template_id IN (
      SELECT id FROM public.brand_templates
      WHERE organization_id IN (
        SELECT organization_id FROM public.organization_members 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Trigger to update updated_at
CREATE TRIGGER update_brand_preferences_updated_at
  BEFORE UPDATE ON public.brand_preferences_learned
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to aggregate learnings into preferences (can be called periodically)
CREATE OR REPLACE FUNCTION public.aggregate_content_learnings(p_brand_template_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_channel TEXT;
  v_edit_type TEXT;
  v_count INT;
BEGIN
  -- Loop through each channel and edit_type combination
  FOR v_channel, v_edit_type, v_count IN
    SELECT channel, edit_type, COUNT(*)
    FROM content_learnings
    WHERE brand_template_id = p_brand_template_id
    AND created_at > NOW() - INTERVAL '90 days'
    GROUP BY channel, edit_type
    HAVING COUNT(*) >= 3 -- Minimum samples for meaningful preference
  LOOP
    -- Upsert preference
    INSERT INTO brand_preferences_learned (
      brand_template_id,
      channel,
      preference_key,
      preference_value,
      confidence_score,
      sample_count,
      last_edit_at
    )
    VALUES (
      p_brand_template_id,
      v_channel,
      'edit_tendency_' || v_edit_type,
      jsonb_build_object('tendency', v_edit_type, 'frequency', 'high'),
      LEAST(0.9, 0.5 + (v_count * 0.05)), -- Confidence grows with samples
      v_count,
      NOW()
    )
    ON CONFLICT (brand_template_id, channel, preference_key)
    DO UPDATE SET
      preference_value = EXCLUDED.preference_value,
      confidence_score = LEAST(0.9, brand_preferences_learned.confidence_score + 0.02),
      sample_count = EXCLUDED.sample_count,
      last_edit_at = EXCLUDED.last_edit_at,
      updated_at = NOW();
  END LOOP;
END;
$$;