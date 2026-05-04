ALTER TABLE public.multi_channel_contents
  ADD COLUMN IF NOT EXISTS shopify_content text,
  ADD COLUMN IF NOT EXISTS shopify_post_url text,
  ADD COLUMN IF NOT EXISTS shopify_post_id text,
  ADD COLUMN IF NOT EXISTS shopify_seo_data jsonb;