ALTER TABLE public.multi_channel_contents
  ADD COLUMN IF NOT EXISTS blogger_content text,
  ADD COLUMN IF NOT EXISTS wordpress_content text;