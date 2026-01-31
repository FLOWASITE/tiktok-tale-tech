-- Add version column to channel_image_history for tracking regenerations
ALTER TABLE public.channel_image_history 
ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

-- Add index for faster version lookups
CREATE INDEX IF NOT EXISTS idx_channel_image_history_version 
ON public.channel_image_history(content_id, channel, version DESC);

-- Add column to track cleanup eligibility
ALTER TABLE public.channel_image_history 
ADD COLUMN IF NOT EXISTS last_accessed_at timestamp with time zone DEFAULT now();

-- Add function to auto-increment version for same content_id + channel
CREATE OR REPLACE FUNCTION public.auto_increment_image_version()
RETURNS TRIGGER AS $$
DECLARE
  max_version integer;
BEGIN
  SELECT COALESCE(MAX(version), 0) INTO max_version
  FROM public.channel_image_history
  WHERE content_id = NEW.content_id AND channel = NEW.channel;
  
  NEW.version := max_version + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger to auto-increment version
DROP TRIGGER IF EXISTS set_image_version ON public.channel_image_history;
CREATE TRIGGER set_image_version
BEFORE INSERT ON public.channel_image_history
FOR EACH ROW
EXECUTE FUNCTION public.auto_increment_image_version();

-- Add function to update last_accessed_at when image is selected
CREATE OR REPLACE FUNCTION public.update_image_access_time()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_selected = true AND (OLD.is_selected = false OR OLD.is_selected IS NULL) THEN
    NEW.last_accessed_at := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for access time updates
DROP TRIGGER IF EXISTS update_image_access ON public.channel_image_history;
CREATE TRIGGER update_image_access
BEFORE UPDATE ON public.channel_image_history
FOR EACH ROW
EXECUTE FUNCTION public.update_image_access_time();