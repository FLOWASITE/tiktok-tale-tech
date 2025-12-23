-- Add sample_texts JSONB column to brand_voice_variants table
-- This stores multi-channel sample texts for each variant
ALTER TABLE public.brand_voice_variants 
ADD COLUMN IF NOT EXISTS sample_texts JSONB DEFAULT '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.brand_voice_variants.sample_texts IS 'Stores sample texts for each channel: { "facebook": "...", "linkedin": "...", "instagram": "...", "tiktok": "...", "email": { "subject": "...", "body": "..." } }';