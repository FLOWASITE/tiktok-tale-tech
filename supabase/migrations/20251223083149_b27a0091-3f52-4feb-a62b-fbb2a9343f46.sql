-- Fix INSERT RLS for brand_templates to support scope: personal / organization / both
-- Drop existing INSERT policies that can conflict (especially if they were created as RESTRICTIVE)
DROP POLICY IF EXISTS "Users can insert org brand_templates" ON public.brand_templates;
DROP POLICY IF EXISTS "Users can insert own brand_templates" ON public.brand_templates;

-- Create a single PERMISSIVE policy for inserts
CREATE POLICY "Users can insert brand_templates"
ON public.brand_templates
FOR INSERT
TO authenticated
WITH CHECK (
  -- Personal-only template
  (
    organization_id IS NULL
    AND user_id = auth.uid()
  )
  OR
  -- Organization template (optionally also linked to the creator as user_id)
  (
    organization_id IS NOT NULL
    AND public.is_org_member(auth.uid(), organization_id)
    AND (user_id IS NULL OR user_id = auth.uid())
  )
);
