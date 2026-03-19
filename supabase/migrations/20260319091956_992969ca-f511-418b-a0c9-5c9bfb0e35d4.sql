-- Add anon read policy for carousel_style_presets
-- Edge functions using service_role already bypass RLS,
-- but this ensures any client context works too
CREATE POLICY "Anyone can read active style presets"
  ON public.carousel_style_presets
  FOR SELECT
  TO anon
  USING (is_active = true);