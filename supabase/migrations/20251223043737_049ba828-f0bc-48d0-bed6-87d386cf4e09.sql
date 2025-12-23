-- Add new columns to industry_templates for expanded Industry Memory Pack structure

-- 1. Add metadata column for applies_to and legal_basis
ALTER TABLE industry_templates 
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- 2. Add argument_patterns column for valid and forbidden patterns
ALTER TABLE industry_templates 
ADD COLUMN IF NOT EXISTS argument_patterns jsonb DEFAULT '{}'::jsonb;

-- 3. Add system_rules column for highest priority AI enforcement rules
ALTER TABLE industry_templates 
ADD COLUMN IF NOT EXISTS system_rules jsonb DEFAULT '[]'::jsonb;

-- Add comments to explain the structure
COMMENT ON COLUMN industry_templates.metadata IS 'Extended metadata: { applies_to: string[], legal_basis: string[] }';
COMMENT ON COLUMN industry_templates.argument_patterns IS 'Reasoning patterns: { valid_patterns: string[], forbidden_patterns: string[] }';
COMMENT ON COLUMN industry_templates.system_rules IS 'Highest priority rules for AI enforcement - string[]';