-- Add channel_statuses column to store status for each channel
ALTER TABLE public.multi_channel_contents 
ADD COLUMN IF NOT EXISTS channel_statuses jsonb DEFAULT '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.multi_channel_contents.channel_statuses IS 'Stores individual status for each channel. Example: {"facebook": "published", "instagram": "review"}';