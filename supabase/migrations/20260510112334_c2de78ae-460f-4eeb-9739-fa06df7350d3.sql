ALTER TABLE public.industry_global_packs
  ADD COLUMN IF NOT EXISTS is_popular boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS popular_sort_order integer;

CREATE INDEX IF NOT EXISTS idx_industry_packs_popular
  ON public.industry_global_packs(is_popular, popular_sort_order)
  WHERE is_popular = true;

UPDATE public.industry_global_packs SET is_popular = true, popular_sort_order = 1 WHERE industry_code = 'ecommerce';
UPDATE public.industry_global_packs SET is_popular = true, popular_sort_order = 2 WHERE industry_code = 'fnb';
UPDATE public.industry_global_packs SET is_popular = true, popular_sort_order = 3 WHERE industry_code = 'healthcare';
UPDATE public.industry_global_packs SET is_popular = true, popular_sort_order = 4 WHERE industry_code = 'realestate';
UPDATE public.industry_global_packs SET is_popular = true, popular_sort_order = 5 WHERE industry_code = 'it';
UPDATE public.industry_global_packs SET is_popular = true, popular_sort_order = 6 WHERE industry_code = 'fashion';
UPDATE public.industry_global_packs SET is_popular = true, popular_sort_order = 7 WHERE industry_code = 'beauty';
UPDATE public.industry_global_packs SET is_popular = true, popular_sort_order = 8 WHERE industry_code = 'education';