-- ============================================================
-- PHASE 1: Industry Memory by Country - Database Schema
-- ============================================================

-- 1. Create countries table
CREATE TABLE public.countries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  native_name TEXT,
  default_language TEXT NOT NULL DEFAULT 'vi',
  flag_emoji TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add comment
COMMENT ON TABLE public.countries IS 'Countries for Industry Memory localization';

-- Create index for active countries
CREATE INDEX idx_countries_active ON public.countries(is_active, sort_order);

-- Enable RLS
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Public SELECT, Admin ALL
CREATE POLICY "Anyone can view active countries"
  ON public.countries FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage countries"
  ON public.countries FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- 2. Create industry_categories table
CREATE TABLE public.industry_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  icon_name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.industry_categories IS 'Categories grouping related industries';

CREATE INDEX idx_industry_categories_active ON public.industry_categories(is_active, sort_order);

ALTER TABLE public.industry_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active industry categories"
  ON public.industry_categories FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage industry categories"
  ON public.industry_categories FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- 3. Create industry_category_translations table
CREATE TABLE public.industry_category_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.industry_categories(id) ON DELETE CASCADE,
  language_code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(category_id, language_code)
);

COMMENT ON TABLE public.industry_category_translations IS 'Translations for industry categories';

CREATE INDEX idx_category_translations_lookup ON public.industry_category_translations(category_id, language_code);

ALTER TABLE public.industry_category_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view category translations"
  ON public.industry_category_translations FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage category translations"
  ON public.industry_category_translations FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- 4. Create industry_templates table (core)
CREATE TABLE public.industry_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id UUID NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.industry_categories(id) ON DELETE SET NULL,
  code TEXT NOT NULL,
  target_audience TEXT NOT NULL DEFAULT 'B2B' CHECK (target_audience IN ('B2B', 'B2C', 'both')),
  
  -- Brand Voice Settings (JSONB for flexibility)
  brand_voice JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Example structure:
  -- {
  --   "tone_of_voice": ["professional", "authoritative"],
  --   "formality_level": "formal",
  --   "language_style": ["simple", "direct"],
  --   "allow_emoji": false
  -- }
  
  -- Channel-specific overrides
  channel_settings JSONB DEFAULT '{}'::jsonb,
  
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(country_id, code)
);

COMMENT ON TABLE public.industry_templates IS 'Industry-specific brand voice templates by country';

CREATE INDEX idx_industry_templates_country ON public.industry_templates(country_id, is_active);
CREATE INDEX idx_industry_templates_category ON public.industry_templates(category_id);
CREATE INDEX idx_industry_templates_lookup ON public.industry_templates(country_id, code);

ALTER TABLE public.industry_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active industry templates"
  ON public.industry_templates FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage industry templates"
  ON public.industry_templates FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- 5. Create industry_template_translations table
CREATE TABLE public.industry_template_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  industry_template_id UUID NOT NULL REFERENCES public.industry_templates(id) ON DELETE CASCADE,
  language_code TEXT NOT NULL,
  name TEXT NOT NULL,
  short_name TEXT,
  brand_positioning TEXT,
  preferred_words TEXT[] DEFAULT '{}',
  forbidden_words TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(industry_template_id, language_code)
);

COMMENT ON TABLE public.industry_template_translations IS 'Translations for industry templates including localized words';

CREATE INDEX idx_template_translations_lookup ON public.industry_template_translations(industry_template_id, language_code);

ALTER TABLE public.industry_template_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view template translations"
  ON public.industry_template_translations FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage template translations"
  ON public.industry_template_translations FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- 6. Update brand_templates table with country support
ALTER TABLE public.brand_templates 
  ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT 'VN',
  ADD COLUMN IF NOT EXISTS industry_template_id UUID REFERENCES public.industry_templates(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_brand_templates_country ON public.brand_templates(country_code);
CREATE INDEX IF NOT EXISTS idx_brand_templates_industry_template ON public.brand_templates(industry_template_id);

-- 7. Create updated_at triggers
CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER set_countries_updated_at
  BEFORE UPDATE ON public.countries
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

CREATE TRIGGER set_industry_categories_updated_at
  BEFORE UPDATE ON public.industry_categories
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

CREATE TRIGGER set_category_translations_updated_at
  BEFORE UPDATE ON public.industry_category_translations
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

CREATE TRIGGER set_industry_templates_updated_at
  BEFORE UPDATE ON public.industry_templates
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

CREATE TRIGGER set_template_translations_updated_at
  BEFORE UPDATE ON public.industry_template_translations
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();