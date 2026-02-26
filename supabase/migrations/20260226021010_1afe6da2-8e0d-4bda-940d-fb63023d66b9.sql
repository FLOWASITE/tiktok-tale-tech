-- Task 10: Cross-session Memory Recency Decay
-- Update match_blackboard_context to include recency decay in priority_score
CREATE OR REPLACE FUNCTION public.match_blackboard_context(
  query_embedding extensions.vector,
  match_session_id uuid DEFAULT NULL,
  match_brand_id uuid DEFAULT NULL,
  match_node_types text[] DEFAULT NULL,
  match_threshold double precision DEFAULT 0.65,
  match_count integer DEFAULT 8
)
RETURNS TABLE(
  id uuid,
  content_type text,
  content_text text,
  node_name text,
  session_id uuid,
  brand_template_id uuid,
  similarity double precision,
  priority_score double precision,
  metadata jsonb,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    -- Recency decay: >90 days (-0.25), >30 days (-0.1)
    (
      (1 - (ce.embedding <=> query_embedding))
      + CASE WHEN match_session_id IS NOT NULL AND ce.session_id = match_session_id THEN 0.15 ELSE 0 END
      + CASE WHEN match_brand_id IS NOT NULL AND ce.brand_template_id = match_brand_id THEN 0.05 ELSE 0 END
      - CASE
          WHEN ce.created_at < now() - interval '90 days' THEN 0.25
          WHEN ce.created_at < now() - interval '30 days' THEN 0.1
          ELSE 0
        END
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
$function$;

-- Task 13: Add primary_channels to brand_templates
ALTER TABLE public.brand_templates ADD COLUMN IF NOT EXISTS primary_channels TEXT[] DEFAULT '{}'::TEXT[];

-- Validation trigger: max 3 primary channels
CREATE OR REPLACE FUNCTION public.validate_primary_channels()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF array_length(NEW.primary_channels, 1) > 3 THEN
    RAISE EXCEPTION 'primary_channels cannot exceed 3 items';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_validate_primary_channels ON public.brand_templates;
CREATE TRIGGER trg_validate_primary_channels
  BEFORE INSERT OR UPDATE OF primary_channels ON public.brand_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_primary_channels();