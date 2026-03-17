
DROP POLICY IF EXISTS "Users can view own subscription" ON subscriptions;

CREATE POLICY "Org members can view subscription"
ON subscriptions FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid()
  )
);
