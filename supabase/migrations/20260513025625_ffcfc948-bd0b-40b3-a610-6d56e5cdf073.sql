ALTER TABLE public.carousels
  ADD COLUMN IF NOT EXISTS locked_palette jsonb,
  ADD COLUMN IF NOT EXISTS needs_regeneration_slides jsonb;