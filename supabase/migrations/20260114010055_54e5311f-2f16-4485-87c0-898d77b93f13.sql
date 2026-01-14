
-- Fix: Exclude false positives by comparing document numbers
-- Documents with different numbers (e.g., 40/2025, 154/2025) should NOT be considered duplicates

CREATE OR REPLACE FUNCTION public.find_duplicate_regulations(
  p_similarity_threshold FLOAT DEFAULT 0.85,
  p_limit INT DEFAULT 100
)
RETURNS TABLE (
  node_id_1 UUID,
  node_id_2 UUID,
  display_name_1 TEXT,
  display_name_2 TEXT,
  similarity FLOAT,
  match_type TEXT,
  quality_1 SMALLINT,
  quality_2 SMALLINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
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
      (regexp_match(COALESCE(n.display_name->>'vi', n.display_name->>'en', ''), '(\d+/\d{4})'))[1] as doc_number
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
  -- Semantic matches - ONLY if documents have the SAME document number or one is missing
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
      -- Key fix: Only compare if document numbers match OR one/both are null
      AND (
        n1.doc_number IS NULL 
        OR n2.doc_number IS NULL 
        OR n1.doc_number = n2.doc_number
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

-- Also fix find_node_duplicates to use the same logic
CREATE OR REPLACE FUNCTION public.find_node_duplicates(
  p_node_id UUID,
  p_similarity_threshold FLOAT DEFAULT 0.85,
  p_limit INT DEFAULT 20
)
RETURNS TABLE (
  duplicate_id UUID,
  duplicate_name TEXT,
  similarity FLOAT,
  match_type TEXT,
  duplicate_quality SMALLINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_embedding extensions.vector(384);
  v_name_vi TEXT;
  v_name_en TEXT;
  v_doc_number TEXT;
BEGIN
  -- Get the source node's embedding, name, and document number
  SELECT 
    n.embedding,
    n.display_name->>'vi',
    n.display_name->>'en',
    (regexp_match(COALESCE(n.display_name->>'vi', n.display_name->>'en', ''), '(\d+/\d{4})'))[1]
  INTO v_embedding, v_name_vi, v_name_en, v_doc_number
  FROM industry_knowledge_nodes n
  WHERE n.id = p_node_id;
  
  IF v_name_vi IS NULL AND v_name_en IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  WITH source_name AS (
    SELECT LOWER(TRIM(COALESCE(v_name_vi, v_name_en, ''))) as normalized_name
  ),
  candidates AS (
    SELECT 
      n.id,
      COALESCE(n.display_name->>'vi', n.display_name->>'en') as name,
      n.embedding,
      n.content_quality_score,
      (regexp_match(COALESCE(n.display_name->>'vi', n.display_name->>'en', ''), '(\d+/\d{4})'))[1] as candidate_doc_number
    FROM industry_knowledge_nodes n
    WHERE n.node_type = 'regulation'
      AND n.is_active = true
      AND n.id != p_node_id
  ),
  -- Exact matches
  exact AS (
    SELECT 
      c.id as dup_id,
      c.name as dup_name,
      1.0::FLOAT as sim,
      'exact_title'::TEXT as mtype,
      c.content_quality_score as dup_quality
    FROM candidates c, source_name s
    WHERE LOWER(TRIM(c.name)) = s.normalized_name
      AND s.normalized_name != ''
  ),
  -- Semantic matches - only if doc numbers match or are missing
  semantic AS (
    SELECT 
      c.id as dup_id,
      c.name as dup_name,
      (1 - (v_embedding <=> c.embedding))::FLOAT as sim,
      'semantic'::TEXT as mtype,
      c.content_quality_score as dup_quality
    FROM candidates c
    WHERE v_embedding IS NOT NULL
      AND c.embedding IS NOT NULL
      -- Key fix: Only compare if document numbers match OR one/both are null
      AND (
        v_doc_number IS NULL 
        OR c.candidate_doc_number IS NULL 
        OR v_doc_number = c.candidate_doc_number
      )
      AND (1 - (v_embedding <=> c.embedding)) >= p_similarity_threshold
      AND NOT EXISTS (SELECT 1 FROM exact e WHERE e.dup_id = c.id)
  )
  SELECT * FROM exact
  UNION ALL
  SELECT * FROM semantic
  ORDER BY sim DESC
  LIMIT p_limit;
END;
$$;
