-- AI Provider Configurations table
CREATE TABLE public.ai_provider_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider_type TEXT NOT NULL CHECK (provider_type IN ('lovable', 'perplexity', 'firecrawl', 'openai', 'anthropic', 'gemini', 'replicate', 'custom')),
  display_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  api_key_secret_name TEXT,
  base_url TEXT,
  default_model TEXT,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- AI Function Configurations table
CREATE TABLE public.ai_function_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  function_name TEXT NOT NULL,
  provider_config_id UUID REFERENCES public.ai_provider_configs(id) ON DELETE SET NULL,
  model_override TEXT,
  parameters JSONB DEFAULT '{}',
  is_enabled BOOLEAN DEFAULT true,
  cache_ttl_hours INTEGER DEFAULT 24,
  priority_level TEXT DEFAULT 'normal' CHECK (priority_level IN ('low', 'normal', 'high')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, function_name)
);

-- Enable RLS
ALTER TABLE public.ai_provider_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_function_configs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_provider_configs
CREATE POLICY "Users can view own org providers" ON public.ai_provider_configs
  FOR SELECT USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can manage providers" ON public.ai_provider_configs
  FOR ALL USING (is_org_admin(auth.uid(), organization_id))
  WITH CHECK (is_org_admin(auth.uid(), organization_id));

-- RLS Policies for ai_function_configs
CREATE POLICY "Users can view own org function configs" ON public.ai_function_configs
  FOR SELECT USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can manage function configs" ON public.ai_function_configs
  FOR ALL USING (is_org_admin(auth.uid(), organization_id))
  WITH CHECK (is_org_admin(auth.uid(), organization_id));

-- System admin can view all
CREATE POLICY "Admins can view all providers" ON public.ai_provider_configs
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all providers" ON public.ai_provider_configs
  FOR ALL USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all function configs" ON public.ai_function_configs
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all function configs" ON public.ai_function_configs
  FOR ALL USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Triggers for updated_at
CREATE TRIGGER trigger_ai_provider_configs_updated_at
  BEFORE UPDATE ON public.ai_provider_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

CREATE TRIGGER trigger_ai_function_configs_updated_at
  BEFORE UPDATE ON public.ai_function_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();