CREATE POLICY "Admins can view all brand_templates"
ON public.brand_templates FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));