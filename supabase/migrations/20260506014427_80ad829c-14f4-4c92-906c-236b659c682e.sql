-- Cleanup: keep oldest main per brand, demote rest
WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (PARTITION BY brand_template_id ORDER BY created_at ASC) AS rn
  FROM public.character_profiles
  WHERE default_role = 'main' AND brand_template_id IS NOT NULL
)
UPDATE public.character_profiles cp
SET default_role = 'supporting'
FROM ranked r
WHERE cp.id = r.id AND r.rn > 1;

-- Enforce max 1 main character per brand
CREATE UNIQUE INDEX IF NOT EXISTS uniq_main_character_per_brand
  ON public.character_profiles (brand_template_id)
  WHERE default_role = 'main' AND brand_template_id IS NOT NULL;