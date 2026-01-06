-- Create table for tracking dismissed KPI adjustment suggestions
CREATE TABLE public.kpi_adjustment_dismissals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  metric TEXT NOT NULL,
  dismissed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  dismissed_until TIMESTAMPTZ NOT NULL,
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, metric)
);

-- Enable RLS
ALTER TABLE public.kpi_adjustment_dismissals ENABLE ROW LEVEL SECURITY;

-- RLS policies - users can manage dismissals for campaigns in their organization
CREATE POLICY "Users can view dismissals for their organization campaigns"
ON public.kpi_adjustment_dismissals
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.campaigns c
    JOIN public.organization_members om ON om.organization_id = c.organization_id
    WHERE c.id = campaign_id AND om.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert dismissals for their organization campaigns"
ON public.kpi_adjustment_dismissals
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.campaigns c
    JOIN public.organization_members om ON om.organization_id = c.organization_id
    WHERE c.id = campaign_id AND om.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own dismissals"
ON public.kpi_adjustment_dismissals
FOR DELETE
USING (user_id = auth.uid());

-- Index for faster lookups
CREATE INDEX idx_kpi_adjustment_dismissals_campaign ON public.kpi_adjustment_dismissals(campaign_id);
CREATE INDEX idx_kpi_adjustment_dismissals_until ON public.kpi_adjustment_dismissals(dismissed_until);