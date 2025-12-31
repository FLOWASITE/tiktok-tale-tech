-- Add brand_voice_variant_id to scripts for A/B testing tracking
ALTER TABLE public.scripts 
ADD COLUMN IF NOT EXISTS brand_voice_variant_id uuid REFERENCES public.brand_voice_variants(id) ON DELETE SET NULL;

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_scripts_variant ON public.scripts(brand_voice_variant_id) WHERE brand_voice_variant_id IS NOT NULL;