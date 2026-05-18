ALTER TABLE public.agent_goals
  ADD COLUMN IF NOT EXISTS content_mix jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.agent_goals.content_mix IS
  'Per-channel content type breakdown: { facebook: { post: 4, carousel: 2, video: 0 } }';