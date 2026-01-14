-- ============================================
-- Duplicate Regulation Detection Functions
-- ============================================

-- Function to find duplicate regulations based on semantic similarity
CREATE OR REPLACE FUNCTION public.find_duplicate_regulations(
  p_similarity_threshold FLOAT DEFAULT 0.85,
  p_limit INT DEFAULT 100
)
RETURNS TABLE (
  node_id_1 UUID,
  node_id_2 UUID,
  name_1 TEXT,
  name_2 TEXT,
  node_key_1 TEXT,
  node_key_2 TEXT,
  source_url_1 TEXT,
  source_url_2 TEXT,
  quality_1 INT,
  quality_2 INT,
  created_at_1 TIMESTAMPTZ,
  created_at_2 TIMESTAMPTZ,
  similarity FLOAT,
  match_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  RETURN QUERY
  WITH regulation_nodes AS (
    SELECT 
      n.id,
      n.node_key,
      n.display_name->>'vi' AS name_vi,
      n.display_name->>'en' AS name_en,
      n.source_url,
      n.content_quality_score,
      n.created_at,
      n.embedding
    FROM public.industry_knowledge_nodes n
    WHERE n.node_type = 'regulation'
      AND n.is_active = true
      AND n.embedding IS NOT NULL
  )
  SELECT DISTINCT ON (LEAST(r1.id, r2.id), GREATEST(r1.id, r2.id))
    r1.id AS node_id_1,
    r2.id AS node_id_2,
    COALESCE(r1.name_vi, r1.name_en) AS name_1,
    COALESCE(r2.name_vi, r2.name_en) AS name_2,
    r1.node_key AS node_key_1,
    r2.node_key AS node_key_2,
    r1.source_url AS source_url_1,
    r2.source_url AS source_url_2,
    r1.content_quality_score AS quality_1,
    r2.content_quality_score AS quality_2,
    r1.created_at AS created_at_1,
    r2.created_at AS created_at_2,
    (1 - (r1.embedding <=> r2.embedding))::FLOAT AS similarity,
    'semantic'::TEXT AS match_type
  FROM regulation_nodes r1
  CROSS JOIN regulation_nodes r2
  WHERE r1.id < r2.id
    AND (1 - (r1.embedding <=> r2.embedding)) >= p_similarity_threshold
  ORDER BY LEAST(r1.id, r2.id), GREATEST(r1.id, r2.id), similarity DESC
  LIMIT p_limit;
END;
$$;

-- Function to find duplicates for a single node (without explicit vector type)
CREATE OR REPLACE FUNCTION public.find_node_duplicates(
  p_node_id UUID,
  p_similarity_threshold FLOAT DEFAULT 0.85,
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  duplicate_node_id UUID,
  duplicate_name TEXT,
  duplicate_node_key TEXT,
  duplicate_source_url TEXT,
  duplicate_quality INT,
  duplicate_created_at TIMESTAMPTZ,
  similarity FLOAT,
  match_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_source_name TEXT;
BEGIN
  -- Get source node name
  SELECT COALESCE(display_name->>'vi', display_name->>'en')
  INTO v_source_name
  FROM public.industry_knowledge_nodes
  WHERE id = p_node_id AND is_active = true;
  
  RETURN QUERY
  SELECT 
    n.id AS duplicate_node_id,
    COALESCE(n.display_name->>'vi', n.display_name->>'en') AS duplicate_name,
    n.node_key AS duplicate_node_key,
    n.source_url AS duplicate_source_url,
    n.content_quality_score AS duplicate_quality,
    n.created_at AS duplicate_created_at,
    (1 - (n.embedding <=> src.embedding))::FLOAT AS similarity,
    CASE 
      WHEN (1 - (n.embedding <=> src.embedding)) >= 0.95 THEN 'exact'
      WHEN LOWER(COALESCE(n.display_name->>'vi', n.display_name->>'en')) = LOWER(v_source_name) THEN 'exact_title'
      ELSE 'semantic'
    END AS match_type
  FROM public.industry_knowledge_nodes n
  CROSS JOIN (
    SELECT embedding FROM public.industry_knowledge_nodes WHERE id = p_node_id
  ) src
  WHERE n.id != p_node_id
    AND n.node_type = 'regulation'
    AND n.is_active = true
    AND n.embedding IS NOT NULL
    AND src.embedding IS NOT NULL
    AND (1 - (n.embedding <=> src.embedding)) >= p_similarity_threshold
  ORDER BY similarity DESC
  LIMIT p_limit;
END;
$$;

-- Function to merge duplicate nodes
CREATE OR REPLACE FUNCTION public.merge_duplicate_nodes(
  p_keep_node_id UUID,
  p_remove_node_ids UUID[],
  p_performed_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_edges_transferred INT := 0;
  v_nodes_deactivated INT := 0;
  v_remove_id UUID;
  v_keep_node_name TEXT;
BEGIN
  SELECT COALESCE(display_name->>'vi', display_name->>'en')
  INTO v_keep_node_name
  FROM public.industry_knowledge_nodes
  WHERE id = p_keep_node_id;
  
  FOREACH v_remove_id IN ARRAY p_remove_node_ids
  LOOP
    -- Transfer outgoing edges
    UPDATE public.industry_knowledge_edges
    SET source_node_id = p_keep_node_id
    WHERE source_node_id = v_remove_id
      AND target_node_id != p_keep_node_id
      AND NOT EXISTS (
        SELECT 1 FROM public.industry_knowledge_edges e2
        WHERE e2.source_node_id = p_keep_node_id
          AND e2.target_node_id = industry_knowledge_edges.target_node_id
          AND e2.edge_type = industry_knowledge_edges.edge_type
      );
    
    v_edges_transferred := v_edges_transferred + FOUND::INT;
    
    -- Transfer incoming edges
    UPDATE public.industry_knowledge_edges
    SET target_node_id = p_keep_node_id
    WHERE target_node_id = v_remove_id
      AND source_node_id != p_keep_node_id
      AND NOT EXISTS (
        SELECT 1 FROM public.industry_knowledge_edges e2
        WHERE e2.target_node_id = p_keep_node_id
          AND e2.source_node_id = industry_knowledge_edges.source_node_id
          AND e2.edge_type = industry_knowledge_edges.edge_type
      );
    
    v_edges_transferred := v_edges_transferred + FOUND::INT;
    
    -- Delete remaining duplicate edges
    DELETE FROM public.industry_knowledge_edges
    WHERE source_node_id = v_remove_id OR target_node_id = v_remove_id;
    
    -- Soft delete the duplicate node
    UPDATE public.industry_knowledge_nodes
    SET is_active = false,
        updated_at = now(),
        properties = COALESCE(properties, '{}'::JSONB) || jsonb_build_object(
          'merged_into', p_keep_node_id,
          'merged_at', now(),
          'merged_by', p_performed_by
        )
    WHERE id = v_remove_id;
    
    v_nodes_deactivated := v_nodes_deactivated + 1;
  END LOOP;
  
  -- Log the merge action
  INSERT INTO public.regulation_propagation_log (
    regulation_node_id,
    change_type,
    change_summary,
    status,
    priority,
    affected_industries,
    created_by
  ) VALUES (
    p_keep_node_id,
    'update',
    jsonb_build_object(
      'vi', 'Đã gộp ' || v_nodes_deactivated || ' node trùng lặp',
      'en', 'Merged ' || v_nodes_deactivated || ' duplicate nodes'
    ),
    'completed',
    'low',
    ARRAY[]::UUID[],
    p_performed_by
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'keep_node_id', p_keep_node_id,
    'keep_node_name', v_keep_node_name,
    'nodes_deactivated', v_nodes_deactivated,
    'edges_transferred', v_edges_transferred
  );
END;
$$;

-- Table for ignored duplicate pairs
CREATE TABLE IF NOT EXISTS public.duplicate_ignore_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id_1 UUID NOT NULL REFERENCES public.industry_knowledge_nodes(id) ON DELETE CASCADE,
  node_id_2 UUID NOT NULL REFERENCES public.industry_knowledge_nodes(id) ON DELETE CASCADE,
  ignored_by UUID,
  ignored_at TIMESTAMPTZ DEFAULT now(),
  reason TEXT,
  UNIQUE(node_id_1, node_id_2)
);

CREATE INDEX IF NOT EXISTS idx_duplicate_ignore_lookup 
ON public.duplicate_ignore_list(node_id_1, node_id_2);

ALTER TABLE public.duplicate_ignore_list ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to duplicate_ignore_list" ON public.duplicate_ignore_list
  FOR ALL USING (true) WITH CHECK (true);