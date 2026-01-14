-- Fix return type mismatch for quality scores (smallint vs integer)
DROP FUNCTION IF EXISTS public.find_duplicate_regulations(FLOAT, INT);
DROP FUNCTION IF EXISTS public.find_node_duplicates(UUID, FLOAT, INT);

-- Recreate with correct types
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

-- Recreate find_node_duplicates with correct types
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
  duplicate_quality SMALLINT,
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