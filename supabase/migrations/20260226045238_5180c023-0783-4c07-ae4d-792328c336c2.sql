
-- Sprint 10 Phase 2: Fix remaining ERROR findings

-- 1. ai_provider_configs: Restrict SELECT to org admins only (not all members)
DROP POLICY IF EXISTS "Users can view own org providers" ON public.ai_provider_configs;
CREATE POLICY "Org admins can view providers"
ON public.ai_provider_configs FOR SELECT TO authenticated
USING (is_org_admin(auth.uid(), organization_id));

-- Also restrict other policies to authenticated
DROP POLICY IF EXISTS "Admins can manage all providers" ON public.ai_provider_configs;
CREATE POLICY "Admins can manage all providers"
ON public.ai_provider_configs FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can view all providers" ON public.ai_provider_configs;
CREATE POLICY "Admins can view all providers"
ON public.ai_provider_configs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Org admins can manage providers" ON public.ai_provider_configs;
CREATE POLICY "Org admins can manage providers"
ON public.ai_provider_configs FOR ALL TO authenticated
USING (is_org_admin(auth.uid(), organization_id))
WITH CHECK (is_org_admin(auth.uid(), organization_id));

-- 2. social_connections: Restrict to admin/owner only (tokens are sensitive)
DROP POLICY IF EXISTS "Users can view org social_connections" ON public.social_connections;
CREATE POLICY "Org admins can view org social_connections"
ON public.social_connections FOR SELECT TO authenticated
USING (
  (organization_id IS NOT NULL) AND is_org_admin(auth.uid(), organization_id)
);

DROP POLICY IF EXISTS "Users can view brand social_connections" ON public.social_connections;
CREATE POLICY "Admins or owners can view brand social_connections"
ON public.social_connections FOR SELECT TO authenticated
USING (
  (brand_template_id IS NOT NULL) AND (
    EXISTS (
      SELECT 1 FROM brand_templates bt
      WHERE bt.id = social_connections.brand_template_id
      AND (bt.user_id = auth.uid() OR (bt.organization_id IS NOT NULL AND is_org_admin(auth.uid(), bt.organization_id)))
    )
  )
);

DROP POLICY IF EXISTS "Users can update org social_connections" ON public.social_connections;
CREATE POLICY "Org admins can update org social_connections"
ON public.social_connections FOR UPDATE TO authenticated
USING (
  (organization_id IS NOT NULL) AND is_org_admin(auth.uid(), organization_id)
);

DROP POLICY IF EXISTS "Users can update brand social_connections" ON public.social_connections;
CREATE POLICY "Admins or owners can update brand social_connections"
ON public.social_connections FOR UPDATE TO authenticated
USING (
  (brand_template_id IS NOT NULL) AND (
    EXISTS (
      SELECT 1 FROM brand_templates bt
      WHERE bt.id = social_connections.brand_template_id
      AND (bt.user_id = auth.uid() OR (bt.organization_id IS NOT NULL AND is_org_admin(auth.uid(), bt.organization_id)))
    )
  )
);

DROP POLICY IF EXISTS "Users can insert org social_connections" ON public.social_connections;
CREATE POLICY "Org admins can insert org social_connections"
ON public.social_connections FOR INSERT TO authenticated
WITH CHECK (
  (organization_id IS NOT NULL) AND is_org_admin(auth.uid(), organization_id)
);

DROP POLICY IF EXISTS "Users can insert brand social_connections" ON public.social_connections;
CREATE POLICY "Admins or owners can insert brand social_connections"
ON public.social_connections FOR INSERT TO authenticated
WITH CHECK (
  (brand_template_id IS NOT NULL) AND (
    EXISTS (
      SELECT 1 FROM brand_templates bt
      WHERE bt.id = social_connections.brand_template_id
      AND (bt.user_id = auth.uid() OR (bt.organization_id IS NOT NULL AND is_org_admin(auth.uid(), bt.organization_id)))
    )
  )
);

DROP POLICY IF EXISTS "Org admins can delete social_connections" ON public.social_connections;
CREATE POLICY "Org admins can delete social_connections"
ON public.social_connections FOR DELETE TO authenticated
USING (
  (organization_id IS NOT NULL) AND is_org_admin(auth.uid(), organization_id)
);

DROP POLICY IF EXISTS "Users can delete brand social_connections" ON public.social_connections;
CREATE POLICY "Admins or owners can delete brand social_connections"
ON public.social_connections FOR DELETE TO authenticated
USING (
  (brand_template_id IS NOT NULL) AND (
    EXISTS (
      SELECT 1 FROM brand_templates bt
      WHERE bt.id = social_connections.brand_template_id
      AND (bt.user_id = auth.uid() OR (bt.organization_id IS NOT NULL AND is_org_admin(auth.uid(), bt.organization_id)))
    )
  )
);

-- Service role access for edge functions
CREATE POLICY "Service role full access social_connections"
ON public.social_connections FOR ALL TO service_role
USING (true) WITH CHECK (true);
