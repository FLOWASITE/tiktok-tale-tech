
CREATE TABLE public.telegram_messages_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  chat_id BIGINT NOT NULL,
  user_id UUID,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  intent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_telegram_messages_log_chat ON public.telegram_messages_log (organization_id, chat_id, created_at DESC);

ALTER TABLE public.telegram_messages_log ENABLE ROW LEVEL SECURITY;

-- No policies = service role only via getServiceClient(). Users do not query this directly.
