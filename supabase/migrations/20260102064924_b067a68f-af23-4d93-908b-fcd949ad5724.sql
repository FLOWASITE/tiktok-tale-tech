-- Add Self-Critique columns to multi_channel_contents
ALTER TABLE multi_channel_contents 
ADD COLUMN IF NOT EXISTS critique_score INTEGER,
ADD COLUMN IF NOT EXISTS critique_details JSONB,
ADD COLUMN IF NOT EXISTS was_refined BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS refinement_count INTEGER DEFAULT 0;

-- Add Self-Critique columns to scripts
ALTER TABLE scripts 
ADD COLUMN IF NOT EXISTS critique_score INTEGER,
ADD COLUMN IF NOT EXISTS critique_details JSONB,
ADD COLUMN IF NOT EXISTS was_refined BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS refinement_count INTEGER DEFAULT 0;

-- Add Self-Critique columns to carousels
ALTER TABLE carousels 
ADD COLUMN IF NOT EXISTS critique_score INTEGER,
ADD COLUMN IF NOT EXISTS critique_details JSONB,
ADD COLUMN IF NOT EXISTS was_refined BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS refinement_count INTEGER DEFAULT 0;

-- Create indexes for filtering by quality score
CREATE INDEX IF NOT EXISTS idx_multichannel_critique_score ON multi_channel_contents(critique_score) WHERE critique_score IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scripts_critique_score ON scripts(critique_score) WHERE critique_score IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_carousels_critique_score ON carousels(critique_score) WHERE critique_score IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN multi_channel_contents.critique_score IS 'Self-critique quality score 0-100';
COMMENT ON COLUMN multi_channel_contents.critique_details IS 'Full critique result including scores, issues, suggestions';
COMMENT ON COLUMN multi_channel_contents.was_refined IS 'Whether content was auto-refined after initial generation';
COMMENT ON COLUMN multi_channel_contents.refinement_count IS 'Number of refinement iterations performed';

COMMENT ON COLUMN scripts.critique_score IS 'Self-critique quality score 0-100';
COMMENT ON COLUMN scripts.critique_details IS 'Full critique result including scores, issues, suggestions';
COMMENT ON COLUMN scripts.was_refined IS 'Whether content was auto-refined after initial generation';
COMMENT ON COLUMN scripts.refinement_count IS 'Number of refinement iterations performed';

COMMENT ON COLUMN carousels.critique_score IS 'Self-critique quality score 0-100';
COMMENT ON COLUMN carousels.critique_details IS 'Full critique result including scores, issues, suggestions';
COMMENT ON COLUMN carousels.was_refined IS 'Whether content was auto-refined after initial generation';
COMMENT ON COLUMN carousels.refinement_count IS 'Number of refinement iterations performed';