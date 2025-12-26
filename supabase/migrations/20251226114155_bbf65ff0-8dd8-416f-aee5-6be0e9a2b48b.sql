-- Add source_url column to trending_topics if not exists
ALTER TABLE public.trending_topics 
ADD COLUMN IF NOT EXISTS source_url TEXT;