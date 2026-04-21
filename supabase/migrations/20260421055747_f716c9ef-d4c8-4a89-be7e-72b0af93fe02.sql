CREATE POLICY "Anyone authenticated can read default bot meta"
  ON public.telegram_bot_configs
  FOR SELECT
  TO authenticated
  USING (organization_id IS NULL AND is_default = true AND is_active = true);