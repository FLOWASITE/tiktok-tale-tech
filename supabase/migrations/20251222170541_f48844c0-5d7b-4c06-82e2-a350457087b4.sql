-- Add use_specific_approvers column to organizations table
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS use_specific_approvers BOOLEAN DEFAULT false;

-- Create approval_assignments table
CREATE TABLE public.approval_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  approver_id UUID NOT NULL,
  creator_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  UNIQUE(organization_id, approver_id, creator_id)
);

-- Enable RLS
ALTER TABLE public.approval_assignments ENABLE ROW LEVEL SECURITY;

-- RLS policy: Org admins can manage all assignments
CREATE POLICY "Org admins can manage approval_assignments"
  ON public.approval_assignments
  FOR ALL
  USING (is_org_admin(auth.uid(), organization_id))
  WITH CHECK (is_org_admin(auth.uid(), organization_id));

-- RLS policy: Org members can view assignments
CREATE POLICY "Org members can view approval_assignments"
  ON public.approval_assignments
  FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));