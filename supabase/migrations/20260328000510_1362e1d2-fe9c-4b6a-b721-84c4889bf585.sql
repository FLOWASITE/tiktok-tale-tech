
CREATE TABLE public.ai_function_group_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  function_type TEXT NOT NULL,
  model_override TEXT,
  force_provider TEXT,
  temperature NUMERIC,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, function_type)
);

ALTER TABLE public.ai_function_group_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage group configs"
  ON public.ai_function_group_configs
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER update_ai_function_group_configs_updated_at
  BEFORE UPDATE ON public.ai_function_group_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
