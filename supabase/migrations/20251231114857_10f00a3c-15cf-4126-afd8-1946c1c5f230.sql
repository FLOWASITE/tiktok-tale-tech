-- Create user_preferences table for persistent user-level preferences
CREATE TABLE public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  
  -- Writing Style Preferences
  preferred_tone TEXT DEFAULT 'balanced', -- casual, balanced, formal, professional
  emoji_frequency TEXT DEFAULT 'medium', -- none, low, medium, high
  content_length_preference TEXT DEFAULT 'balanced', -- concise, balanced, detailed
  
  -- AI Behavior Preferences
  explanation_depth TEXT DEFAULT 'standard', -- minimal, standard, detailed
  suggestion_count_preference INTEGER DEFAULT 5, -- 3, 5, 8
  auto_save_drafts BOOLEAN DEFAULT true,
  
  -- Skill & Learning Signals
  skill_level TEXT DEFAULT 'beginner', -- beginner, intermediate, advanced, expert
  concepts_mastered TEXT[] DEFAULT ARRAY[]::TEXT[],
  topics_generated_count INTEGER DEFAULT 0,
  topics_used_count INTEGER DEFAULT 0,
  avg_edit_percentage REAL DEFAULT 0,
  
  -- Inferred Preferences (auto-learned)
  preferred_categories TEXT[] DEFAULT ARRAY[]::TEXT[],
  disliked_categories TEXT[] DEFAULT ARRAY[]::TEXT[],
  preferred_formats TEXT[] DEFAULT ARRAY[]::TEXT[],
  peak_activity_hours INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  
  -- Extended learned preferences
  inferred_preferences JSONB DEFAULT '{}'::JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_active_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX user_preferences_user_idx ON user_preferences(user_id);
CREATE INDEX user_preferences_org_idx ON user_preferences(organization_id);
CREATE INDEX user_preferences_skill_idx ON user_preferences(skill_level);

-- RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences"
  ON user_preferences FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own preferences"
  ON user_preferences FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own preferences"
  ON user_preferences FOR DELETE
  USING (user_id = auth.uid());

-- Auto-update timestamps
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create content_style_patterns table for learned writing patterns
CREATE TABLE public.content_style_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  brand_template_id UUID REFERENCES brand_templates(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Pattern identification
  content_type TEXT NOT NULL, -- script, carousel, multichannel, topic
  pattern_category TEXT NOT NULL, -- hook, cta, tone, structure, emoji, length
  
  -- Pattern data
  original_pattern TEXT, -- What AI generated
  user_pattern TEXT, -- What user changed to
  edit_type TEXT, -- add, remove, rephrase, restructure
  
  -- Pattern strength
  occurrence_count INTEGER DEFAULT 1,
  confidence_score REAL DEFAULT 0.3,
  last_seen_at TIMESTAMPTZ DEFAULT now(),
  
  -- Examples (for few-shot learning)
  examples JSONB DEFAULT '[]'::JSONB, -- [{original, edited, context}]
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX style_patterns_user_idx ON content_style_patterns(user_id);
CREATE INDEX style_patterns_brand_idx ON content_style_patterns(brand_template_id);
CREATE INDEX style_patterns_category_idx ON content_style_patterns(pattern_category);
CREATE INDEX style_patterns_confidence_idx ON content_style_patterns(confidence_score DESC);

-- RLS
ALTER TABLE content_style_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own style patterns"
  ON content_style_patterns FOR SELECT
  USING (user_id = auth.uid() OR (organization_id IS NOT NULL AND is_org_member(auth.uid(), organization_id)));

CREATE POLICY "Users can insert style patterns"
  ON content_style_patterns FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own style patterns"
  ON content_style_patterns FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own style patterns"
  ON content_style_patterns FOR DELETE
  USING (user_id = auth.uid() OR (organization_id IS NOT NULL AND is_org_admin(auth.uid(), organization_id)));

-- Auto-update timestamps
CREATE TRIGGER update_content_style_patterns_updated_at
  BEFORE UPDATE ON content_style_patterns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add session_learnings and user_corrections to chat_conversations
ALTER TABLE chat_conversations 
ADD COLUMN IF NOT EXISTS session_learnings JSONB DEFAULT '{}'::JSONB,
ADD COLUMN IF NOT EXISTS user_corrections JSONB DEFAULT '[]'::JSONB;

-- Add feedback_details to topic_history for granular feedback
ALTER TABLE topic_history
ADD COLUMN IF NOT EXISTS feedback_details JSONB DEFAULT NULL;