
-- 1A. Fix geo_action_tasks default status constraint
ALTER TABLE public.geo_action_tasks ALTER COLUMN status SET DEFAULT 'pending';

-- 1D. Drop unused geo_prompt_clusters table
DROP TABLE IF EXISTS public.geo_prompt_clusters;

-- 2B. Add is_simulated to geo_monitoring_results
ALTER TABLE public.geo_monitoring_results ADD COLUMN IF NOT EXISTS is_simulated BOOLEAN DEFAULT true;
