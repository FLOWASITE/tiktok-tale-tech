ALTER TABLE public.character_profiles 
  ADD COLUMN IF NOT EXISTS default_voice_id text,
  ADD COLUMN IF NOT EXISTS default_voice_provider text;