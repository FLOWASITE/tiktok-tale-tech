-- =====================================================
-- INDUSTRY MEMORY ACTIVATION: Phase 1.1 - Database Schema (Fixed)
-- =====================================================

-- 1. Add Industry Memory tracking to carousels
ALTER TABLE public.carousels 
  ADD COLUMN IF NOT EXISTS industry_template_id uuid REFERENCES public.industry_templates(id),
  ADD COLUMN IF NOT EXISTS industry_template_version text;

-- 2. Add Industry Memory tracking to scripts
ALTER TABLE public.scripts 
  ADD COLUMN IF NOT EXISTS industry_template_id uuid REFERENCES public.industry_templates(id),
  ADD COLUMN IF NOT EXISTS industry_template_version text;

-- 3. Add industry_template_version to multi_channel_contents (industry_template_id already exists)
ALTER TABLE public.multi_channel_contents 
  ADD COLUMN IF NOT EXISTS industry_template_version text;

-- 4. Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_brand_templates_industry_template_id 
  ON public.brand_templates(industry_template_id);

CREATE INDEX IF NOT EXISTS idx_carousels_industry_template_id 
  ON public.carousels(industry_template_id) 
  WHERE industry_template_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_scripts_industry_template_id 
  ON public.scripts(industry_template_id) 
  WHERE industry_template_id IS NOT NULL;