-- Add last_verified_at column to social_connections table
ALTER TABLE public.social_connections 
ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMP WITH TIME ZONE;