-- Add footer_info column to brand_templates table
ALTER TABLE public.brand_templates 
ADD COLUMN IF NOT EXISTS footer_info jsonb DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.brand_templates.footer_info IS 'Business footer information for AI content generation';