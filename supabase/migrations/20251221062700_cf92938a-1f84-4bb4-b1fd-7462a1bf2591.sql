-- Add primary_color column to brand_templates table
ALTER TABLE public.brand_templates 
ADD COLUMN primary_color text DEFAULT '#000000';

-- Add comment for documentation
COMMENT ON COLUMN public.brand_templates.primary_color IS 'Primary brand color in hex format';