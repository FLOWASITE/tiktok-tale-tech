
-- Drop existing functions first due to return type change
DROP FUNCTION IF EXISTS public.find_duplicate_regulations(FLOAT, INT);
DROP FUNCTION IF EXISTS public.find_node_duplicates(UUID, FLOAT, INT);

-- Enable fuzzystrmatch for levenshtein function if not already enabled
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch WITH SCHEMA extensions;

-- Helper function: Calculate levenshtein similarity (0-1 scale)
CREATE OR REPLACE FUNCTION public.levenshtein_similarity(text1 TEXT, text2 TEXT)
RETURNS FLOAT AS $$
DECLARE
  max_len INT;
  lev_dist INT;
BEGIN
  IF text1 IS NULL OR text2 IS NULL THEN
    RETURN 0;
  END IF;
  
  max_len := GREATEST(length(text1), length(text2));
  IF max_len = 0 THEN
    RETURN 1;
  END IF;
  
  lev_dist := extensions.levenshtein(text1, text2);
  RETURN 1.0 - (lev_dist::FLOAT / max_len::FLOAT);
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

-- Helper function: Normalize Vietnamese text for comparison
CREATE OR REPLACE FUNCTION public.normalize_vn_text(input_text TEXT)
RETURNS TEXT AS $$
BEGIN
  IF input_text IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN lower(trim(regexp_replace(
    regexp_replace(input_text, '^(Luật|Thông tư|Nghị định|Quyết định|Công văn|Hướng dẫn)\s+', '', 'i'),
    '\s+', ' ', 'g'
  )));
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

-- Helper function: Extract document year from name
CREATE OR REPLACE FUNCTION public.extract_doc_year(doc_name TEXT)
RETURNS TEXT AS $$
DECLARE
  year_match TEXT[];
BEGIN
  IF doc_name IS NULL THEN
    RETURN NULL;
  END IF;
  
  year_match := regexp_match(doc_name, '(\d{4})$');
  IF year_match IS NOT NULL THEN
    RETURN year_match[1];
  END IF;
  
  year_match := regexp_match(doc_name, '/(\d{4})/');
  IF year_match IS NOT NULL THEN
    RETURN year_match[1];
  END IF;
  
  year_match := regexp_match(doc_name, 'năm\s+(\d{4})', 'i');
  IF year_match IS NOT NULL THEN
    RETURN year_match[1];
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

