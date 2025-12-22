-- Create chat messages table
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  is_edited boolean DEFAULT false,
  reply_to_id uuid REFERENCES public.chat_messages(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Org members can view chat messages"
ON public.chat_messages
FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can insert chat messages"
ON public.chat_messages
FOR INSERT
WITH CHECK (is_org_member(auth.uid(), organization_id) AND auth.uid() = sender_id);

CREATE POLICY "Users can update own messages"
ON public.chat_messages
FOR UPDATE
USING (auth.uid() = sender_id);

CREATE POLICY "Users can delete own messages"
ON public.chat_messages
FOR DELETE
USING (auth.uid() = sender_id);

-- Create trigger for updated_at
CREATE TRIGGER update_chat_messages_updated_at
BEFORE UPDATE ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;