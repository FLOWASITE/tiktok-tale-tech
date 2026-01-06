-- Add missing zalo platform variants to ad_platform enum
ALTER TYPE public.ad_platform ADD VALUE IF NOT EXISTS 'zalo_oa';
ALTER TYPE public.ad_platform ADD VALUE IF NOT EXISTS 'zalo_message';
ALTER TYPE public.ad_platform ADD VALUE IF NOT EXISTS 'zalo_article';