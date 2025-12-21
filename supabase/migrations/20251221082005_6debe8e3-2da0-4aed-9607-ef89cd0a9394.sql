-- Add Brand Voice Profile columns to brand_templates
ALTER TABLE public.brand_templates
ADD COLUMN brand_positioning TEXT,
ADD COLUMN tone_of_voice TEXT[],
ADD COLUMN formality_level TEXT,
ADD COLUMN language_style TEXT[],
ADD COLUMN preferred_words TEXT[],
ADD COLUMN forbidden_words TEXT[],
ADD COLUMN allow_emoji BOOLEAN DEFAULT true,
ADD COLUMN compliance_rules TEXT[];