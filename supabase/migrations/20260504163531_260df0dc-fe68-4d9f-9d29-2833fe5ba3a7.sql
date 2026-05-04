ALTER TABLE public.multi_channel_contents
  ADD COLUMN IF NOT EXISTS medium_content text,
  ADD COLUMN IF NOT EXISTS medium_post_id text,
  ADD COLUMN IF NOT EXISTS medium_post_url text,
  ADD COLUMN IF NOT EXISTS medium_seo_data jsonb;