-- Add scene_description column to carousel_images for seamless continuity persistence
-- Used by all image providers (PoYo, KIE, GeminiGen, Lovable Gateway) so single-slide
-- regenerate and page refresh still produce visually consistent slides.
ALTER TABLE public.carousel_images
  ADD COLUMN IF NOT EXISTS scene_description text;

COMMENT ON COLUMN public.carousel_images.scene_description IS
  'Short prose describing visual style/colors/composition of generated image. Persisted for seamless continuity across regenerations and refreshes. Populated for all providers via Gemini Flash describe call.';
