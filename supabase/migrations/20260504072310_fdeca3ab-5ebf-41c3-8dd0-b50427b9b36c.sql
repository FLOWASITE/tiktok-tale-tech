ALTER TABLE public.multi_channel_contents
  ADD COLUMN IF NOT EXISTS website_post_url    text,
  ADD COLUMN IF NOT EXISTS website_post_id     text,
  ADD COLUMN IF NOT EXISTS blogger_post_url    text,
  ADD COLUMN IF NOT EXISTS blogger_post_id     text,
  ADD COLUMN IF NOT EXISTS wordpress_post_url  text,
  ADD COLUMN IF NOT EXISTS wordpress_post_id   text,
  ADD COLUMN IF NOT EXISTS flowa_blog_post_url text,
  ADD COLUMN IF NOT EXISTS flowa_blog_post_id  text;

CREATE INDEX IF NOT EXISTS idx_mcc_has_published_url
  ON public.multi_channel_contents (organization_id)
  WHERE website_post_url IS NOT NULL
     OR blogger_post_url IS NOT NULL
     OR wordpress_post_url IS NOT NULL
     OR flowa_blog_post_url IS NOT NULL;