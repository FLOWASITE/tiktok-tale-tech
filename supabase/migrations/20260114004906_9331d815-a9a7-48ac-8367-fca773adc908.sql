
-- Add title-based duplicate detection (no embedding required)
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
  quality_1 SMALLINT,
  quality_2 SMALLINT,
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
  -- First: Exact title matches (regardless of embedding)
  SELECT DISTINCT ON (LEAST(r1.id, r2.id), GREATEST(r1.id, r2.id))
    r1.id AS node_id_1,
    r2.id AS node_id_2,
    COALESCE(r1.display_name->>'vi', r1.display_name->>'en') AS name_1,
    COALESCE(r2.display_name->>'vi', r2.display_name->>'en') AS name_2,
    r1.node_key AS node_key_1,
    r2.node_key AS node_key_2,
    r1.source_url AS source_url_1,
    r2.source_url AS source_url_2,
    r1.content_quality_score AS quality_1,
    r2.content_quality_score AS quality_2,
    r1.created_at AS created_at_1,
    r2.created_at AS created_at_2,
    1.0::FLOAT AS similarity,
    'exact_title'::TEXT AS match_type
  FROM public.industry_knowledge_nodes r1
  CROSS JOIN public.industry_knowledge_nodes r2
  WHERE r1.node_type = 'regulation'
    AND r2.node_type = 'regulation'
    AND r1.is_active = true
    AND r2.is_active = true
    AND r1.id < r2.id
    AND LOWER(TRIM(COALESCE(r1.display_name->>'vi', r1.display_name->>'en'))) = 
        LOWER(TRIM(COALESCE(r2.display_name->>'vi', r2.display_name->>'en')))
  
  UNION ALL
  
  -- Second: Semantic matches (only for nodes with embeddings)
  SELECT DISTINCT ON (LEAST(r1.id, r2.id), GREATEST(r1.id, r2.id))
    r1.id AS node_id_1,
    r2.id AS node_id_2,
    COALESCE(r1.display_name->>'vi', r1.display_name->>'en') AS name_1,
    COALESCE(r2.display_name->>'vi', r2.display_name->>'en') AS name_2,
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
  FROM public.industry_knowledge_nodes r1
  CROSS JOIN public.industry_knowledge_nodes r2
  WHERE r1.node_type = 'regulation'
    AND r2.node_type = 'regulation'
    AND r1.is_active = true
    AND r2.is_active = true
    AND r1.id < r2.id
    AND r1.embedding IS NOT NULL
    AND r2.embedding IS NOT NULL
    AND (1 - (r1.embedding <=> r2.embedding)) >= p_similarity_threshold
    -- Exclude pairs already matched by exact title
    AND LOWER(TRIM(COALESCE(r1.display_name->>'vi', r1.display_name->>'en'))) != 
        LOWER(TRIM(COALESCE(r2.display_name->>'vi', r2.display_name->>'en')))
  
  ORDER BY similarity DESC
  LIMIT p_limit;
END;
$$;

-- Also add a function to get embedding stats for the UI
CREATE OR REPLACE FUNCTION public.get_regulation_embedding_stats()
RETURNS TABLE (
  total_regulations BIGINT,
  with_embedding BIGINT,
  missing_embedding BIGINT,
  embedding_percentage FLOAT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    COUNT(*) as total_regulations,
    SUM(CASE WHEN embedding IS NOT NULL THEN 1 ELSE 0 END)::BIGINT as with_embedding,
    SUM(CASE WHEN embedding IS NULL THEN 1 ELSE 0 END)::BIGINT as missing_embedding,
    ROUND((SUM(CASE WHEN embedding IS NOT NULL THEN 1 ELSE 0 END)::FLOAT / NULLIF(COUNT(*), 0) * 100)::NUMERIC, 1)::FLOAT as embedding_percentage
  FROM industry_knowledge_nodes
  WHERE node_type = 'regulation' AND is_active = true;
$$;
