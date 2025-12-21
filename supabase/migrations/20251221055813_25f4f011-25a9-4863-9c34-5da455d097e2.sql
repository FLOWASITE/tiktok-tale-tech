-- Add logo_url column to brand_templates
ALTER TABLE public.brand_templates 
ADD COLUMN logo_url text;

-- Create storage bucket for brand logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-logos', 'brand-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view brand logos
CREATE POLICY "Anyone can view brand logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'brand-logos');

-- Allow anyone to upload brand logos
CREATE POLICY "Anyone can upload brand logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'brand-logos');

-- Allow anyone to update brand logos
CREATE POLICY "Anyone can update brand logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'brand-logos');

-- Allow anyone to delete brand logos
CREATE POLICY "Anyone can delete brand logos"
ON storage.objects FOR DELETE
USING (bucket_id = 'brand-logos');