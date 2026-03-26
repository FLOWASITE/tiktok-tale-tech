
CREATE POLICY "System admins manage global agent configs"
  ON public.ai_agent_model_configs FOR ALL TO authenticated
  USING (organization_id IS NULL AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can read global agent configs"
  ON public.ai_agent_model_configs FOR SELECT TO authenticated
  USING (organization_id IS NULL);
