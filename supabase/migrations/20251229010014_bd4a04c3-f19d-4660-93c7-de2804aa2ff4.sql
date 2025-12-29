-- =============================================
-- INDUSTRY PERSONAS SYSTEM
-- Phase 2: Industry-level persona templates
-- =============================================

-- 1. Create industry_personas table
CREATE TABLE public.industry_personas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  industry_template_id UUID NOT NULL REFERENCES public.industry_templates(id) ON DELETE CASCADE,
  
  -- Basic info
  name TEXT NOT NULL,
  avatar_emoji TEXT DEFAULT '👤',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  
  -- Demographics
  age_range TEXT,
  gender TEXT,
  income_level TEXT,
  occupation TEXT,
  location TEXT,
  
  -- Psychographics (industry-specific defaults)
  pain_points TEXT[] DEFAULT '{}',
  desires TEXT[] DEFAULT '{}',
  objections TEXT[] DEFAULT '{}',
  values TEXT[] DEFAULT '{}',
  interests TEXT[] DEFAULT '{}',
  
  -- Buying behavior
  buying_triggers TEXT[] DEFAULT '{}',
  information_sources TEXT[] DEFAULT '{}',
  preferred_channels TEXT[] DEFAULT '{}',
  typical_funnel_stage TEXT,
  
  -- AI Enhancement fields (NEW)
  communication_style TEXT, -- e.g., "direct", "emotional", "analytical"
  response_tone_hints TEXT[], -- e.g., ["empathetic", "solution-oriented"]
  content_preferences JSONB DEFAULT '{}', -- {format: "short", visual: true, storytelling: true}
  persona_prompt_hints TEXT, -- AI instructions specific to this persona
  
  -- Metadata
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Create industry_persona_translations table for multi-language
CREATE TABLE public.industry_persona_translations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  industry_persona_id UUID NOT NULL REFERENCES public.industry_personas(id) ON DELETE CASCADE,
  language_code TEXT NOT NULL DEFAULT 'vi',
  
  -- Translatable fields
  name TEXT NOT NULL,
  occupation TEXT,
  pain_points TEXT[] DEFAULT '{}',
  desires TEXT[] DEFAULT '{}',
  objections TEXT[] DEFAULT '{}',
  persona_prompt_hints TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(industry_persona_id, language_code)
);

-- 3. Add source tracking columns to customer_personas
ALTER TABLE public.customer_personas 
ADD COLUMN IF NOT EXISTS source_industry_persona_id UUID REFERENCES public.industry_personas(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_customized BOOLEAN DEFAULT false;

-- 4. Create indexes for performance
CREATE INDEX idx_industry_personas_template ON public.industry_personas(industry_template_id);
CREATE INDEX idx_industry_personas_active ON public.industry_personas(is_active) WHERE is_active = true;
CREATE INDEX idx_industry_persona_translations_persona ON public.industry_persona_translations(industry_persona_id);
CREATE INDEX idx_customer_personas_source ON public.customer_personas(source_industry_persona_id) WHERE source_industry_persona_id IS NOT NULL;

-- 5. Enable RLS
ALTER TABLE public.industry_personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.industry_persona_translations ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for industry_personas
CREATE POLICY "Admins can manage industry personas"
ON public.industry_personas
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view active industry personas"
ON public.industry_personas
FOR SELECT
USING (
  is_active = true 
  AND EXISTS (
    SELECT 1 FROM public.industry_templates it 
    WHERE it.id = industry_template_id 
    AND it.is_active = true 
    AND it.deleted_at IS NULL
  )
);

-- 7. RLS Policies for industry_persona_translations
CREATE POLICY "Admins can manage persona translations"
ON public.industry_persona_translations
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view persona translations"
ON public.industry_persona_translations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.industry_personas ip
    JOIN public.industry_templates it ON it.id = ip.industry_template_id
    WHERE ip.id = industry_persona_id
    AND ip.is_active = true
    AND it.is_active = true
    AND it.deleted_at IS NULL
  )
);

-- 8. Trigger for updated_at
CREATE TRIGGER update_industry_personas_updated_at
  BEFORE UPDATE ON public.industry_personas
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

CREATE TRIGGER update_industry_persona_translations_updated_at
  BEFORE UPDATE ON public.industry_persona_translations
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();