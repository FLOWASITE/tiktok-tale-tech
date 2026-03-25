ALTER TABLE public.campaigns ADD COLUMN content_brief jsonb DEFAULT null;

COMMENT ON COLUMN public.campaigns.content_brief IS 'AI content brief: key_messages, primary_cta, pillar_allocation';