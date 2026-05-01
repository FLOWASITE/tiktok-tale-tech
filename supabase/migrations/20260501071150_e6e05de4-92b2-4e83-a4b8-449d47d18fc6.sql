ALTER TABLE public.multi_channel_contents
  ADD COLUMN IF NOT EXISTS bluesky_content text,
  ADD COLUMN IF NOT EXISTS bluesky_post_id text,
  ADD COLUMN IF NOT EXISTS bluesky_post_url text;