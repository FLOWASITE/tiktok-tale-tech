-- Phase 1: Industry Memory Pack Status & Metadata

-- 1. Create status enum for pack lifecycle
CREATE TYPE industry_pack_status AS ENUM ('draft', 'stable', 'deprecated');

-- 2. Add new columns to industry_templates
ALTER TABLE public.industry_templates 
ADD COLUMN status industry_pack_status NOT NULL DEFAULT 'draft',
ADD COLUMN published_at timestamptz,
ADD COLUMN published_by uuid REFERENCES auth.users(id);

-- 3. Update existing active templates to 'stable' (already in production)
UPDATE public.industry_templates 
SET status = 'stable', published_at = now() 
WHERE is_active = true;

-- 4. Create index for status queries
CREATE INDEX idx_industry_templates_status ON public.industry_templates(status);

-- Phase 2: Create industry_memory_packs view with computed stats
CREATE OR REPLACE VIEW public.industry_memory_packs AS
SELECT 
  it.id,
  it.code,
  itt.name as name,
  itt.short_name,
  c.id as country_id,
  c.code as country_code,
  c.name as country_name,
  c.flag_emoji,
  it.version,
  it.status,
  it.target_audience,
  ic.code as category_code,
  ict.name as category_name,
  ic.color as category_color,
  ic.icon_name as category_icon,
  -- Computed fields for stats
  COALESCE(jsonb_array_length(it.compliance_rules), 0) as compliance_rules_count,
  COALESCE(array_length(it.forbidden_terms, 1), 0) as forbidden_terms_count,
  COALESCE(jsonb_array_length(it.claim_restrictions), 0) as claim_restrictions_count,
  -- Version count from history
  (SELECT COUNT(*)::int FROM public.industry_memory_versions imv WHERE imv.industry_template_id = it.id) as version_count,
  -- Timestamps
  it.published_at,
  it.published_by,
  it.created_at,
  it.updated_at,
  it.is_active
FROM public.industry_templates it
JOIN public.countries c ON it.country_id = c.id
LEFT JOIN public.industry_template_translations itt 
  ON it.id = itt.industry_template_id AND itt.language_code = c.default_language
LEFT JOIN public.industry_categories ic ON it.category_id = ic.id
LEFT JOIN public.industry_category_translations ict 
  ON ic.id = ict.category_id AND ict.language_code = c.default_language;

-- Grant access to the view
GRANT SELECT ON public.industry_memory_packs TO authenticated;
GRANT SELECT ON public.industry_memory_packs TO anon;