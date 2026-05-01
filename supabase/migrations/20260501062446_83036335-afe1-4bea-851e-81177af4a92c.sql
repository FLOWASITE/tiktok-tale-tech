ALTER TABLE public.brand_templates
ADD COLUMN IF NOT EXISTS voice_variants jsonb NOT NULL DEFAULT '[]'::jsonb;