-- Add separate Facebook and Instagram platform values to ad_platform enum
ALTER TYPE public.ad_platform ADD VALUE IF NOT EXISTS 'facebook_feed';
ALTER TYPE public.ad_platform ADD VALUE IF NOT EXISTS 'facebook_story';
ALTER TYPE public.ad_platform ADD VALUE IF NOT EXISTS 'instagram_feed';
ALTER TYPE public.ad_platform ADD VALUE IF NOT EXISTS 'instagram_story';
ALTER TYPE public.ad_platform ADD VALUE IF NOT EXISTS 'instagram_reels';