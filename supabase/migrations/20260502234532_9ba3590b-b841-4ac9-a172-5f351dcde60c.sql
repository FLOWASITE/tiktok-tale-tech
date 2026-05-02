
-- Remove unused column added in previous migration
ALTER TABLE public.seo_keywords DROP COLUMN IF EXISTS pillar_id;

-- Null out stale cluster_id values that don't exist in seo_clusters
UPDATE public.seo_keywords
SET cluster_id = NULL
WHERE cluster_id IS NOT NULL
  AND cluster_id NOT IN (SELECT id FROM public.seo_clusters);

-- Repoint FK to seo_clusters (Pillars)
ALTER TABLE public.seo_keywords DROP CONSTRAINT IF EXISTS seo_keywords_cluster_id_fkey;
ALTER TABLE public.seo_keywords
  ADD CONSTRAINT seo_keywords_cluster_id_fkey
  FOREIGN KEY (cluster_id) REFERENCES public.seo_clusters(id) ON DELETE SET NULL;
