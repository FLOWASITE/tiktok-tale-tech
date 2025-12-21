-- Add channel_overrides JSONB column to brand_templates table
-- This allows brands to customize channel settings beyond defaults
ALTER TABLE public.brand_templates
ADD COLUMN channel_overrides JSONB DEFAULT '{}'::jsonb;