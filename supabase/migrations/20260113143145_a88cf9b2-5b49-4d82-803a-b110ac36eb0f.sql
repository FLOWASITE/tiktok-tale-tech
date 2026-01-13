-- =============================================
-- Phase 1: Content Quality Intelligence + Batch Processing
-- =============================================

-- 1. Add content_quality_score column to industry_knowledge_nodes
ALTER TABLE public.industry_knowledge_nodes 
ADD COLUMN IF NOT EXISTS content_quality_score SMALLINT CHECK (content_quality_score >= 0 AND content_quality_score <= 100);

-- 2. Add quality breakdown column (for detailed scoring)
ALTER TABLE public.industry_knowledge_nodes 
ADD COLUMN IF NOT EXISTS quality_breakdown JSONB DEFAULT NULL;

-- 3. Create index for quality filtering
CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_quality_score 
ON public.industry_knowledge_nodes(content_quality_score) 
WHERE content_quality_score IS NOT NULL;

-- 4. Create batch_processing_jobs table for tracking batch operations
CREATE TABLE IF NOT EXISTS public.batch_processing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL CHECK (job_type IN ('parse', 'embed', 'quality_cleanup', 'full_crawl')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'paused', 'completed', 'failed', 'cancelled')),
  total_items INTEGER NOT NULL DEFAULT 0,
  processed_items INTEGER NOT NULL DEFAULT 0,
  failed_items INTEGER NOT NULL DEFAULT 0,
  progress SMALLINT NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  current_item_id UUID,
  current_item_name TEXT,
  error_log JSONB DEFAULT '[]'::JSONB,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  estimated_completion TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  organization_id UUID REFERENCES public.organizations(id),
  config JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.batch_processing_jobs ENABLE ROW LEVEL SECURITY;

-- RLS policies for batch_processing_jobs (admin only)
CREATE POLICY "Admins can view batch jobs" 
ON public.batch_processing_jobs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can manage batch jobs" 
ON public.batch_processing_jobs 
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Add updated_at trigger
CREATE TRIGGER update_batch_processing_jobs_updated_at
BEFORE UPDATE ON public.batch_processing_jobs
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_updated_at();

-- 5. Create regulation_versions table for version tracking
CREATE TABLE IF NOT EXISTS public.regulation_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID NOT NULL REFERENCES public.industry_knowledge_nodes(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  full_text TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  effective_date DATE,
  previous_version_id UUID REFERENCES public.regulation_versions(id),
  diff_summary TEXT,
  changed_articles TEXT[],
  content_quality_score SMALLINT CHECK (content_quality_score >= 0 AND content_quality_score <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(node_id, version_number)
);

-- Enable RLS
ALTER TABLE public.regulation_versions ENABLE ROW LEVEL SECURITY;

-- RLS policies for regulation_versions (readable by all authenticated)
CREATE POLICY "Authenticated users can view regulation versions" 
ON public.regulation_versions 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage regulation versions" 
ON public.regulation_versions 
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Index for version lookups
CREATE INDEX IF NOT EXISTS idx_regulation_versions_node_id 
ON public.regulation_versions(node_id);

-- 6. Create helper function to get quality statistics
CREATE OR REPLACE FUNCTION public.get_content_quality_stats()
RETURNS TABLE(
  quality_level TEXT,
  node_count BIGINT,
  percentage NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  total_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO total_count 
  FROM public.industry_knowledge_nodes 
  WHERE node_type = 'regulation' AND full_text IS NOT NULL;
  
  RETURN QUERY
  SELECT 
    CASE 
      WHEN content_quality_score >= 90 THEN 'excellent'
      WHEN content_quality_score >= 70 THEN 'good'
      WHEN content_quality_score >= 50 THEN 'acceptable'
      WHEN content_quality_score IS NOT NULL THEN 'poor'
      ELSE 'unscored'
    END AS quality_level,
    COUNT(*)::BIGINT AS node_count,
    CASE WHEN total_count > 0 
      THEN ROUND((COUNT(*)::NUMERIC / total_count) * 100, 2)
      ELSE 0 
    END AS percentage
  FROM public.industry_knowledge_nodes
  WHERE node_type = 'regulation'
  GROUP BY 
    CASE 
      WHEN content_quality_score >= 90 THEN 'excellent'
      WHEN content_quality_score >= 70 THEN 'good'
      WHEN content_quality_score >= 50 THEN 'acceptable'
      WHEN content_quality_score IS NOT NULL THEN 'poor'
      ELSE 'unscored'
    END
  ORDER BY 
    CASE quality_level
      WHEN 'excellent' THEN 1
      WHEN 'good' THEN 2
      WHEN 'acceptable' THEN 3
      WHEN 'poor' THEN 4
      ELSE 5
    END;
END;
$$;

-- 7. Create helper function to get batch job statistics
CREATE OR REPLACE FUNCTION public.get_batch_processing_stats()
RETURNS TABLE(
  job_type TEXT,
  running_count BIGINT,
  pending_count BIGINT,
  completed_today BIGINT,
  failed_today BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    j.job_type,
    COUNT(*) FILTER (WHERE j.status = 'running')::BIGINT AS running_count,
    COUNT(*) FILTER (WHERE j.status = 'pending')::BIGINT AS pending_count,
    COUNT(*) FILTER (WHERE j.status = 'completed' AND j.completed_at >= CURRENT_DATE)::BIGINT AS completed_today,
    COUNT(*) FILTER (WHERE j.status = 'failed' AND j.completed_at >= CURRENT_DATE)::BIGINT AS failed_today
  FROM public.batch_processing_jobs j
  GROUP BY j.job_type;
END;
$$;