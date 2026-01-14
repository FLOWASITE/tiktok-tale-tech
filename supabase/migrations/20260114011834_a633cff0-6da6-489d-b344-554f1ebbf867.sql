
-- Drop and recreate functions with improved duplicate detection logic
DROP FUNCTION IF EXISTS public.find_duplicate_regulations(FLOAT, INT);
DROP FUNCTION IF EXISTS public.find_node_duplicates(UUID, FLOAT, INT);

-- Recreate with STRICT conditions to prevent false positives
CREATE OR REPLACE FUNCTION public.find_duplicate_regulations(
  p_similarity_threshold FLOAT DEFAULT 0.85,
  p_limit INT DEFAULT 100
)
RETURNS TABLE(
  node_id_1 UUID,
  node_id_2 UUID,
  name_1 TEXT,
  name_2 TEXT,
  similarity FLOAT,
  match_type TEXT,
  quality_1 SMALLINT,
  quality_2 SMALLINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH regulation_nodes AS (
    SELECT 
      n.id,
      n.display_name->>'vi' as name_vi,
      n.display_name->>'en' as name_en,
      n.embedding,
      n.content_quality_score,
      -- Extract document number pattern (e.g., "40/2025" from "Thông tư 40/2025/TT-BTC")
      (regexp_match(COALESCE(n.display_name->>'vi', n.display_name->>'en', ''), '(\d+/\d{4})'))[1] as doc_number,
      -- Extract full document code (e.g., "40/2025/TT-BTC")
      (regexp_match(COALESCE(n.display_name->>'vi', n.display_name->>'en', ''), '(\d+/\d{4}/[A-Za-z\-]+)'))[1] as doc_code
    FROM industry_knowledge_nodes n
    WHERE n.node_type = 'regulation'
      AND n.is_active = true
  ),
  -- Exact title matches (same display name)
  exact_matches AS (
    SELECT 
      n1.id as nid1,
      n2.id as nid2,
      COALESCE(n1.name_vi, n1.name_en) as name1,
      COALESCE(n2.name_vi, n2.name_en) as name2,
      1.0::FLOAT as sim,
      'exact_title'::TEXT as mtype,
      n1.content_quality_score as q1,
      n2.content_quality_score as q2
    FROM regulation_nodes n1
    JOIN regulation_nodes n2 ON n1.id < n2.id
    WHERE LOWER(TRIM(COALESCE(n1.name_vi, n1.name_en, ''))) = LOWER(TRIM(COALESCE(n2.name_vi, n2.name_en, '')))
      AND COALESCE(n1.name_vi, n1.name_en, '') != ''
  ),
  -- Semantic matches - STRICT conditions to prevent false positives
  semantic_matches AS (
    SELECT 
      n1.id as nid1,
      n2.id as nid2,
      COALESCE(n1.name_vi, n1.name_en) as name1,
      COALESCE(n2.name_vi, n2.name_en) as name2,
      (1 - (n1.embedding <=> n2.embedding))::FLOAT as sim,
      'semantic'::TEXT as mtype,
      n1.content_quality_score as q1,
      n2.content_quality_score as q2
    FROM regulation_nodes n1
    JOIN regulation_nodes n2 ON n1.id < n2.id
    WHERE n1.embedding IS NOT NULL 
      AND n2.embedding IS NOT NULL
      -- STRICT matching rules:
      AND (
        -- Case 1: Both have exact same document CODE (e.g., "40/2025/TT-BTC" = "40/2025/TT-BTC")
        (n1.doc_code IS NOT NULL AND n2.doc_code IS NOT NULL AND n1.doc_code = n2.doc_code)
        OR
        -- Case 2: Both have same doc number AND similarity is VERY high (>0.92)
        (n1.doc_number IS NOT NULL AND n2.doc_number IS NOT NULL 
         AND n1.doc_number = n2.doc_number
         AND (1 - (n1.embedding <=> n2.embedding)) >= 0.92)
        OR
        -- Case 3: NEITHER has doc number AND similarity is EXTREMELY high (>0.95)
        -- This catches "Luật ABC 2025" duplicated with different wording
        (n1.doc_number IS NULL AND n2.doc_number IS NULL 
         AND (1 - (n1.embedding <=> n2.embedding)) >= 0.95)
      )
      AND (1 - (n1.embedding <=> n2.embedding)) >= p_similarity_threshold
      -- Exclude pairs already matched by exact title
      AND NOT EXISTS (
        SELECT 1 FROM exact_matches em 
        WHERE (em.nid1 = n1.id AND em.nid2 = n2.id)
      )
  )
  SELECT * FROM exact_matches
  UNION ALL
  SELECT * FROM semantic_matches
  ORDER BY sim DESC
  LIMIT p_limit;
END;
$$;

-- Recreate find_node_duplicates with same strict logic
CREATE OR REPLACE FUNCTION public.find_node_duplicates(
  p_node_id UUID,
  p_similarity_threshold FLOAT DEFAULT 0.85,
  p_limit INT DEFAULT 20
)
RETURNS TABLE(
  duplicate_id UUID,
  duplicate_name TEXT,
  similarity FLOAT,
  match_type TEXT,
  duplicate_quality SMALLINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_source_embedding vector(384);
  v_source_name TEXT;
  v_source_doc_number TEXT;
  v_source_doc_code TEXT;
BEGIN
  -- Get source node info
  SELECT 
    n.embedding,
    COALESCE(n.display_name->>'vi', n.display_name->>'en'),
    (regexp_match(COALESCE(n.display_name->>'vi', n.display_name->>'en', ''), '(\d+/\d{4})'))[1],
    (regexp_match(COALESCE(n.display_name->>'vi', n.display_name->>'en', ''), '(\d+/\d{4}/[A-Za-z\-]+)'))[1]
  INTO v_source_embedding, v_source_name, v_source_doc_number, v_source_doc_code
  FROM industry_knowledge_nodes n
  WHERE n.id = p_node_id;

  RETURN QUERY
  WITH target_nodes AS (
    SELECT 
      n.id,
      COALESCE(n.display_name->>'vi', n.display_name->>'en') as node_name,
      n.embedding,
      n.content_quality_score,
      (regexp_match(COALESCE(n.display_name->>'vi', n.display_name->>'en', ''), '(\d+/\d{4})'))[1] as doc_number,
      (regexp_match(COALESCE(n.display_name->>'vi', n.display_name->>'en', ''), '(\d+/\d{4}/[A-Za-z\-]+)'))[1] as doc_code
    FROM industry_knowledge_nodes n
    WHERE n.id != p_node_id
      AND n.node_type = 'regulation'
      AND n.is_active = true
  )
  -- Exact title matches
  SELECT 
    t.id as duplicate_id,
    t.node_name as duplicate_name,
    1.0::FLOAT as similarity,
    'exact_title'::TEXT as match_type,
    t.content_quality_score as duplicate_quality
  FROM target_nodes t
  WHERE LOWER(TRIM(t.node_name)) = LOWER(TRIM(v_source_name))
    AND v_source_name IS NOT NULL AND v_source_name != ''
  
  UNION ALL
  
  -- Semantic matches with STRICT conditions
  SELECT 
    t.id as duplicate_id,
    t.node_name as duplicate_name,
    (1 - (t.embedding <=> v_source_embedding))::FLOAT as similarity,
    'semantic'::TEXT as match_type,
    t.content_quality_score as duplicate_quality
  FROM target_nodes t
  WHERE v_source_embedding IS NOT NULL
    AND t.embedding IS NOT NULL
    AND (
      -- Case 1: Exact same document code
      (v_source_doc_code IS NOT NULL AND t.doc_code IS NOT NULL AND v_source_doc_code = t.doc_code)
      OR
      -- Case 2: Same doc number AND very high similarity
      (v_source_doc_number IS NOT NULL AND t.doc_number IS NOT NULL 
       AND v_source_doc_number = t.doc_number
       AND (1 - (t.embedding <=> v_source_embedding)) >= 0.92)
      OR
      -- Case 3: Neither has doc number AND extremely high similarity
      (v_source_doc_number IS NULL AND t.doc_number IS NULL 
       AND (1 - (t.embedding <=> v_source_embedding)) >= 0.95)
    )
    AND (1 - (t.embedding <=> v_source_embedding)) >= p_similarity_threshold
    AND LOWER(TRIM(t.node_name)) != LOWER(TRIM(v_source_name)) -- Not exact title match
  
  ORDER BY similarity DESC
  LIMIT p_limit;
END;
$$;
