-- =============================================
-- Phase 9: Analytics Table + Health Functions
-- =============================================

-- 1. Create knowledge graph analytics tracking table
CREATE TABLE IF NOT EXISTS public.knowledge_graph_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_type TEXT NOT NULL CHECK (query_type IN ('search', 'traverse', 'connected', 'related', 'regulations')),
  query_params JSONB DEFAULT '{}',
  result_count INT DEFAULT 0,
  duration_ms INT DEFAULT 0,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable RLS on analytics table
ALTER TABLE public.knowledge_graph_analytics ENABLE ROW LEVEL SECURITY;

-- 3. RLS policies for analytics
CREATE POLICY "Authenticated users can insert analytics"
  ON public.knowledge_graph_analytics
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Org admins can view org analytics"
  ON public.knowledge_graph_analytics
  FOR SELECT
  TO authenticated
  USING (
    organization_id IS NULL 
    OR is_org_member(auth.uid(), organization_id)
  );

-- 4. Index for performance
CREATE INDEX IF NOT EXISTS idx_kg_analytics_created_at ON public.knowledge_graph_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kg_analytics_query_type ON public.knowledge_graph_analytics(query_type);

-- 5. Function to log query analytics
CREATE OR REPLACE FUNCTION public.log_knowledge_graph_query(
  p_query_type TEXT,
  p_query_params JSONB DEFAULT '{}',
  p_result_count INT DEFAULT 0,
  p_duration_ms INT DEFAULT 0,
  p_organization_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.knowledge_graph_analytics (
    query_type, query_params, result_count, duration_ms, user_id, organization_id
  ) VALUES (
    p_query_type, p_query_params, p_result_count, p_duration_ms, auth.uid(), p_organization_id
  )
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- 6. Function to get orphan nodes (nodes without any edges)
CREATE OR REPLACE FUNCTION public.get_orphan_nodes(p_limit INT DEFAULT 100)
RETURNS TABLE (
  node_id UUID,
  node_type TEXT,
  node_key TEXT,
  display_name JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT n.id, n.node_type, n.node_key, n.display_name, n.created_at
  FROM public.industry_knowledge_nodes n
  WHERE n.is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM public.industry_knowledge_edges e
      WHERE e.source_node_id = n.id OR e.target_node_id = n.id
    )
  ORDER BY n.created_at DESC
  LIMIT p_limit;
END;
$$;

-- 7. Function to get graph health summary
CREATE OR REPLACE FUNCTION public.get_graph_health_summary()
RETURNS TABLE (
  metric_name TEXT,
  metric_value NUMERIC,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total_nodes INT;
  v_total_edges INT;
  v_with_embeddings INT;
  v_orphan_count INT;
  v_embedding_pct NUMERIC;
  v_orphan_pct NUMERIC;
  v_connectivity NUMERIC;
BEGIN
  -- Get counts
  SELECT COUNT(*) INTO v_total_nodes FROM public.industry_knowledge_nodes WHERE is_active = true;
  SELECT COUNT(*) INTO v_total_edges FROM public.industry_knowledge_edges;
  SELECT COUNT(*) INTO v_with_embeddings FROM public.industry_knowledge_nodes WHERE is_active = true AND embedding IS NOT NULL;
  SELECT COUNT(*) INTO v_orphan_count FROM public.industry_knowledge_nodes n
    WHERE n.is_active = true
    AND NOT EXISTS (SELECT 1 FROM public.industry_knowledge_edges e WHERE e.source_node_id = n.id OR e.target_node_id = n.id);
  
  -- Calculate percentages
  v_embedding_pct := CASE WHEN v_total_nodes > 0 THEN (v_with_embeddings::NUMERIC / v_total_nodes * 100) ELSE 0 END;
  v_orphan_pct := CASE WHEN v_total_nodes > 0 THEN (v_orphan_count::NUMERIC / v_total_nodes * 100) ELSE 0 END;
  v_connectivity := CASE WHEN v_total_nodes > 0 THEN (v_total_edges::NUMERIC / v_total_nodes) ELSE 0 END;
  
  RETURN QUERY VALUES
    ('total_nodes', v_total_nodes::NUMERIC, 'info'),
    ('total_edges', v_total_edges::NUMERIC, 'info'),
    ('embedding_coverage', ROUND(v_embedding_pct, 2), 
      CASE WHEN v_embedding_pct >= 90 THEN 'pass' WHEN v_embedding_pct >= 50 THEN 'warn' ELSE 'fail' END),
    ('orphan_nodes', v_orphan_count::NUMERIC, 
      CASE WHEN v_orphan_pct <= 5 THEN 'pass' WHEN v_orphan_pct <= 15 THEN 'warn' ELSE 'fail' END),
    ('orphan_percentage', ROUND(v_orphan_pct, 2),
      CASE WHEN v_orphan_pct <= 5 THEN 'pass' WHEN v_orphan_pct <= 15 THEN 'warn' ELSE 'fail' END),
    ('avg_connectivity', ROUND(v_connectivity, 2),
      CASE WHEN v_connectivity >= 1.5 THEN 'pass' WHEN v_connectivity >= 0.5 THEN 'warn' ELSE 'fail' END);
END;
$$;