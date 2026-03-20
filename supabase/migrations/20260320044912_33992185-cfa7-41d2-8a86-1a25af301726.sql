-- Add brand_template_id column to carousels table
ALTER TABLE public.carousels 
ADD COLUMN brand_template_id UUID REFERENCES public.brand_templates(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_carousels_brand_template_id ON public.carousels(brand_template_id);