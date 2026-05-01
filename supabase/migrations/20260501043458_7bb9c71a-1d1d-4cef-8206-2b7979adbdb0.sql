ALTER TABLE public.character_profiles 
  ADD COLUMN IF NOT EXISTS reference_images jsonb DEFAULT '[]';