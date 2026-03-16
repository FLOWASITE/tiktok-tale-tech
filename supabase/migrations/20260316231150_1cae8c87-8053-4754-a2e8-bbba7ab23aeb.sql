
-- Admin can view all organizations
CREATE POLICY "Admin can view all organizations"
ON public.organizations FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can update organizations
CREATE POLICY "Admin can update organizations"
ON public.organizations FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can delete organizations
CREATE POLICY "Admin can delete organizations"
ON public.organizations FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can view all organization members
CREATE POLICY "Admin can view all org members"
ON public.organization_members FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can insert org members
CREATE POLICY "Admin can insert org members"
ON public.organization_members FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admin can update org members
CREATE POLICY "Admin can update org members"
ON public.organization_members FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can delete org members
CREATE POLICY "Admin can delete org members"
ON public.organization_members FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
