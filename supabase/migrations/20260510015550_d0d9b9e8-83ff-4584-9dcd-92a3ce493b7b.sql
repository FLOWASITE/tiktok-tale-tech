ALTER TABLE public.brand_templates
ADD COLUMN IF NOT EXISTS imported_from JSONB;

COMMENT ON COLUMN public.brand_templates.imported_from IS
'Audit metadata when brand was enriched via import. Shape: { source: "website"|"fanpage", url|page_id, imported_at, applied_fields: string[] }';