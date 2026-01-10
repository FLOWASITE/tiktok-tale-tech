-- Add columns for multi-step generation metadata
ALTER TABLE core_contents ADD COLUMN IF NOT EXISTS generation_metadata JSONB DEFAULT '{}'::jsonb;
-- Stores: { steps: [...], totalTokens: X, qualityMode: 'balanced', sectionsGenerated: 5 }

ALTER TABLE core_contents ADD COLUMN IF NOT EXISTS outline JSONB DEFAULT NULL;
-- Stores: generated outline for reuse

-- Add index for querying by quality mode
CREATE INDEX IF NOT EXISTS idx_core_contents_quality_mode 
ON core_contents ((generation_metadata->>'qualityMode'));