-- ============================================
-- Industry Park Knowledge Graph - Phase 1
-- Core Schema: Nodes, Edges, Propagation Log
-- ============================================

-- 1. KNOWLEDGE NODES TABLE
CREATE TABLE public.industry_knowledge_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  global_pack_id UUID REFERENCES public.industry_global_packs(id) ON DELETE CASCADE,
  node_type TEXT NOT NULL CHECK (node_type IN ('industry', 'regulation', 'term', 'concept', 'persona', 'jurisdiction')),
  node_key TEXT NOT NULL,
  display_name JSONB NOT NULL DEFAULT '{}',
  description JSONB DEFAULT '{}',
  properties JSONB DEFAULT '{}',
  embedding extensions.vector(1536),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(node_type, node_key)
);

-- 2. KNOWLEDGE EDGES TABLE
CREATE TABLE public.industry_knowledge_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_node_id UUID NOT NULL REFERENCES public.industry_knowledge_nodes(id) ON DELETE CASCADE,
  target_node_id UUID NOT NULL REFERENCES public.industry_knowledge_nodes(id) ON DELETE CASCADE,
  edge_type TEXT NOT NULL CHECK (edge_type IN (
    'related_to', 'parent_of', 'regulated_by', 'uses_term', 
    'shares_audience', 'competes_with', 'requires_compliance', 
    'derived_from', 'applies_to'
  )),
  weight FLOAT DEFAULT 1.0 CHECK (weight >= 0.0 AND weight <= 1.0),
  properties JSONB DEFAULT '{}',
  is_bidirectional BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(source_node_id, target_node_id, edge_type)
);

