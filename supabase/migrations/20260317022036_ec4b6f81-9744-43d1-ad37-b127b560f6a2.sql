
CREATE POLICY "Admins can view all multi_channel_contents"
ON public.multi_channel_contents FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all carousels"
ON public.carousels FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all channel_image_history"
ON public.channel_image_history FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
