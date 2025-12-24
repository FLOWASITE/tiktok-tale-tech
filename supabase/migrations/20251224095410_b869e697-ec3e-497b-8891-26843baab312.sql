-- Create topic_history table for tracking and learning
CREATE TABLE public.topic_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core topic data
  topic TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('evergreen', 'trending', 'seasonal', 'reactive')),
  content_goal TEXT NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('carousel', 'script', 'multichannel')),
  pillar TEXT,
  
  -- Related content reference
  content_id UUID,
  content_type TEXT CHECK (content_type IN ('carousel', 'script', 'multichannel')),
  
  -- AI scores at time of selection
  scores JSONB DEFAULT '{}',
  related_keywords TEXT[] DEFAULT '{}',
  reasoning TEXT,
  
  -- Usage tracking
  was_used BOOLEAN DEFAULT false,
  usage_status TEXT DEFAULT 'suggested' CHECK (usage_status IN ('suggested', 'selected', 'created', 'published')),
  
  -- Performance tracking
  performance_score INTEGER CHECK (performance_score >= 0 AND performance_score <= 100),
  actual_engagement JSONB DEFAULT '{}',
  
  -- Learning flags
  is_favorite BOOLEAN DEFAULT false,
  feedback TEXT CHECK (feedback IN ('positive', 'negative', 'neutral')),
  feedback_note TEXT,
  
  -- Ownership
  user_id UUID,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  brand_template_id UUID REFERENCES brand_templates(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  used_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX idx_topic_history_org_goal ON topic_history(organization_id, content_goal);
CREATE INDEX idx_topic_history_brand ON topic_history(brand_template_id);
CREATE INDEX idx_topic_history_pillar ON topic_history(pillar);
CREATE INDEX idx_topic_history_user ON topic_history(user_id);
CREATE INDEX idx_topic_history_performance ON topic_history(performance_score DESC NULLS LAST) WHERE performance_score IS NOT NULL;
CREATE INDEX idx_topic_history_created ON topic_history(created_at DESC);

-- Enable RLS
ALTER TABLE topic_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own topic_history"
  ON topic_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view org topic_history"
  ON topic_history FOR SELECT  
  USING (organization_id IS NOT NULL AND is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can insert own topic_history"
  ON topic_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert org topic_history"
  ON topic_history FOR INSERT
  WITH CHECK (organization_id IS NULL OR is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can update own topic_history"
  ON topic_history FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update org topic_history"
  ON topic_history FOR UPDATE
  USING (organization_id IS NOT NULL AND is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can delete own topic_history"
  ON topic_history FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Org admins can delete org topic_history"
  ON topic_history FOR DELETE
  USING (organization_id IS NOT NULL AND is_org_admin(auth.uid(), organization_id));