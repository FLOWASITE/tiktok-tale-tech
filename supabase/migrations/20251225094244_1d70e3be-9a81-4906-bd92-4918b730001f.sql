-- Add brand_template_id column to scripts table
ALTER TABLE public.scripts 
ADD COLUMN IF NOT EXISTS brand_template_id uuid REFERENCES public.brand_templates(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_scripts_brand_template_id ON public.scripts(brand_template_id);

-- Add comment for documentation
COMMENT ON COLUMN public.scripts.brand_template_id IS 'Reference to the brand template used for this script';