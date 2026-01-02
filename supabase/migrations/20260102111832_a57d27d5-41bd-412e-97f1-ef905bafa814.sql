-- Add website_seo_data column to store structured SEO metadata
ALTER TABLE public.multi_channel_contents 
ADD COLUMN IF NOT EXISTS website_seo_data JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.multi_channel_contents.website_seo_data IS 'Structured SEO data for website content including seo_title, meta_description, focus_keyword, heading_structure, featured_snippet, etc.';