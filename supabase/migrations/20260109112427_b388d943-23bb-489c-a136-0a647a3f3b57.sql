-- Add columns to store selected hooks with multi-channel content
ALTER TABLE public.multi_channel_contents 
ADD COLUMN IF NOT EXISTS selected_hooks JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS global_hook JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.multi_channel_contents.selected_hooks IS 'Array of selected hooks per channel: [{channel, opening_line, hook_type, psychology}]';
COMMENT ON COLUMN public.multi_channel_contents.global_hook IS 'Global hook applied to all channels if set';