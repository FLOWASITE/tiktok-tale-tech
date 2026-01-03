-- Add brand_template_id column to social_connections
ALTER TABLE social_connections 
ADD COLUMN brand_template_id UUID REFERENCES brand_templates(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX idx_social_connections_brand ON social_connections(brand_template_id);

-- Update RLS policy to allow access based on brand ownership
CREATE POLICY "Users can view brand social_connections"
ON social_connections FOR SELECT
USING (
  brand_template_id IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM brand_templates bt 
    WHERE bt.id = social_connections.brand_template_id 
    AND (
      bt.user_id = auth.uid() 
      OR (bt.organization_id IS NOT NULL AND is_org_member(auth.uid(), bt.organization_id))
    )
  )
);

CREATE POLICY "Users can insert brand social_connections"
ON social_connections FOR INSERT
WITH CHECK (
  brand_template_id IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM brand_templates bt 
    WHERE bt.id = brand_template_id 
    AND (
      bt.user_id = auth.uid() 
      OR (bt.organization_id IS NOT NULL AND is_org_member(auth.uid(), bt.organization_id))
    )
  )
);

CREATE POLICY "Users can update brand social_connections"
ON social_connections FOR UPDATE
USING (
  brand_template_id IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM brand_templates bt 
    WHERE bt.id = social_connections.brand_template_id 
    AND (
      bt.user_id = auth.uid() 
      OR (bt.organization_id IS NOT NULL AND is_org_member(auth.uid(), bt.organization_id))
    )
  )
);

CREATE POLICY "Users can delete brand social_connections"
ON social_connections FOR DELETE
USING (
  brand_template_id IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM brand_templates bt 
    WHERE bt.id = social_connections.brand_template_id 
    AND (
      bt.user_id = auth.uid() 
      OR (bt.organization_id IS NOT NULL AND is_org_member(auth.uid(), bt.organization_id))
    )
  )
);