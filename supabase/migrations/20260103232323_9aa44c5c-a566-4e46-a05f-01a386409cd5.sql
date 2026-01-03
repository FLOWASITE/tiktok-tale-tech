-- Create table for per-channel AI model configurations
CREATE TABLE public.ai_channel_model_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  model_override TEXT,
  temperature NUMERIC(3,2) DEFAULT 0.7,
  max_tokens INTEGER,
  is_enabled BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partial indexes for global vs org-specific configs
CREATE UNIQUE INDEX ai_channel_model_configs_global_unique 
  ON public.ai_channel_model_configs (channel) 
  WHERE organization_id IS NULL;

CREATE UNIQUE INDEX ai_channel_model_configs_org_unique 
  ON public.ai_channel_model_configs (organization_id, channel) 
  WHERE organization_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.ai_channel_model_configs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage all channel model configs"
  ON public.ai_channel_model_configs FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Org admins can manage org channel model configs"
  ON public.ai_channel_model_configs FOR ALL
  USING (is_org_admin(auth.uid(), organization_id))
  WITH CHECK (is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Users can view org channel model configs"
  ON public.ai_channel_model_configs FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

-- Trigger for updated_at
CREATE TRIGGER update_ai_channel_model_configs_updated_at
  BEFORE UPDATE ON public.ai_channel_model_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();