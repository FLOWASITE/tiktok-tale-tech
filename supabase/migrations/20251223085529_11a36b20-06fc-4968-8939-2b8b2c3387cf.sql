-- Create brand_voice_variants table for A/B testing
CREATE TABLE public.brand_voice_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_template_id UUID NOT NULL REFERENCES brand_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_control BOOLEAN DEFAULT false,
  
  -- Brand Voice fields
  brand_positioning TEXT,
  tone_of_voice TEXT[],
  formality_level TEXT,
  language_style TEXT[],
  preferred_words TEXT[],
  forbidden_words TEXT[],
  allow_emoji BOOLEAN DEFAULT true,
  
  -- Tracking
  content_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Organization scope (inherited from brand_template)
  organization_id UUID REFERENCES organizations(id),
  user_id UUID
);

-- Add variant_id to multi_channel_contents
ALTER TABLE public.multi_channel_contents 
ADD COLUMN brand_voice_variant_id UUID REFERENCES brand_voice_variants(id);

-- Enable RLS
ALTER TABLE public.brand_voice_variants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for brand_voice_variants
CREATE POLICY "Users can view own brand_voice_variants"
ON public.brand_voice_variants
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can view org brand_voice_variants"
ON public.brand_voice_variants
FOR SELECT
USING (organization_id IS NOT NULL AND is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can insert own brand_voice_variants"
ON public.brand_voice_variants
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert org brand_voice_variants"
ON public.brand_voice_variants
FOR INSERT
WITH CHECK (organization_id IS NULL OR is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can update own brand_voice_variants"
ON public.brand_voice_variants
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can update org brand_voice_variants"
ON public.brand_voice_variants
FOR UPDATE
USING (organization_id IS NOT NULL AND is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can delete own brand_voice_variants"
ON public.brand_voice_variants
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Org admins can delete org brand_voice_variants"
ON public.brand_voice_variants
FOR DELETE
USING (organization_id IS NOT NULL AND is_org_admin(auth.uid(), organization_id));

-- Auto update updated_at trigger
CREATE TRIGGER update_brand_voice_variants_updated_at
BEFORE UPDATE ON public.brand_voice_variants
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_updated_at();