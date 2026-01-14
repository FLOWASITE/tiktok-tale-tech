
CREATE OR REPLACE FUNCTION public.merge_duplicate_nodes(
  p_keep_node_id uuid,
  p_remove_node_ids uuid[],
  p_performed_by uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
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
    v_edges_transferred := v_edges_transferred + (CASE WHEN FOUND THEN 1 ELSE 0 END);
    
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
    v_edges_transferred := v_edges_transferred + (CASE WHEN FOUND THEN 1 ELSE 0 END);
    
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
  
  -- Log the merge action (respect CHECK constraints)
  INSERT INTO public.regulation_propagation_log (
    source_node_id,
    change_type,
    change_summary,
    propagation_status,
    priority,
    reviewed_by,
    reviewed_at,
    review_status,
    propagated_at
  ) VALUES (
    p_keep_node_id,
    'updated',
    'Merged ' || v_nodes_deactivated || ' duplicate nodes into ' || COALESCE(v_keep_node_name, p_keep_node_id::text),
    'applied',
    'low',
    p_performed_by,
    CASE WHEN p_performed_by IS NULL THEN NULL ELSE now() END,
    CASE WHEN p_performed_by IS NULL THEN 'pending' ELSE 'approved' END,
    now()
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
