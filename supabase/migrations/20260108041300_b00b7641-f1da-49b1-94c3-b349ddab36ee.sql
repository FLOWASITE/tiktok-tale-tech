-- Add consumer_key and consumer_secret columns to social_connections
-- This allows storing brand-specific Twitter API keys

ALTER TABLE public.social_connections 
ADD COLUMN IF NOT EXISTS consumer_key TEXT,
ADD COLUMN IF NOT EXISTS consumer_secret TEXT;