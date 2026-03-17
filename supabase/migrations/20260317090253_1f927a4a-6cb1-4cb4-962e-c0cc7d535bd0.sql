
-- Allow admins to view all scripts
CREATE POLICY "Admins can view all scripts"
ON public.scripts FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all carousel_images
CREATE POLICY "Admins can view all carousel_images"
ON public.carousel_images FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
