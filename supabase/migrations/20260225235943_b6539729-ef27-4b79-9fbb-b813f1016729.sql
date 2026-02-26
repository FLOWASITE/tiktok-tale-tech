
-- Step 1: Add session_id and node_name columns to content_embeddings
ALTER TABLE content_embeddings ADD COLUMN IF NOT EXISTS session_id UUID;
ALTER TABLE content_embeddings ADD COLUMN IF NOT EXISTS node_name TEXT;

-- Indexes for blackboard queries
CREATE INDEX IF NOT EXISTS idx_ce_session ON content_embeddings(session_id);
CREATE INDEX IF NOT EXISTS idx_ce_node_name ON content_embeddings(node_name);

-- RPC function: match_blackboard_context
-- Hybrid vector search with session/brand priority scoring
CREATE OR REPLACE FUNCTION public.match_blackboard_context(
  query_embedding vector(384),
  match_session_id UUID DEFAULT NULL,
  match_brand_id UUID DEFAULT NULL,
  match_node_types TEXT[] DEFAULT NULL,
  match_threshold FLOAT DEFAULT 0.65,
  match_count INT DEFAULT 8
)
RETURNS TABLE (
  id UUID,
  content_type TEXT,
  content_text TEXT,
  node_name TEXT,
  session_id UUID,
  brand_template_id UUID,
  similarity FLOAT,
  priority_score FLOAT,
  metadata JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ce.id,
    ce.content_type,
    ce.content_text,
    ce.node_name,
    ce.session_id,
    ce.brand_template_id,
    (1 - (ce.embedding <=> query_embedding))::FLOAT AS similarity,
    -- Priority: same session (+0.15) > same brand (+0.05) > global (0)
    (
      (1 - (ce.embedding <=> query_embedding))
      + CASE WHEN match_session_id IS NOT NULL AND ce.session_id = match_session_id THEN 0.15 ELSE 0 END
      + CASE WHEN match_brand_id IS NOT NULL AND ce.brand_template_id = match_brand_id THEN 0.05 ELSE 0 END
    )::FLOAT AS priority_score,
    ce.metadata,
    ce.created_at
  FROM public.content_embeddings ce
  WHERE ce.embedding IS NOT NULL
    AND (1 - (ce.embedding <=> query_embedding)) > match_threshold
    AND (match_node_types IS NULL OR ce.node_name = ANY(match_node_types))
    AND (
      match_brand_id IS NULL
      OR ce.brand_template_id = match_brand_id
      OR ce.organization_id = (
        SELECT bt.organization_id FROM brand_templates bt WHERE bt.id = match_brand_id LIMIT 1
      )
    )
  ORDER BY priority_score DESC
  LIMIT match_count;
END;
$$;
