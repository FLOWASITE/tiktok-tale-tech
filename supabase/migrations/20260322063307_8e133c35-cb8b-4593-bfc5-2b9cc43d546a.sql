-- Phase 3A: Add embedding column to ai_response_cache for semantic cache
ALTER TABLE public.ai_response_cache ADD COLUMN IF NOT EXISTS embedding extensions.vector(384);
ALTER TABLE public.ai_response_cache ADD COLUMN IF NOT EXISTS input_text text;

-- Index for semantic search on cache
CREATE INDEX IF NOT EXISTS idx_ai_response_cache_embedding ON public.ai_response_cache USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);

-- Phase 3A: RPC for semantic cache matching
CREATE OR REPLACE FUNCTION public.match_cached_ai_results(
  query_embedding extensions.vector,
  match_function_name text,
  match_organization_id uuid DEFAULT NULL,
  match_brand_template_id uuid DEFAULT NULL,
  match_threshold double precision DEFAULT 0.92,
  match_count integer DEFAULT 3
)
RETURNS TABLE(
  id uuid,
  cache_key text,
  response_data jsonb,
  similarity double precision,
  hit_count integer,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.cache_key,
    c.response_data,
    (1 - (c.embedding <=> query_embedding))::FLOAT AS similarity,
    c.hit_count,
    c.created_at
  FROM public.ai_response_cache c
  WHERE c.embedding IS NOT NULL
    AND c.expires_at > now()
    AND c.function_name = match_function_name
    AND (match_organization_id IS NULL OR c.organization_id = match_organization_id)
    AND (match_brand_template_id IS NULL OR c.brand_template_id = match_brand_template_id)
    AND (1 - (c.embedding <=> query_embedding)) > match_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Phase 3B: Composite indexes for most queried tables
CREATE INDEX IF NOT EXISTS idx_brand_templates_org_industry ON public.brand_templates (organization_id, industry_template_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_topic_history_brand_created ON public.topic_history (brand_template_id, created_at DESC) WHERE brand_template_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_usage_logs_org_type_date ON public.usage_logs (organization_id, usage_type, created_at DESC) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_metrics_org_func_date ON public.ai_metrics (organization_id, function_name, created_at DESC) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_social_connections_org_platform ON public.social_connections (organization_id, platform) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_content_embeddings_org_brand_type ON public.content_embeddings (organization_id, brand_template_id, content_type) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_brand ON public.chat_conversations (user_id, brand_template_id, updated_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customer_personas_brand_priority ON public.customer_personas (brand_template_id, priority_score DESC) WHERE brand_template_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_brand_products_brand_active ON public.brand_products (brand_template_id, is_active, is_featured DESC) WHERE brand_template_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_response_cache_func_org ON public.ai_response_cache (function_name, organization_id);

-- Phase 3C: Batch RPC for brand context
CREATE OR REPLACE FUNCTION public.fetch_brand_context_batch(
  p_brand_template_id uuid,
  p_max_personas integer DEFAULT 5,
  p_max_products integer DEFAULT 5,
  p_max_topics integer DEFAULT 10
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_brand jsonb;
  v_personas jsonb;
  v_products jsonb;
  v_topics jsonb;
BEGIN
  SELECT to_jsonb(bt.*) INTO v_brand
  FROM (
    SELECT brand_name, brand_positioning, tone_of_voice, industry, content_pillars,
           unique_value_proposition, target_age_range, target_gender, evergreen_themes,
           brand_hashtags, main_competitors, industry_template_id, sample_texts
    FROM public.brand_templates WHERE id = p_brand_template_id
  ) bt;

  SELECT COALESCE(jsonb_agg(p), '[]'::jsonb) INTO v_personas
  FROM (
    SELECT id, name, occupation, age_range, pain_points, desires, buying_triggers, is_primary,
           device_usage, tech_savviness, buying_motivation, communication_style,
           typical_funnel_stage, objections, priority_score
    FROM public.customer_personas WHERE brand_template_id = p_brand_template_id
    ORDER BY priority_score DESC NULLS LAST, is_primary DESC LIMIT p_max_personas
  ) p;

  SELECT COALESCE(jsonb_agg(pr), '[]'::jsonb) INTO v_products
  FROM (
    SELECT id, name, category, description, unique_selling_points, suggested_content_angles, is_featured
    FROM public.brand_products WHERE brand_template_id = p_brand_template_id AND is_active = true
    ORDER BY is_featured DESC LIMIT p_max_products
  ) pr;

  SELECT COALESCE(jsonb_agg(t.topic), '[]'::jsonb) INTO v_topics
  FROM (
    SELECT topic FROM public.topic_history WHERE brand_template_id = p_brand_template_id
    ORDER BY created_at DESC LIMIT p_max_topics
  ) t;

  RETURN jsonb_build_object('brand', v_brand, 'personas', v_personas, 'products', v_products, 'recent_topics', v_topics);
END;
$$;

-- Phase 3C: Batch RPC for org usage check
CREATE OR REPLACE FUNCTION public.check_org_features_batch(
  p_org_id uuid,
  p_usage_types usage_type[] DEFAULT ARRAY['script','carousel','multichannel','image_generation']::usage_type[]
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb := '{}'::jsonb;
  v_type usage_type;
BEGIN
  FOREACH v_type IN ARRAY p_usage_types LOOP
    v_result := v_result || jsonb_build_object(v_type::text, public.can_use_feature(p_org_id, v_type));
  END LOOP;
  RETURN v_result;
END;
$$;