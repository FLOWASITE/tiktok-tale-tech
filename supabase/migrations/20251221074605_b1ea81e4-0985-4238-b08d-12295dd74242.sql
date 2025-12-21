-- Add new channel columns to multi_channel_contents table
ALTER TABLE public.multi_channel_contents
ADD COLUMN linkedin_content text,
ADD COLUMN email_content text,
ADD COLUMN youtube_content text,
ADD COLUMN zalo_oa_content text;