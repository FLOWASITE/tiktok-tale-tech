
-- 1. Create campaign_content_plans table
CREATE TABLE public.campaign_content_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES agent_goals(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  plan_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  total_pieces INT NOT NULL DEFAULT 0,
  completed_pieces INT NOT NULL DEFAULT 0,
  
  campaign_start_date DATE,
  campaign_end_date DATE,
  campaign_duration_days INT,
  
  approval_mode TEXT DEFAULT 'approve_plan' 
    CHECK (approval_mode IN ('approve_plan', 'approve_each', 'full_auto')),
  plan_approved BOOLEAN DEFAULT false,
  plan_approved_at TIMESTAMPTZ,
  
  clarification_context JSONB DEFAULT NULL,
  
  status TEXT DEFAULT 'draft' 
    CHECK (status IN ('draft', 'clarifying', 'planning', 'planned', 'approved', 'executing', 'completed', 'paused')),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add columns to agent_pipelines
ALTER TABLE agent_pipelines 
  ADD COLUMN campaign_plan_id UUID REFERENCES campaign_content_plans(id),
  ADD COLUMN piece_number INT,
  ADD COLUMN scheduled_publish_at TIMESTAMPTZ;

-- 3. Add columns to agent_goals (campaign duration + approval mode)
ALTER TABLE agent_goals 
  ADD COLUMN IF NOT EXISTS campaign_duration_days INT,
  ADD COLUMN IF NOT EXISTS campaign_start_date DATE,
  ADD COLUMN IF NOT EXISTS campaign_end_date DATE,
  ADD COLUMN IF NOT EXISTS approval_mode TEXT DEFAULT 'approve_plan';

-- 4. Enable RLS on campaign_content_plans
ALTER TABLE campaign_content_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own org plans" ON campaign_content_plans
  FOR ALL
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- 5. Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_content_plans;
