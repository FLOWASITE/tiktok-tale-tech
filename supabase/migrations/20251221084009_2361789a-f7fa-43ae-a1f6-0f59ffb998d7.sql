-- Add telegram_content column to multi_channel_contents table
ALTER TABLE public.multi_channel_contents
ADD COLUMN telegram_content TEXT;