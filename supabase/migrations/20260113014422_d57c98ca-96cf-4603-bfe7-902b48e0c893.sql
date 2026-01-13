-- Phase 0: Fix RPC function to use vector(384) instead of vector(1536)
-- This is critical for semantic search to work correctly

-- Drop existing function
DROP FUNCTION IF EXISTS public.search_knowledge_nodes(extensions.vector, text[], uuid, double precision, integer);
DROP FUNCTION IF EXISTS public.search_knowledge_nodes(extensions.vector(1536), text[], uuid, double precision, integer);

-- Recreate with correct vector dimension (384 for gte-small model)
CREATE OR REPLACE FUNCTION public.search_knowledge_nodes(
  p_query_embedding extensions.vector(384),
  p_node_types TEXT[] DEFAULT NULL,
  p_global_pack_id UUID DEFAULT NULL,
  p_threshold FLOAT DEFAULT 0.3,
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  node_type TEXT,
  node_key TEXT,
  display_name JSONB,
  description JSONB,
  properties JSONB,
  global_pack_id UUID,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    n.id,
    n.node_type,
    n.node_key,
    n.display_name,
    n.description,
    n.properties,
    n.global_pack_id,
    1 - (n.embedding <=> p_query_embedding) AS similarity
  FROM industry_knowledge_nodes n
  WHERE 
    n.is_active = true
    AND n.embedding IS NOT NULL
    AND (p_node_types IS NULL OR n.node_type = ANY(p_node_types))
    AND (p_global_pack_id IS NULL OR n.global_pack_id = p_global_pack_id)
    AND 1 - (n.embedding <=> p_query_embedding) >= p_threshold
  ORDER BY n.embedding <=> p_query_embedding
  LIMIT p_limit;
END;
$$;

-- Add performance index for embedding similarity search (if not exists)
CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_embedding_active 
ON public.industry_knowledge_nodes USING ivfflat (embedding vector_cosine_ops)
WHERE is_active = true AND embedding IS NOT NULL;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.search_knowledge_nodes TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_knowledge_nodes TO anon;