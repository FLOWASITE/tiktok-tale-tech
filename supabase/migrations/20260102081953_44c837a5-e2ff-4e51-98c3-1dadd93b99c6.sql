-- Add needs_manual_review column to content tables
ALTER TABLE multi_channel_contents 
  ADD COLUMN IF NOT EXISTS needs_manual_review BOOLEAN DEFAULT false;

ALTER TABLE scripts 
  ADD COLUMN IF NOT EXISTS needs_manual_review BOOLEAN DEFAULT false;

ALTER TABLE carousels 
  ADD COLUMN IF NOT EXISTS needs_manual_review BOOLEAN DEFAULT false;

-- Create index for filtering content needing review
CREATE INDEX IF NOT EXISTS idx_multichannel_needs_review 
  ON multi_channel_contents(needs_manual_review) 
  WHERE needs_manual_review = true;

CREATE INDEX IF NOT EXISTS idx_scripts_needs_review 
  ON scripts(needs_manual_review) 
  WHERE needs_manual_review = true;

CREATE INDEX IF NOT EXISTS idx_carousels_needs_review 
  ON carousels(needs_manual_review) 
  WHERE needs_manual_review = true;