
-- Agent team permissions table
CREATE TABLE public.agent_team_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  can_create_goals BOOLEAN NOT NULL DEFAULT false,
  can_approve BOOLEAN NOT NULL DEFAULT false,
  can_override BOOLEAN NOT NULL DEFAULT false,
  max_autonomy_level TEXT NOT NULL DEFAULT 'human_in_loop' CHECK (max_autonomy_level IN ('human_in_loop', 'human_on_loop', 'full_auto')),
  monthly_pipeline_limit INT DEFAULT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  granted_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- RLS
ALTER TABLE public.agent_team_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view agent permissions"
  ON public.agent_team_permissions FOR SELECT
  TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Admins can manage agent permissions"
  ON public.agent_team_permissions FOR INSERT
  TO authenticated
  WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Admins can update agent permissions"
  ON public.agent_team_permissions FOR UPDATE
  TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Admins can delete agent permissions"
  ON public.agent_team_permissions FOR DELETE
  TO authenticated
  USING (public.is_org_admin(auth.uid(), organization_id));

-- Updated_at trigger
CREATE TRIGGER update_agent_team_permissions_updated_at
  BEFORE UPDATE ON public.agent_team_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
