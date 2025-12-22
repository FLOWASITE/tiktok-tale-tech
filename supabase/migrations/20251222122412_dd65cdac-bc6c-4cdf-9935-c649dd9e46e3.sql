-- Add policy to allow org members to view profiles of other members in the same organization
CREATE POLICY "Org members can view profiles of other members"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om1
    JOIN public.organization_members om2 ON om1.organization_id = om2.organization_id
    WHERE om1.user_id = auth.uid()
      AND om2.user_id = profiles.id
  )
);