-- Updated find_duplicate_regulations with SUPER STRICT matching
CREATE OR REPLACE FUNCTION public.find_duplicate_regulations(
  similarity_threshold FLOAT DEFAULT 0.85,
  max_results INT DEFAULT 100
)
RETURNS TABLE (
  node_id_1 UUID,
  node_id_2 UUID,
  name_1 TEXT,
  name_2 TEXT,
  similarity FLOAT,
  quality_1 SMALLINT,
  quality_2 SMALLINT,
  match_type TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH regulation_nodes AS (
    SELECT 
      n.id,
      n.display_name,
      n.embedding,
      n.content_quality_score,
      (regexp_match(n.display_name, '(\d+/\d{4}/[A-Za-z\-]+)'))[1] as doc_code,
      (regexp_match(n.display_name, '(\d+/\d{4})'))[1] as doc_number,
      public.extract_doc_year(n.display_name) as doc_year,
      public.normalize_vn_text(n.display_name) as normalized_name
    FROM industry_knowledge_nodes n
    WHERE n.node_type = 'regulation'
      AND n.is_active = true
      AND n.embedding IS NOT NULL
  ),
  duplicate_pairs AS (
    SELECT 
      n1.id as id1,
      n2.id as id2,
      n1.display_name as name1,
      n2.display_name as name2,
      1 - (n1.embedding::extensions.vector(384) <=> n2.embedding::extensions.vector(384)) as sim,
      n1.content_quality_score::SMALLINT as q1,
      n2.content_quality_score::SMALLINT as q2,
      n1.doc_code as dc1,
      n2.doc_code as dc2,
      n1.doc_number as dn1,
      n2.doc_number as dn2,
      n1.doc_year as dy1,
      n2.doc_year as dy2,
      n1.normalized_name as nn1,
      n2.normalized_name as nn2,
      CASE
        WHEN n1.doc_code IS NOT NULL AND n1.doc_code = n2.doc_code THEN 'exact_code'
        WHEN n1.doc_number IS NOT NULL AND n1.doc_number = n2.doc_number THEN 'same_number'
        WHEN n1.doc_number IS NULL AND n2.doc_number IS NULL 
             AND n1.doc_year IS NOT NULL AND n1.doc_year = n2.doc_year THEN 'same_year'
        ELSE 'semantic_only'
      END as mtype
    FROM regulation_nodes n1
    JOIN regulation_nodes n2 ON n1.id < n2.id
    WHERE 1 - (n1.embedding::extensions.vector(384) <=> n2.embedding::extensions.vector(384)) >= similarity_threshold
  )
  SELECT 
    dp.id1,
    dp.id2,
    dp.name1,
    dp.name2,
    dp.sim,
    dp.q1,
    dp.q2,
    dp.mtype
  FROM duplicate_pairs dp
  WHERE
    NOT (dp.dy1 IS NOT NULL AND dp.dy2 IS NOT NULL AND dp.dy1 != dp.dy2)
    AND public.levenshtein_similarity(dp.nn1, dp.nn2) >= 0.6
    AND (
      (dp.mtype = 'exact_code' AND dp.sim >= 0.80)
      OR (dp.mtype = 'same_number' AND dp.sim >= 0.95)
      OR (dp.mtype = 'same_year' AND dp.sim >= 0.98)
    )
  ORDER BY dp.sim DESC
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public;

-- Updated find_node_duplicates for single node check
CREATE OR REPLACE FUNCTION public.find_node_duplicates(
  target_node_id UUID,
  similarity_threshold FLOAT DEFAULT 0.85,
  max_results INT DEFAULT 20
)
RETURNS TABLE (
  duplicate_node_id UUID,
  duplicate_name TEXT,
  similarity FLOAT,
  duplicate_quality SMALLINT,
  match_type TEXT
) AS $$
DECLARE
  target_embedding extensions.vector(384);
  target_name TEXT;
  target_doc_code TEXT;
  target_doc_number TEXT;
  target_doc_year TEXT;
  target_normalized_name TEXT;
BEGIN
  SELECT 
    n.embedding::extensions.vector(384),
    n.display_name,
    (regexp_match(n.display_name, '(\d+/\d{4}/[A-Za-z\-]+)'))[1],
    (regexp_match(n.display_name, '(\d+/\d{4})'))[1],
    public.extract_doc_year(n.display_name),
    public.normalize_vn_text(n.display_name)
  INTO target_embedding, target_name, target_doc_code, target_doc_number, target_doc_year, target_normalized_name
  FROM industry_knowledge_nodes n
  WHERE n.id = target_node_id;

  IF target_embedding IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH candidates AS (
    SELECT 
      n.id,
      n.display_name,
      n.content_quality_score::SMALLINT as quality,
      1 - (n.embedding::extensions.vector(384) <=> target_embedding) as sim,
      (regexp_match(n.display_name, '(\d+/\d{4}/[A-Za-z\-]+)'))[1] as doc_code,
      (regexp_match(n.display_name, '(\d+/\d{4})'))[1] as doc_number,
      public.extract_doc_year(n.display_name) as doc_year,
      public.normalize_vn_text(n.display_name) as normalized_name,
      CASE
        WHEN target_doc_code IS NOT NULL 
             AND (regexp_match(n.display_name, '(\d+/\d{4}/[A-Za-z\-]+)'))[1] = target_doc_code 
        THEN 'exact_code'
        WHEN target_doc_number IS NOT NULL 
             AND (regexp_match(n.display_name, '(\d+/\d{4})'))[1] = target_doc_number 
        THEN 'same_number'
        WHEN target_doc_number IS NULL 
             AND (regexp_match(n.display_name, '(\d+/\d{4})'))[1] IS NULL
             AND target_doc_year IS NOT NULL 
             AND public.extract_doc_year(n.display_name) = target_doc_year 
        THEN 'same_year'
        ELSE 'semantic_only'
      END as mtype
    FROM industry_knowledge_nodes n
    WHERE n.id != target_node_id
      AND n.node_type = 'regulation'
      AND n.is_active = true
      AND n.embedding IS NOT NULL
      AND 1 - (n.embedding::extensions.vector(384) <=> target_embedding) >= similarity_threshold
  )
  SELECT 
    c.id,
    c.display_name,
    c.sim,
    c.quality,
    c.mtype
  FROM candidates c
  WHERE
    NOT (target_doc_year IS NOT NULL AND c.doc_year IS NOT NULL AND target_doc_year != c.doc_year)
    AND public.levenshtein_similarity(target_normalized_name, c.normalized_name) >= 0.6
    AND (
      (c.mtype = 'exact_code' AND c.sim >= 0.80)
      OR (c.mtype = 'same_number' AND c.sim >= 0.95)
      OR (c.mtype = 'same_year' AND c.sim >= 0.98)
    )
  ORDER BY c.sim DESC
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public;
