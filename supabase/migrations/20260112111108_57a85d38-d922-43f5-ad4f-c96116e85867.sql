-- ============================================
-- Industry Personas V2 - Linked to Global Packs
-- Part of Industry Park v2.1 Architecture
-- ============================================

-- 1. Create industry_personas_v2 table
CREATE TABLE public.industry_personas_v2 (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  global_pack_id UUID NOT NULL REFERENCES public.industry_global_packs(id) ON DELETE CASCADE,
  
  -- Basic info
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  
  -- Demographics
  age_range TEXT,
  gender TEXT,
  income_level TEXT,
  education_level TEXT,
  occupation TEXT,
  location_type TEXT,
  family_status TEXT,
  
  -- Psychographics
  values TEXT[],
  interests TEXT[],
  lifestyle TEXT,
  personality_traits TEXT[],
  
  -- Buying behavior
  buying_motivation TEXT[],
  decision_factors TEXT[],
  price_sensitivity TEXT,
  purchase_frequency TEXT,
  preferred_channels TEXT[],
  
  -- Digital behavior
  device_usage JSONB DEFAULT '{}',
  tech_savviness TEXT,
  social_platforms TEXT[],
  content_consumption TEXT[],
  
  -- AI Enhancement fields
  communication_style TEXT,
  response_tone_hints TEXT[],
  content_preferences JSONB DEFAULT '{}',
  
  -- Journey & Pain points
  journey_stages JSONB DEFAULT '[]',
  pain_points TEXT[],
  goals TEXT[],
  objections TEXT[],
  
  -- Country/Jurisdiction variants
  country_variants JSONB DEFAULT '{}',
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- 2. Create translations table for personas
CREATE TABLE public.industry_persona_translations_v2 (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  persona_id UUID NOT NULL REFERENCES public.industry_personas_v2(id) ON DELETE CASCADE,
  language_code TEXT NOT NULL DEFAULT 'vi',
  
  -- Translated fields
  name TEXT NOT NULL,
  description TEXT,
  lifestyle TEXT,
  pain_points TEXT[],
  goals TEXT[],
  objections TEXT[],
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(persona_id, language_code)
);

-- 3. Create indexes for performance
CREATE INDEX idx_industry_personas_v2_global_pack ON public.industry_personas_v2(global_pack_id);
CREATE INDEX idx_industry_personas_v2_active ON public.industry_personas_v2(is_active) WHERE is_active = true;
CREATE INDEX idx_industry_persona_translations_v2_persona ON public.industry_persona_translations_v2(persona_id);
CREATE INDEX idx_industry_persona_translations_v2_lang ON public.industry_persona_translations_v2(language_code);

-- 4. Enable RLS
ALTER TABLE public.industry_personas_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.industry_persona_translations_v2 ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for industry_personas_v2
CREATE POLICY "Anyone can view active industry personas"
ON public.industry_personas_v2
FOR SELECT
USING (is_active = true);

CREATE POLICY "Authenticated users can manage industry personas"
ON public.industry_personas_v2
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 6. RLS Policies for translations
CREATE POLICY "Anyone can view persona translations"
ON public.industry_persona_translations_v2
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can manage persona translations"
ON public.industry_persona_translations_v2
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 7. Auto-update timestamp trigger
CREATE TRIGGER update_industry_personas_v2_updated_at
BEFORE UPDATE ON public.industry_personas_v2
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_industry_persona_translations_v2_updated_at
BEFORE UPDATE ON public.industry_persona_translations_v2
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Add target_personas to resolved_rules in jurisdiction profiles
-- This will be populated by the regenerate-profiles edge function
COMMENT ON TABLE public.industry_personas_v2 IS 'Industry Park v2.1: Target personas linked to global packs instead of legacy industry_template_id';
COMMENT ON COLUMN public.industry_personas_v2.country_variants IS 'JSONB object with jurisdiction-specific overrides, e.g. {"VN": {"income_level": "Medium"}, "US": {"income_level": "High"}}';
COMMENT ON COLUMN public.industry_personas_v2.journey_stages IS 'Customer journey stages as JSONB array: [{"stage": "Awareness", "touchpoints": [...], "emotions": [...]}]';