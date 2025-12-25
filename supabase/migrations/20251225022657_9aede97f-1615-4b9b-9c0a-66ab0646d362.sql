-- Create customer_personas table for marketing-focused topic generation
CREATE TABLE public.customer_personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_template_id UUID REFERENCES public.brand_templates(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id),
  user_id UUID,
  
  -- Basic Info
  name TEXT NOT NULL,
  avatar_emoji TEXT DEFAULT '👤',
  is_primary BOOLEAN DEFAULT false,
  
  -- Demographics
  age_range TEXT,
  gender TEXT,
  location TEXT,
  income_level TEXT,
  occupation TEXT,
  
  -- Psychographics
  pain_points TEXT[] DEFAULT '{}',
  desires TEXT[] DEFAULT '{}',
  objections TEXT[] DEFAULT '{}',
  values TEXT[] DEFAULT '{}',
  interests TEXT[] DEFAULT '{}',
  
  -- Buying Behavior
  buying_triggers TEXT[] DEFAULT '{}',
  information_sources TEXT[] DEFAULT '{}',
  preferred_channels TEXT[] DEFAULT '{}',
  typical_funnel_stage TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customer_personas ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view personas in their org"
ON public.customer_personas FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  )
  OR user_id = auth.uid()
);

CREATE POLICY "Users can create personas"
ON public.customer_personas FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  )
  OR user_id = auth.uid()
);

CREATE POLICY "Users can update personas in their org"
ON public.customer_personas FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  )
  OR user_id = auth.uid()
);

CREATE POLICY "Users can delete personas in their org"
ON public.customer_personas FOR DELETE
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  )
  OR user_id = auth.uid()
);

-- Updated_at trigger
CREATE TRIGGER update_customer_personas_updated_at
  BEFORE UPDATE ON public.customer_personas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for fast lookups
CREATE INDEX idx_customer_personas_brand_template ON public.customer_personas(brand_template_id);
CREATE INDEX idx_customer_personas_org ON public.customer_personas(organization_id);