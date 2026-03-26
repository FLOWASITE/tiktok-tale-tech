
CREATE TABLE public.ai_agent_model_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  model_override TEXT,
  temperature NUMERIC DEFAULT 0.7,
  max_tokens INTEGER,
  is_enabled BOOLEAN DEFAULT true,
  quality_mode TEXT DEFAULT 'balanced',
  fallback_model TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, agent_name)
);

ALTER TABLE public.ai_agent_model_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins manage agent configs"
  ON public.ai_agent_model_configs FOR ALL TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org members can read agent configs"
  ON public.ai_agent_model_configs FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE TRIGGER update_ai_agent_model_configs_updated_at
  BEFORE UPDATE ON public.ai_agent_model_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
