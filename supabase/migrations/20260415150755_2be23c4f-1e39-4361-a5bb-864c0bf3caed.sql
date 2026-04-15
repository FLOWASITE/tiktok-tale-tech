ALTER TABLE public.carousels
ADD COLUMN IF NOT EXISTS published_channels text[] NOT NULL DEFAULT '{}'::text[];

UPDATE public.carousels
SET published_channels = CASE
  WHEN coalesce(array_length(published_channels, 1), 0) > 0 THEN published_channels
  WHEN status IN ('published', 'partially_published') AND platform IS NOT NULL THEN ARRAY[platform::text]
  ELSE '{}'::text[]
END
WHERE published_channels IS NULL
   OR (
     coalesce(array_length(published_channels, 1), 0) = 0
     AND status IN ('published', 'partially_published')
   );