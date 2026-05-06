ALTER TABLE public.character_profiles
  ADD COLUMN IF NOT EXISTS default_role TEXT NOT NULL DEFAULT 'supporting'
  CHECK (default_role IN ('main', 'supporting'));

CREATE INDEX IF NOT EXISTS idx_character_profiles_default_role
  ON public.character_profiles (organization_id, brand_template_id, default_role);