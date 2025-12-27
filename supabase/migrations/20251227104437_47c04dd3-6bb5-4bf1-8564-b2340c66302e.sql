-- Create chat_feedback table for storing user feedback on AI messages
CREATE TABLE public.chat_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  message_id TEXT NOT NULL,
  conversation_id TEXT,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('up', 'down')),
  message_content TEXT,
  user_message TEXT,
  brand_template_id UUID REFERENCES public.brand_templates(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_feedback ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can insert own feedback"
ON public.chat_feedback
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own feedback"
ON public.chat_feedback
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Org members can view org feedback"
ON public.chat_feedback
FOR SELECT
USING (organization_id IS NOT NULL AND is_org_member(auth.uid(), organization_id));

-- Admins can view all feedback for analytics
CREATE POLICY "Admins can view all feedback"
ON public.chat_feedback
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Index for faster queries
CREATE INDEX idx_chat_feedback_user_id ON public.chat_feedback(user_id);
CREATE INDEX idx_chat_feedback_brand_template ON public.chat_feedback(brand_template_id);
CREATE INDEX idx_chat_feedback_created_at ON public.chat_feedback(created_at DESC);