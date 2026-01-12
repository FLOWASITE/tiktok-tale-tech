-- Phase 1: Schema Enhancement for Industry Hierarchy
-- Add parent-child relationship support for 72 Core + 360 Sub-Industries

-- 1.1: Add parent_pack_id column for sub-industry linkage
ALTER TABLE industry_global_packs 
ADD COLUMN IF NOT EXISTS parent_pack_id UUID REFERENCES industry_global_packs(id) ON DELETE SET NULL;

-- 1.2: Add industry_level to distinguish core vs sub industries
ALTER TABLE industry_global_packs 
ADD COLUMN IF NOT EXISTS industry_level VARCHAR(20) DEFAULT 'core';

-- 1.3: Add sort_order for UI ordering within category/parent
ALTER TABLE industry_global_packs 
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- 1.4: Create index for fast parent-child queries
CREATE INDEX IF NOT EXISTS idx_industry_packs_parent 
ON industry_global_packs(parent_pack_id);

-- 1.5: Create index for level filtering
CREATE INDEX IF NOT EXISTS idx_industry_packs_level 
ON industry_global_packs(industry_level);

-- 1.6: Create composite index for hierarchical queries
CREATE INDEX IF NOT EXISTS idx_industry_packs_hierarchy 
ON industry_global_packs(category_id, industry_level, sort_order);

-- 1.7: Add constraint for industry_level values
ALTER TABLE industry_global_packs 
ADD CONSTRAINT chk_industry_level 
CHECK (industry_level IN ('core', 'sub'));

-- 1.8: Ensure sub-industries cannot be parents (prevent deep nesting)
CREATE OR REPLACE FUNCTION check_parent_is_core()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_pack_id IS NOT NULL THEN
    -- Check that parent exists and is a core industry
    IF NOT EXISTS (
      SELECT 1 FROM industry_global_packs 
      WHERE id = NEW.parent_pack_id 
      AND industry_level = 'core'
    ) THEN
      RAISE EXCEPTION 'Parent pack must be a core industry';
    END IF;
    -- Force sub level when parent is set
    NEW.industry_level := 'sub';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1.9: Create trigger
DROP TRIGGER IF EXISTS trg_check_parent_is_core ON industry_global_packs;
CREATE TRIGGER trg_check_parent_is_core
BEFORE INSERT OR UPDATE ON industry_global_packs
FOR EACH ROW
EXECUTE FUNCTION check_parent_is_core();

-- 1.10: Update existing packs to be 'core' level
UPDATE industry_global_packs 
SET industry_level = 'core', sort_order = 0 
WHERE industry_level IS NULL OR industry_level = '';