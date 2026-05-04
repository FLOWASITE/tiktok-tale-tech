ALTER TABLE public.multi_channel_contents
  ADD COLUMN IF NOT EXISTS wordpress_seo_data jsonb,
  ADD COLUMN IF NOT EXISTS blogger_seo_data jsonb;