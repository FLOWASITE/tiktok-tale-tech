-- Phase 1: Add analysis cache columns to scripts table
ALTER TABLE scripts ADD COLUMN IF NOT EXISTS analysis_cache JSONB;
ALTER TABLE scripts ADD COLUMN IF NOT EXISTS analyzed_at TIMESTAMPTZ;

-- Add index for faster queries on analyzed scripts
CREATE INDEX IF NOT EXISTS idx_scripts_analyzed_at ON scripts(analyzed_at) WHERE analyzed_at IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN scripts.analysis_cache IS 'Cached script analysis results from analyze-script function (hookScore, clarityScore, viralPotential, etc.)';
COMMENT ON COLUMN scripts.analyzed_at IS 'Timestamp when the script was last analyzed';