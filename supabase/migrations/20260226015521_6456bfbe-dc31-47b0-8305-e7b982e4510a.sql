
-- Sprint 2: Content Feedback table for User Feedback Loop
CREATE TABLE public.content_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  organization_id UUID REFERENCES public.organizations(id),
  conversation_id UUID,
  message_id TEXT,
  trace_id TEXT,
  governor_score INTEGER,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('thumbs_up', 'thumbs_down')),
  tags TEXT[] DEFAULT '{}',
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: users can only manage their own feedback
ALTER TABLE public.content_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own feedback" ON public.content_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own feedback" ON public.content_feedback
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own feedback" ON public.content_feedback
  FOR UPDATE USING (auth.uid() = user_id);

-- Index for trace_id lookups (correlate feedback with AI metrics)
CREATE INDEX idx_content_feedback_trace_id ON public.content_feedback(trace_id);
CREATE INDEX idx_content_feedback_user_id ON public.content_feedback(user_id);
