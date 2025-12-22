-- Add TikTok and Threads content columns to multi_channel_contents table
ALTER TABLE multi_channel_contents
ADD COLUMN IF NOT EXISTS tiktok_content text,
ADD COLUMN IF NOT EXISTS threads_content text;