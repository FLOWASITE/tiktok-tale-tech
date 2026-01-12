-- Enable realtime for knowledge graph tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.industry_knowledge_nodes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.industry_knowledge_edges;
ALTER PUBLICATION supabase_realtime ADD TABLE public.regulation_propagation_log;

-- Add index for faster embedding queries
CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_embedding_not_null 
ON public.industry_knowledge_nodes (id) 
WHERE embedding IS NOT NULL;

-- Add index for node type filtering
CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_type_active 
ON public.industry_knowledge_nodes (node_type, is_active);

-- Add index for edge lookups
CREATE INDEX IF NOT EXISTS idx_knowledge_edges_source 
ON public.industry_knowledge_edges (source_node_id);

CREATE INDEX IF NOT EXISTS idx_knowledge_edges_target 
ON public.industry_knowledge_edges (target_node_id);

CREATE INDEX IF NOT EXISTS idx_knowledge_edges_type 
ON public.industry_knowledge_edges (edge_type);