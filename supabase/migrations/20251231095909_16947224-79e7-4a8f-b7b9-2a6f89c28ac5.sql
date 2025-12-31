-- ============================================
-- PHASE 1: CONVERSATION MEMORY AND PERSISTENCE
-- ============================================

-- 1. Create chat_conversations table for session management
CREATE TABLE public.chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  brand_template_id UUID REFERENCES public.brand_templates(id) ON DELETE SET NULL,
  title TEXT,
  summary TEXT,
  message_count INTEGER DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  is_archived BOOLEAN DEFAULT FALSE,
  content_goal TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create chat_conversation_messages table for storing messages
CREATE TABLE public.chat_conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create indexes for performance
CREATE INDEX idx_chat_conversations_user ON public.chat_conversations(user_id);
CREATE INDEX idx_chat_conversations_org ON public.chat_conversations(organization_id);
CREATE INDEX idx_chat_conversations_brand ON public.chat_conversations(brand_template_id);
CREATE INDEX idx_chat_conversations_updated ON public.chat_conversations(updated_at DESC);
CREATE INDEX idx_chat_conversation_messages_conv ON public.chat_conversation_messages(conversation_id);
CREATE INDEX idx_chat_conversation_messages_created ON public.chat_conversation_messages(created_at);

-- 4. Enable RLS
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_conversation_messages ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for chat_conversations
CREATE POLICY "Users can view own conversations"
ON public.chat_conversations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Org members can view org conversations"
ON public.chat_conversations FOR SELECT
USING (organization_id IS NOT NULL AND is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can insert own conversations"
ON public.chat_conversations FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations"
ON public.chat_conversations FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Org members can update org conversations"
ON public.chat_conversations FOR UPDATE
USING (organization_id IS NOT NULL AND is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can delete own conversations"
ON public.chat_conversations FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Org admins can delete org conversations"
ON public.chat_conversations FOR DELETE
USING (organization_id IS NOT NULL AND is_org_admin(auth.uid(), organization_id));

-- 6. RLS Policies for chat_conversation_messages
CREATE POLICY "Users can view messages of own conversations"
ON public.chat_conversation_messages FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.chat_conversations c
  WHERE c.id = conversation_id AND c.user_id = auth.uid()
));

CREATE POLICY "Org members can view org conversation messages"
ON public.chat_conversation_messages FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.chat_conversations c
  WHERE c.id = conversation_id 
  AND c.organization_id IS NOT NULL 
  AND is_org_member(auth.uid(), c.organization_id)
));

CREATE POLICY "Users can insert messages to own conversations"
ON public.chat_conversation_messages FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.chat_conversations c
  WHERE c.id = conversation_id AND c.user_id = auth.uid()
));

CREATE POLICY "Users can delete messages from own conversations"
ON public.chat_conversation_messages FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.chat_conversations c
  WHERE c.id = conversation_id AND c.user_id = auth.uid()
));

-- 7. Trigger to update conversation metadata on new message
CREATE OR REPLACE FUNCTION public.update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.chat_conversations
  SET 
    message_count = message_count + 1,
    last_message_at = NEW.created_at,
    updated_at = now(),
    title = CASE 
      WHEN title IS NULL AND NEW.role = 'user' 
      THEN LEFT(NEW.content, 100)
      ELSE title
    END
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_conversation_message_insert
AFTER INSERT ON public.chat_conversation_messages
FOR EACH ROW EXECUTE FUNCTION public.update_conversation_on_message();

-- 8. Trigger for updated_at
CREATE TRIGGER update_chat_conversations_updated_at
BEFORE UPDATE ON public.chat_conversations
FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();