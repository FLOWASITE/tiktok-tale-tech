ALTER TABLE public.multi_channel_contents
  ADD COLUMN IF NOT EXISTS wix_content text,
  ADD COLUMN IF NOT EXISTS wix_post_id text,
  ADD COLUMN IF NOT EXISTS wix_post_url text,
  ADD COLUMN IF NOT EXISTS wix_seo_data jsonb;