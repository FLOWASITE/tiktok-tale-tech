-- Add content_role column to multi_channel_contents for Content Orchestration Flow
-- Role determines the content's purpose: seed (awareness), sprout (trust), harvest (conversion)

ALTER TABLE multi_channel_contents 
ADD COLUMN content_role text CHECK (content_role IN ('seed', 'sprout', 'harvest'));

-- Add index for filtering by role
CREATE INDEX idx_multi_channel_contents_content_role ON multi_channel_contents(content_role);

-- Add comment for documentation
COMMENT ON COLUMN multi_channel_contents.content_role IS 
  'Content role in orchestration flow: seed (awareness), sprout (trust building), harvest (conversion)';