-- Add channel_images column to store generated images for each channel
ALTER TABLE public.multi_channel_contents 
ADD COLUMN IF NOT EXISTS channel_images JSONB DEFAULT '{}';
-- Format: { "facebook": { "url": "...", "prompt": "...", "provider": "gemini", "generatedAt": "..." }, ... }

-- Add tags column for filtering and organization
ALTER TABLE public.multi_channel_contents 
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Add status column for workflow management
ALTER TABLE public.multi_channel_contents 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
-- Allowed values: 'draft', 'review', 'approved', 'published'

-- Create index for tags for better query performance
CREATE INDEX IF NOT EXISTS idx_multi_channel_contents_tags ON public.multi_channel_contents USING GIN(tags);

-- Create index for status for filtering
CREATE INDEX IF NOT EXISTS idx_multi_channel_contents_status ON public.multi_channel_contents(status);