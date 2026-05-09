-- Optimize SELECT RLS on multi_channel_contents to use initplan-cached auth.uid()
DROP POLICY IF EXISTS "Users can view own multi_channel_contents" ON public.multi_channel_contents;
DROP POLICY IF EXISTS "Users can view org multi_channel_contents" ON public.multi_channel_contents;
DROP POLICY IF EXISTS "Admins can view all multi_channel_contents" ON public.multi_channel_contents;

CREATE POLICY "mcc_select_unified"
ON public.multi_channel_contents
FOR SELECT
TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR (
    organization_id IS NOT NULL
    AND is_org_member((SELECT auth.uid()), organization_id)
  )
  OR has_role((SELECT auth.uid()), 'admin'::app_role)
);