-- =============================================
-- PHASE 3A: Industry Glossary Schema
-- =============================================

-- 1. Create industry_glossary table
CREATE TABLE public.industry_glossary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  industry_template_id UUID NOT NULL REFERENCES public.industry_templates(id) ON DELETE CASCADE,
  term TEXT NOT NULL,
  abbreviation TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  is_preferred BOOLEAN NOT NULL DEFAULT true,
  related_terms TEXT[] DEFAULT '{}',
  usage_context TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure unique term per industry
  UNIQUE(industry_template_id, term)
);

-- 2. Create industry_glossary_translations table
CREATE TABLE public.industry_glossary_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  glossary_id UUID NOT NULL REFERENCES public.industry_glossary(id) ON DELETE CASCADE,
  language_code TEXT NOT NULL DEFAULT 'vi',
  definition TEXT NOT NULL,
  example_usage TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure unique language per glossary term
  UNIQUE(glossary_id, language_code)
);

-- 3. Create indexes for performance
CREATE INDEX idx_industry_glossary_template ON public.industry_glossary(industry_template_id);
CREATE INDEX idx_industry_glossary_category ON public.industry_glossary(category);
CREATE INDEX idx_industry_glossary_term ON public.industry_glossary(term);
CREATE INDEX idx_industry_glossary_active ON public.industry_glossary(is_active) WHERE is_active = true;
CREATE INDEX idx_glossary_translations_glossary ON public.industry_glossary_translations(glossary_id);
CREATE INDEX idx_glossary_translations_language ON public.industry_glossary_translations(language_code);

-- 4. Create updated_at triggers
CREATE TRIGGER update_industry_glossary_updated_at
  BEFORE UPDATE ON public.industry_glossary
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_glossary_translations_updated_at
  BEFORE UPDATE ON public.industry_glossary_translations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Enable RLS
ALTER TABLE public.industry_glossary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.industry_glossary_translations ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for industry_glossary

-- Admins can manage all glossary terms
CREATE POLICY "Admins can manage industry glossary"
  ON public.industry_glossary
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Anyone can view active glossary terms for active industry templates
CREATE POLICY "Anyone can view active glossary terms"
  ON public.industry_glossary
  FOR SELECT
  USING (
    is_active = true 
    AND EXISTS (
      SELECT 1 FROM public.industry_templates it
      WHERE it.id = industry_template_id
        AND it.is_active = true
        AND it.deleted_at IS NULL
    )
  );

-- 7. RLS Policies for industry_glossary_translations

-- Admins can manage all translations
CREATE POLICY "Admins can manage glossary translations"
  ON public.industry_glossary_translations
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Anyone can view translations for active glossary terms
CREATE POLICY "Anyone can view glossary translations"
  ON public.industry_glossary_translations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.industry_glossary ig
      JOIN public.industry_templates it ON it.id = ig.industry_template_id
      WHERE ig.id = glossary_id
        AND ig.is_active = true
        AND it.is_active = true
        AND it.deleted_at IS NULL
    )
  );

-- 8. Add comments for documentation
COMMENT ON TABLE public.industry_glossary IS 'Industry-specific glossary terms with definitions and usage guidelines';
COMMENT ON TABLE public.industry_glossary_translations IS 'Multi-language translations for glossary terms';
COMMENT ON COLUMN public.industry_glossary.term IS 'The glossary term or phrase';
COMMENT ON COLUMN public.industry_glossary.abbreviation IS 'Common abbreviation if applicable (e.g., FDA, IELTS)';
COMMENT ON COLUMN public.industry_glossary.category IS 'Category: general, legal, technical, process, document, certification';
COMMENT ON COLUMN public.industry_glossary.is_preferred IS 'Whether this is the preferred term to use in content';
COMMENT ON COLUMN public.industry_glossary.related_terms IS 'Array of related or synonym terms';
COMMENT ON COLUMN public.industry_glossary.usage_context IS 'When and how to use this term';