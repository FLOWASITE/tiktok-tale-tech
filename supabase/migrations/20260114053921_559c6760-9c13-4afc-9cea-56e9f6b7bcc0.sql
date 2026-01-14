-- Add target industry columns to regulation_sources
ALTER TABLE regulation_sources 
ADD COLUMN IF NOT EXISTS target_industry_category_ids UUID[] DEFAULT '{}';

ALTER TABLE regulation_sources 
ADD COLUMN IF NOT EXISTS target_industry_pack_ids UUID[] DEFAULT '{}';

-- Add comments for clarity
COMMENT ON COLUMN regulation_sources.target_industry_category_ids IS 
  'Array of industry_categories IDs that regulations from this source should be linked to';

COMMENT ON COLUMN regulation_sources.target_industry_pack_ids IS 
  'Array of specific industry_global_packs IDs for fine-grained targeting (optional)';