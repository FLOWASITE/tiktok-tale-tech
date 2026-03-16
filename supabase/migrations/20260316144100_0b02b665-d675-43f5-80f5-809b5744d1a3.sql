
-- Create carousel_images table for persistent image storage
CREATE TABLE public.carousel_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carousel_id UUID NOT NULL REFERENCES public.carousels(id) ON DELETE CASCADE,
  slide_number INTEGER NOT NULL,
  image_url TEXT NOT NULL,
  prompt TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  is_selected BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  organization_id UUID REFERENCES public.organizations(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(carousel_id, slide_number, version)
);

-- Enable RLS
ALTER TABLE public.carousel_images ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own carousel images"
  ON public.carousel_images FOR SELECT
  TO authenticated
  USING (created_by = auth.uid() OR public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can insert their own carousel images"
  ON public.carousel_images FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own carousel images"
  ON public.carousel_images FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own carousel images"
  ON public.carousel_images FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Auto-increment version trigger
CREATE OR REPLACE FUNCTION public.auto_increment_carousel_image_version()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
DECLARE
  max_version integer;
BEGIN
  SELECT COALESCE(MAX(version), 0) INTO max_version
  FROM public.carousel_images
  WHERE carousel_id = NEW.carousel_id AND slide_number = NEW.slide_number;
  
  NEW.version := max_version + 1;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_increment_carousel_image_version
  BEFORE INSERT ON public.carousel_images
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_increment_carousel_image_version();

-- Index for fast lookup
CREATE INDEX idx_carousel_images_carousel_id ON public.carousel_images(carousel_id);
CREATE INDEX idx_carousel_images_selected ON public.carousel_images(carousel_id, slide_number) WHERE is_selected = true;
