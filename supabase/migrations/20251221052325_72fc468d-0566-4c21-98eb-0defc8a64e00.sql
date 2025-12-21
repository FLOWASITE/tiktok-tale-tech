-- Create storage bucket for carousel images
INSERT INTO storage.buckets (id, name, public)
VALUES ('carousel-images', 'carousel-images', true);

-- Create storage policies for carousel-images bucket
CREATE POLICY "Anyone can view carousel images"
ON storage.objects FOR SELECT
USING (bucket_id = 'carousel-images');

CREATE POLICY "Anyone can upload carousel images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'carousel-images');

CREATE POLICY "Anyone can update carousel images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'carousel-images');

CREATE POLICY "Anyone can delete carousel images"
ON storage.objects FOR DELETE
USING (bucket_id = 'carousel-images');

-- Add generated_images column to carousels table
ALTER TABLE public.carousels
ADD COLUMN generated_images jsonb DEFAULT '[]'::jsonb;