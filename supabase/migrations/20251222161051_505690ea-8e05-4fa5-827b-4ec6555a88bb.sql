-- Create approval_logs table to track approval history
CREATE TABLE public.approval_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id UUID NOT NULL REFERENCES public.multi_channel_contents(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('submitted', 'approved', 'rejected')),
  performed_by UUID NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_approval_logs_content_id ON public.approval_logs(content_id);
CREATE INDEX idx_approval_logs_organization_id ON public.approval_logs(organization_id);
CREATE INDEX idx_approval_logs_performed_by ON public.approval_logs(performed_by);

-- Enable Row Level Security
ALTER TABLE public.approval_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view org approval_logs"
ON public.approval_logs
FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can insert org approval_logs"
ON public.approval_logs
FOR INSERT
WITH CHECK (is_org_member(auth.uid(), organization_id));

-- Enable realtime for approval_logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.approval_logs;