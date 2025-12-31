-- Create planning_sessions table for multi-turn content planning
CREATE TABLE public.planning_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Ownership
  user_id UUID NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  brand_template_id UUID REFERENCES brand_templates(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES chat_conversations(id) ON DELETE SET NULL,
  
  -- Planning context
  session_type TEXT NOT NULL DEFAULT 'weekly',
  title TEXT,
  goal TEXT,
  timeframe_start DATE,
  timeframe_end DATE,
  target_channels TEXT[] DEFAULT ARRAY[]::TEXT[],
  constraints JSONB DEFAULT '{}',
  
  -- Plan state
  status TEXT NOT NULL DEFAULT 'draft',
  current_plan JSONB DEFAULT '{}',
  plan_versions JSONB DEFAULT '[]',
  total_topics INTEGER DEFAULT 0,
  total_content_pieces INTEGER DEFAULT 0,
  
  -- AI context
  ai_suggestions JSONB DEFAULT '{}',
  user_feedback_history JSONB DEFAULT '[]',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  finalized_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX planning_sessions_user_idx ON planning_sessions(user_id);
CREATE INDEX planning_sessions_org_idx ON planning_sessions(organization_id);
CREATE INDEX planning_sessions_status_idx ON planning_sessions(status);
CREATE INDEX planning_sessions_conversation_idx ON planning_sessions(conversation_id);

-- RLS
ALTER TABLE planning_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own planning sessions"
  ON planning_sessions FOR SELECT
  USING (user_id = auth.uid() OR (organization_id IS NOT NULL AND is_org_member(auth.uid(), organization_id)));

CREATE POLICY "Users can create planning sessions"
  ON planning_sessions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own planning sessions"
  ON planning_sessions FOR UPDATE
  USING (user_id = auth.uid() OR (organization_id IS NOT NULL AND is_org_admin(auth.uid(), organization_id)));

CREATE POLICY "Users can delete own planning sessions"
  ON planning_sessions FOR DELETE
  USING (user_id = auth.uid() OR (organization_id IS NOT NULL AND is_org_admin(auth.uid(), organization_id)));

-- Create planned_content_items table
CREATE TABLE public.planned_content_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES planning_sessions(id) ON DELETE CASCADE,
  
  -- Content details
  topic TEXT NOT NULL,
  format TEXT NOT NULL,
  channels TEXT[] DEFAULT ARRAY[]::TEXT[],
  scheduled_date DATE,
  scheduled_time TIME,
  priority TEXT DEFAULT 'medium',
  
  -- AI context
  reasoning TEXT,
  category TEXT,
  pillar TEXT,
  ai_confidence REAL,
  
  -- Status tracking
  status TEXT DEFAULT 'planned',
  content_id UUID,
  content_type TEXT,
  
  -- User modifications
  is_user_modified BOOLEAN DEFAULT false,
  original_suggestion JSONB,
  
  -- Order
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX planned_items_session_idx ON planned_content_items(session_id);
CREATE INDEX planned_items_date_idx ON planned_content_items(scheduled_date);
CREATE INDEX planned_items_status_idx ON planned_content_items(status);

-- RLS
ALTER TABLE planned_content_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view items in their sessions"
  ON planned_content_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM planning_sessions ps 
      WHERE ps.id = planned_content_items.session_id 
        AND (ps.user_id = auth.uid() OR (ps.organization_id IS NOT NULL AND is_org_member(auth.uid(), ps.organization_id)))
    )
  );

CREATE POLICY "Users can insert items in their sessions"
  ON planned_content_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM planning_sessions ps 
      WHERE ps.id = planned_content_items.session_id 
        AND (ps.user_id = auth.uid() OR (ps.organization_id IS NOT NULL AND is_org_member(auth.uid(), ps.organization_id)))
    )
  );

CREATE POLICY "Users can update items in their sessions"
  ON planned_content_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM planning_sessions ps 
      WHERE ps.id = planned_content_items.session_id 
        AND (ps.user_id = auth.uid() OR (ps.organization_id IS NOT NULL AND is_org_admin(auth.uid(), ps.organization_id)))
    )
  );

CREATE POLICY "Users can delete items in their sessions"
  ON planned_content_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM planning_sessions ps 
      WHERE ps.id = planned_content_items.session_id 
        AND (ps.user_id = auth.uid() OR (ps.organization_id IS NOT NULL AND is_org_admin(auth.uid(), ps.organization_id)))
    )
  );

-- Updated_at triggers
CREATE TRIGGER update_planning_sessions_updated_at
  BEFORE UPDATE ON planning_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_planned_content_items_updated_at
  BEFORE UPDATE ON planned_content_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();