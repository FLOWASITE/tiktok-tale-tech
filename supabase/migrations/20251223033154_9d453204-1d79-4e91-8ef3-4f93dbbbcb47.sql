-- Fix Security Definer View issue by recreating with SECURITY INVOKER
DROP VIEW IF EXISTS public.industry_memory_packs;

CREATE VIEW public.industry_memory_packs 
WITH (security_invoker = true) AS
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