-- Fix function search path for search_help_articles
CREATE OR REPLACE FUNCTION public.search_help_articles(
  query_embedding extensions.vector,
  match_route TEXT DEFAULT NULL,
  match_category TEXT DEFAULT NULL,
  match_threshold FLOAT DEFAULT 0.5,
  match_count INTEGER DEFAULT 5
) RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  category TEXT,
  keywords TEXT[],
  similarity FLOAT
) LANGUAGE plpgsql SECURITY DEFINER 
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ha.id,
    ha.title,
    ha.content,
    ha.category,
    ha.keywords,
    (1 - (ha.embedding <=> query_embedding))::FLOAT as similarity
  FROM public.help_articles ha
  WHERE ha.is_published = true
    AND ha.embedding IS NOT NULL
    AND (match_route IS NULL OR match_route = ANY(ha.route_context))
    AND (match_category IS NULL OR ha.category = match_category)
    AND (1 - (ha.embedding <=> query_embedding)) > match_threshold
  ORDER BY ha.priority DESC, ha.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;