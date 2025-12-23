-- Add sample_text column to brand_voice_variants table
ALTER TABLE public.brand_voice_variants 
ADD COLUMN sample_text TEXT;