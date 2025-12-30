-- Create product_persona_mappings table for Many-to-Many relationship
CREATE TABLE public.product_persona_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.brand_products(id) ON DELETE CASCADE,
  persona_id UUID NOT NULL REFERENCES public.customer_personas(id) ON DELETE CASCADE,
  brand_template_id UUID NOT NULL REFERENCES public.brand_templates(id) ON DELETE CASCADE,
  
  -- Mapping metadata
  relevance_score INTEGER DEFAULT 80,
  is_primary_product BOOLEAN DEFAULT false,
  
  -- Custom messaging per persona
  custom_pitch TEXT,
  key_benefits TEXT[] DEFAULT '{}',
  objection_handlers TEXT[] DEFAULT '{}',
  
  -- Content hints
  preferred_content_angles TEXT[] DEFAULT '{}',
  avoid_topics TEXT[] DEFAULT '{}',
  
  -- Ownership
  organization_id UUID REFERENCES public.organizations(id),
  user_id UUID,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(product_id, persona_id)
);

-- Add constraint for relevance_score using trigger (avoiding CHECK constraint issues)
CREATE OR REPLACE FUNCTION public.validate_relevance_score()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.relevance_score < 0 OR NEW.relevance_score > 100 THEN
    RAISE EXCEPTION 'relevance_score must be between 0 and 100';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER validate_relevance_score_trigger
BEFORE INSERT OR UPDATE ON public.product_persona_mappings
FOR EACH ROW EXECUTE FUNCTION public.validate_relevance_score();

-- Create updated_at trigger
CREATE TRIGGER update_product_persona_mappings_updated_at
BEFORE UPDATE ON public.product_persona_mappings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.product_persona_mappings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own mappings"
ON public.product_persona_mappings FOR SELECT
USING (
  (user_id = auth.uid()) OR
  (organization_id IS NOT NULL AND is_org_member(auth.uid(), organization_id))
);

CREATE POLICY "Users can insert mappings"
ON public.product_persona_mappings FOR INSERT
WITH CHECK (
  ((organization_id IS NULL) AND (user_id = auth.uid())) OR
  ((organization_id IS NOT NULL) AND is_org_member(auth.uid(), organization_id))
);

CREATE POLICY "Users can update own mappings"
ON public.product_persona_mappings FOR UPDATE
USING (
  (user_id = auth.uid()) OR
  (organization_id IS NOT NULL AND is_org_member(auth.uid(), organization_id))
);

CREATE POLICY "Users can delete own mappings"
ON public.product_persona_mappings FOR DELETE
USING (
  (user_id = auth.uid()) OR
  (organization_id IS NOT NULL AND is_org_admin(auth.uid(), organization_id))
);

-- Indexes for performance
CREATE INDEX idx_product_persona_mappings_brand ON public.product_persona_mappings(brand_template_id);
CREATE INDEX idx_product_persona_mappings_product ON public.product_persona_mappings(product_id);
CREATE INDEX idx_product_persona_mappings_persona ON public.product_persona_mappings(persona_id);
CREATE INDEX idx_product_persona_mappings_org ON public.product_persona_mappings(organization_id);