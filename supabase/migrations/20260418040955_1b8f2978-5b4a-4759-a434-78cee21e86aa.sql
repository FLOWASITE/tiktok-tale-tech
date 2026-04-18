ALTER TABLE public.carousels 
  ADD COLUMN IF NOT EXISTS generation_mode text DEFAULT 'legacy',
  ADD COLUMN IF NOT EXISTS needs_regeneration boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS seamless_score integer,
  ADD COLUMN IF NOT EXISTS seamless_issues jsonb;