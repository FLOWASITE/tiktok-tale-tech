
-- Add organization_id to subscriptions for workspace-based billing
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Migrate: assign existing subscriptions to the org owned by the user
UPDATE public.subscriptions s
SET organization_id = (
  SELECT o.id FROM public.organizations o WHERE o.owner_id = s.user_id LIMIT 1
)
WHERE s.organization_id IS NULL;

-- RLS: admins can update all subscriptions (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can update all subscriptions' AND tablename = 'subscriptions'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can update all subscriptions" ON public.subscriptions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), ''admin'')) WITH CHECK (public.has_role(auth.uid(), ''admin''))';
  END IF;
END $$;
