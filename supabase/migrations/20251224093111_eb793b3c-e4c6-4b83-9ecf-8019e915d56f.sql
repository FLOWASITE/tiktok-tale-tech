-- Add content_pillars column to brand_templates
-- Structure: [{ "name": "Product", "weight": 30, "keywords": ["sản phẩm"], "color": "#10b981" }]
ALTER TABLE public.brand_templates 
ADD COLUMN IF NOT EXISTS content_pillars jsonb DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.brand_templates.content_pillars IS 'Content pillars with name, weight (%), keywords, and color for content strategy';

-- Create index for faster queries on pillars
CREATE INDEX IF NOT EXISTS idx_brand_templates_content_pillars ON public.brand_templates USING gin(content_pillars);