-- 3. REGULATION PROPAGATION LOG
CREATE TABLE public.regulation_propagation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_node_id UUID REFERENCES public.industry_knowledge_nodes(id) ON DELETE SET NULL,
  affected_pack_id UUID REFERENCES public.industry_global_packs(id) ON DELETE CASCADE,
  change_type TEXT NOT NULL CHECK (change_type IN ('new', 'updated', 'deprecated', 'enforcement_change')),
  change_summary TEXT,
  impact_analysis JSONB DEFAULT '{}',
  affected_rules JSONB DEFAULT '[]',
  propagation_status TEXT DEFAULT 'pending' CHECK (propagation_status IN ('pending', 'analyzing', 'ready', 'applied', 'reviewed', 'rejected')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  propagated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. KNOWLEDGE GRAPH CACHE
CREATE TABLE public.knowledge_graph_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT NOT NULL UNIQUE,
  start_node_id UUID REFERENCES public.industry_knowledge_nodes(id) ON DELETE CASCADE,
  traversal_result JSONB NOT NULL,
  hit_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_knowledge_nodes_type ON public.industry_knowledge_nodes(node_type);
CREATE INDEX idx_knowledge_nodes_pack ON public.industry_knowledge_nodes(global_pack_id);
CREATE INDEX idx_knowledge_nodes_key ON public.industry_knowledge_nodes(node_key);
CREATE INDEX idx_knowledge_nodes_active ON public.industry_knowledge_nodes(is_active) WHERE is_active = true;
CREATE INDEX idx_knowledge_nodes_embedding ON public.industry_knowledge_nodes 
  USING ivfflat (embedding extensions.vector_cosine_ops) WITH (lists = 100);

CREATE INDEX idx_knowledge_edges_source ON public.industry_knowledge_edges(source_node_id);
CREATE INDEX idx_knowledge_edges_target ON public.industry_knowledge_edges(target_node_id);
CREATE INDEX idx_knowledge_edges_type ON public.industry_knowledge_edges(edge_type);
CREATE INDEX idx_knowledge_edges_weight ON public.industry_knowledge_edges(weight DESC);

CREATE INDEX idx_propagation_status ON public.regulation_propagation_log(propagation_status);
CREATE INDEX idx_propagation_pack ON public.regulation_propagation_log(affected_pack_id);
CREATE INDEX idx_propagation_priority ON public.regulation_propagation_log(priority);

CREATE INDEX idx_kg_cache_expires ON public.knowledge_graph_cache(expires_at);

-- ============================================
-- TRIGGERS
-- ============================================
CREATE TRIGGER update_knowledge_nodes_updated_at
  BEFORE UPDATE ON public.industry_knowledge_nodes
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

-- ============================================
-- GRAPH FUNCTIONS
-- ============================================

-- 1. SEMANTIC SEARCH
CREATE OR REPLACE FUNCTION public.search_knowledge_nodes(
  p_query_embedding extensions.vector(1536),
  p_node_types TEXT[] DEFAULT NULL,
  p_global_pack_id UUID DEFAULT NULL,
  p_threshold FLOAT DEFAULT 0.7,
  p_limit INT DEFAULT 10
) RETURNS TABLE (
  node_id UUID, node_type TEXT, node_key TEXT, display_name JSONB, properties JSONB, similarity FLOAT
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT n.id, n.node_type, n.node_key, n.display_name, n.properties,
    (1 - (n.embedding <=> p_query_embedding))::FLOAT AS similarity
  FROM public.industry_knowledge_nodes n
  WHERE n.is_active = true AND n.embedding IS NOT NULL
    AND (p_node_types IS NULL OR n.node_type = ANY(p_node_types))
    AND (p_global_pack_id IS NULL OR n.global_pack_id = p_global_pack_id)
    AND (1 - (n.embedding <=> p_query_embedding)) > p_threshold
  ORDER BY n.embedding <=> p_query_embedding
  LIMIT p_limit;
END;
$$;

-- 2. GET CONNECTED NODES
CREATE OR REPLACE FUNCTION public.get_connected_nodes(
  p_node_id UUID,
  p_edge_types TEXT[] DEFAULT NULL,
  p_direction TEXT DEFAULT 'both'
) RETURNS TABLE (
  node_id UUID, node_type TEXT, node_key TEXT, display_name JSONB, edge_type TEXT, edge_weight FLOAT, direction TEXT
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT n.id, n.node_type, n.node_key, n.display_name, e.edge_type, e.weight, 'outgoing'::TEXT
  FROM public.industry_knowledge_edges e
  JOIN public.industry_knowledge_nodes n ON n.id = e.target_node_id
  WHERE e.source_node_id = p_node_id AND n.is_active = true
    AND (p_edge_types IS NULL OR e.edge_type = ANY(p_edge_types))
    AND p_direction IN ('outgoing', 'both')
  UNION ALL
  SELECT n.id, n.node_type, n.node_key, n.display_name, e.edge_type, e.weight, 'incoming'::TEXT
  FROM public.industry_knowledge_edges e
  JOIN public.industry_knowledge_nodes n ON n.id = e.source_node_id
  WHERE e.target_node_id = p_node_id AND n.is_active = true
    AND (p_edge_types IS NULL OR e.edge_type = ANY(p_edge_types))
    AND p_direction IN ('incoming', 'both')
  ORDER BY edge_weight DESC;
END;
$$;

-- 3. TRAVERSE GRAPH (BFS)
CREATE OR REPLACE FUNCTION public.traverse_knowledge_graph(
  p_start_node_id UUID,
  p_edge_types TEXT[] DEFAULT NULL,
  p_max_depth INT DEFAULT 3,
  p_min_weight FLOAT DEFAULT 0.0
) RETURNS TABLE (
  node_id UUID, node_type TEXT, node_key TEXT, display_name JSONB, depth INT, path_weight FLOAT, path TEXT[]
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE graph_traversal AS (
    SELECT n.id, n.node_type, n.node_key, n.display_name, 0 AS depth, 1.0::FLOAT AS path_weight, ARRAY[n.node_key] AS path
    FROM public.industry_knowledge_nodes n
    WHERE n.id = p_start_node_id AND n.is_active = true
    UNION
    SELECT n.id, n.node_type, n.node_key, n.display_name, gt.depth + 1, (gt.path_weight * e.weight)::FLOAT, gt.path || n.node_key
    FROM graph_traversal gt
    JOIN public.industry_knowledge_edges e ON e.source_node_id = gt.id
    JOIN public.industry_knowledge_nodes n ON n.id = e.target_node_id
    WHERE gt.depth < p_max_depth AND n.is_active = true AND e.weight >= p_min_weight
      AND NOT (n.node_key = ANY(gt.path))
      AND (p_edge_types IS NULL OR e.edge_type = ANY(p_edge_types))
  )
  SELECT DISTINCT ON (gt.id) gt.id, gt.node_type, gt.node_key, gt.display_name, gt.depth, gt.path_weight, gt.path
  FROM graph_traversal gt WHERE gt.depth > 0
  ORDER BY gt.id, gt.path_weight DESC;
END;
$$;

-- 4. GET RELATED INDUSTRIES
CREATE OR REPLACE FUNCTION public.get_related_industries(
  p_global_pack_id UUID,
  p_min_weight FLOAT DEFAULT 0.5,
  p_limit INT DEFAULT 5
) RETURNS TABLE (
  industry_pack_id UUID, industry_code TEXT, industry_name JSONB, relationship_type TEXT, relationship_weight FLOAT
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT igp.id, igp.industry_code, n_target.display_name, e.edge_type, e.weight
  FROM public.industry_knowledge_nodes n_source
  JOIN public.industry_knowledge_edges e ON e.source_node_id = n_source.id
  JOIN public.industry_knowledge_nodes n_target ON n_target.id = e.target_node_id
  JOIN public.industry_global_packs igp ON igp.id = n_target.global_pack_id
  WHERE n_source.global_pack_id = p_global_pack_id
    AND n_source.node_type = 'industry' AND n_target.node_type = 'industry'
    AND n_target.is_active = true AND igp.is_active = true
    AND e.weight >= p_min_weight
    AND e.edge_type IN ('related_to', 'shares_audience', 'competes_with')
  ORDER BY e.weight DESC LIMIT p_limit;
END;
$$;

-- 5. GET REGULATIONS FOR INDUSTRY
CREATE OR REPLACE FUNCTION public.get_industry_regulations(
  p_global_pack_id UUID,
  p_include_inherited BOOLEAN DEFAULT true
) RETURNS TABLE (
  regulation_node_id UUID, regulation_key TEXT, regulation_name JSONB, regulation_properties JSONB, relationship_type TEXT, is_inherited BOOLEAN
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT n_reg.id, n_reg.node_key, n_reg.display_name, n_reg.properties, e.edge_type, false
  FROM public.industry_knowledge_nodes n_ind
  JOIN public.industry_knowledge_edges e ON e.source_node_id = n_ind.id
  JOIN public.industry_knowledge_nodes n_reg ON n_reg.id = e.target_node_id
  WHERE n_ind.global_pack_id = p_global_pack_id AND n_ind.node_type = 'industry'
    AND n_reg.node_type = 'regulation' AND n_reg.is_active = true
    AND e.edge_type IN ('regulated_by', 'requires_compliance')
  UNION
  SELECT n_reg.id, n_reg.node_key, n_reg.display_name, n_reg.properties, e2.edge_type, true
  FROM public.industry_knowledge_nodes n_ind
  JOIN public.industry_knowledge_edges e1 ON e1.target_node_id = n_ind.id
  JOIN public.industry_knowledge_nodes n_parent ON n_parent.id = e1.source_node_id
  JOIN public.industry_knowledge_edges e2 ON e2.source_node_id = n_parent.id
  JOIN public.industry_knowledge_nodes n_reg ON n_reg.id = e2.target_node_id
  WHERE n_ind.global_pack_id = p_global_pack_id AND n_ind.node_type = 'industry'
    AND e1.edge_type = 'parent_of' AND n_parent.node_type = 'industry'
    AND n_reg.node_type = 'regulation' AND n_reg.is_active = true
    AND e2.edge_type IN ('regulated_by', 'requires_compliance')
    AND p_include_inherited = true
  ORDER BY is_inherited, regulation_key;
END;
$$;

-- 6. CLEANUP CACHE
CREATE OR REPLACE FUNCTION public.cleanup_knowledge_graph_cache()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE deleted_count INTEGER;
BEGIN
  DELETE FROM public.knowledge_graph_cache WHERE expires_at < now();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.industry_knowledge_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.industry_knowledge_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regulation_propagation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_graph_cache ENABLE ROW LEVEL SECURITY;

-- Nodes: Read for authenticated, manage for admin
CREATE POLICY "Knowledge nodes viewable by authenticated" ON public.industry_knowledge_nodes 
  FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Admins manage knowledge nodes" ON public.industry_knowledge_nodes 
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Edges: Read for authenticated, manage for admin
CREATE POLICY "Knowledge edges viewable by authenticated" ON public.industry_knowledge_edges 
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage knowledge edges" ON public.industry_knowledge_edges 
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Propagation Log: Admin only (since industry_global_packs has no org_id)
CREATE POLICY "Admins view propagation logs" ON public.regulation_propagation_log 
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage propagation logs" ON public.regulation_propagation_log 
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Cache: Read for authenticated
CREATE POLICY "Cache readable by authenticated" ON public.knowledge_graph_cache 
  FOR SELECT TO authenticated USING (expires_at > now());
CREATE POLICY "Service role manages cache" ON public.knowledge_graph_cache 
  FOR ALL TO service_role USING (true) WITH CHECK (true);