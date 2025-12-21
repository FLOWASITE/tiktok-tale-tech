-- Add industry column to brand_templates table
ALTER TABLE public.brand_templates 
ADD COLUMN industry text;