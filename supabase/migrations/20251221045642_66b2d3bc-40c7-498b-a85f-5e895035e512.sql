-- Create enum for platforms
CREATE TYPE public.carousel_platform AS ENUM ('facebook', 'tiktok');

-- Create enum for AI tools
CREATE TYPE public.carousel_ai_tool AS ENUM ('ideogram', 'midjourney', 'dalle', 'leonardo');

-- Create carousels table
CREATE TABLE public.carousels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  platform carousel_platform NOT NULL DEFAULT 'facebook',
  slide_count INTEGER NOT NULL DEFAULT 5 CHECK (slide_count >= 5 AND slide_count <= 10),
  ai_tool carousel_ai_tool NOT NULL DEFAULT 'ideogram',
  brand_name TEXT NOT NULL DEFAULT 'Thuế Hộ by TAF.vn',
  brand_guideline TEXT,
  include_logo BOOLEAN NOT NULL DEFAULT true,
  slides_content JSONB NOT NULL DEFAULT '[]'::jsonb,
  caption_suggestion TEXT,
  cta_suggestion TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.carousels ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (same as scripts table)
CREATE POLICY "Anyone can view carousels"
ON public.carousels
FOR SELECT
USING (true);

CREATE POLICY "Anyone can create carousels"
ON public.carousels
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update carousels"
ON public.carousels
FOR UPDATE
USING (true);

CREATE POLICY "Anyone can delete carousels"
ON public.carousels
FOR DELETE
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_carousels_updated_at
BEFORE UPDATE ON public.carousels
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();