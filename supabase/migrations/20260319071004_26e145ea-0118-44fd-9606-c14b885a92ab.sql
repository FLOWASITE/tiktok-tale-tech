ALTER TABLE public.carousels ADD COLUMN IF NOT EXISTS seamless_consistency_score integer;
ALTER TABLE public.carousels ADD COLUMN IF NOT EXISTS seamless_analysis jsonb;