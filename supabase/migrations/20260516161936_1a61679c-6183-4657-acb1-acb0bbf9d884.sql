ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS default_autonomy_level text NOT NULL DEFAULT 'full_auto';

ALTER TABLE public.organizations
  DROP CONSTRAINT IF EXISTS organizations_default_autonomy_level_check;

ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_default_autonomy_level_check
  CHECK (default_autonomy_level IN ('human_in_loop','human_on_loop','full_auto'));