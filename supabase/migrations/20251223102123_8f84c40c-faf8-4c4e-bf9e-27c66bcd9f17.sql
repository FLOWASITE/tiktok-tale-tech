-- Add sample_texts column to store channel-specific sample texts
ALTER TABLE public.brand_templates 
ADD COLUMN sample_texts JSONB DEFAULT '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.brand_templates.sample_texts IS 'Stores AI-generated or custom sample texts for each channel, format: {"facebook": "...", "linkedin": "...", ...}';