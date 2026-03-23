
-- Drop enums if they were partially created
DROP TYPE IF EXISTS public.agent_pipeline_stage;
DROP TYPE IF EXISTS public.agent_autonomy_level;
DROP TYPE IF EXISTS public.agent_priority;
DROP TYPE IF EXISTS public.agent_approval_status;

-- Create enums
CREATE TYPE public.agent_pipeline_stage AS ENUM (
  'research', 'creation', 'optimization', 'expansion', 'compliance', 'approval', 'scheduled', 'published', 'analyzing'
);
CREATE TYPE public.agent_autonomy_level AS ENUM (
  'human_in_loop', 'human_on_loop', 'full_auto'
);
CREATE TYPE public.agent_priority AS ENUM (
  'low', 'normal', 'high', 'urgent'
);
CREATE TYPE public.agent_approval_status AS ENUM (
  'pending', 'approved', 'rejected', 'edited'
);

-- 1. agent_goals
CREATE TABLE public.agent_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  target_topics TEXT[] DEFAULT '{}',
  target_channels TEXT[] DEFAULT '{}',
  frequency JSONB DEFAULT '{}',
  autonomy_level public.agent_autonomy_level NOT NULL DEFAULT 'human_in_loop',
  brand_template_id UUID REFERENCES public.brand_templates(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_paused BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. agent_pipelines
CREATE TABLE public.agent_pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES public.agent_goals(id) ON DELETE SET NULL,
  content_title TEXT NOT NULL,
  content_topic TEXT,
  current_stage public.agent_pipeline_stage NOT NULL DEFAULT 'research',
  pipeline_state JSONB DEFAULT '{}',
  priority public.agent_priority NOT NULL DEFAULT 'normal',
  autonomy_level public.agent_autonomy_level NOT NULL DEFAULT 'human_in_loop',
  is_flagged BOOLEAN NOT NULL DEFAULT false,
  flag_reason TEXT,
  content_id UUID REFERENCES public.multi_channel_contents(id) ON DELETE SET NULL,
  estimated_completion TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. agent_pipeline_logs
CREATE TABLE public.agent_pipeline_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID NOT NULL REFERENCES public.agent_pipelines(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  action TEXT NOT NULL,
  input_summary TEXT,
  output_summary TEXT,
  tokens_used INTEGER DEFAULT 0,
  cost_usd NUMERIC(10,6) DEFAULT 0,
  duration_ms INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. agent_approvals
CREATE TABLE public.agent_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID NOT NULL REFERENCES public.agent_pipelines(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  content_preview TEXT,
  channel_versions JSONB DEFAULT '{}',
  scores JSONB DEFAULT '{}',
  status public.agent_approval_status NOT NULL DEFAULT 'pending',
  reviewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewer_notes TEXT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_agent_goals_org ON public.agent_goals(organization_id);
CREATE INDEX idx_agent_goals_active ON public.agent_goals(organization_id, is_active) WHERE is_active = true;
CREATE INDEX idx_agent_pipelines_org ON public.agent_pipelines(organization_id);
CREATE INDEX idx_agent_pipelines_goal ON public.agent_pipelines(goal_id);
CREATE INDEX idx_agent_pipelines_stage ON public.agent_pipelines(organization_id, current_stage);
CREATE INDEX idx_agent_pipeline_logs_pipeline ON public.agent_pipeline_logs(pipeline_id);
CREATE INDEX idx_agent_approvals_org ON public.agent_approvals(organization_id);
CREATE INDEX idx_agent_approvals_pending ON public.agent_approvals(organization_id, status) WHERE status = 'pending';

-- Updated_at triggers
CREATE TRIGGER update_agent_goals_updated_at BEFORE UPDATE ON public.agent_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_agent_pipelines_updated_at BEFORE UPDATE ON public.agent_pipelines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.agent_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_pipeline_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view org goals" ON public.agent_goals FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Members can insert org goals" ON public.agent_goals FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Members can update org goals" ON public.agent_goals FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Members can delete org goals" ON public.agent_goals FOR DELETE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Members can view org pipelines" ON public.agent_pipelines FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Members can insert org pipelines" ON public.agent_pipelines FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Members can update org pipelines" ON public.agent_pipelines FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Members can delete org pipelines" ON public.agent_pipelines FOR DELETE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Members can view pipeline logs" ON public.agent_pipeline_logs FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.agent_pipelines p WHERE p.id = pipeline_id AND public.is_org_member(auth.uid(), p.organization_id))
);
CREATE POLICY "Members can insert pipeline logs" ON public.agent_pipeline_logs FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.agent_pipelines p WHERE p.id = pipeline_id AND public.is_org_member(auth.uid(), p.organization_id))
);

CREATE POLICY "Members can view org approvals" ON public.agent_approvals FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Members can insert org approvals" ON public.agent_approvals FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Members can update org approvals" ON public.agent_approvals FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_pipelines;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_approvals;
