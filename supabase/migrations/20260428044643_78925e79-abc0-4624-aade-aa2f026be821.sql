-- Drop auth.uid() admin checks (edge function already verifies admin via JWT before calling).
-- Lock down EXECUTE to service_role only.

CREATE OR REPLACE FUNCTION public.admin_cleanup_table(p_table text, p_mode text, p_days integer DEFAULT 30)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer := 0;
  v_cutoff timestamptz := now() - (p_days || ' days')::interval;
BEGIN
  CASE p_table
    WHEN 'ai_response_cache' THEN
      IF p_mode = 'expired' THEN DELETE FROM public.ai_response_cache WHERE expires_at < now();
      ELSIF p_mode = 'older_than' THEN DELETE FROM public.ai_response_cache WHERE created_at < v_cutoff;
      ELSIF p_mode = 'all' THEN DELETE FROM public.ai_response_cache;
      END IF;
    WHEN 'web_search_cache' THEN
      IF p_mode = 'expired' THEN DELETE FROM public.web_search_cache WHERE expires_at < now();
      ELSIF p_mode = 'older_than' THEN DELETE FROM public.web_search_cache WHERE created_at < v_cutoff;
      ELSIF p_mode = 'all' THEN DELETE FROM public.web_search_cache;
      END IF;
    WHEN 'knowledge_graph_cache' THEN
      IF p_mode = 'expired' THEN DELETE FROM public.knowledge_graph_cache WHERE expires_at < now();
      ELSIF p_mode = 'older_than' THEN DELETE FROM public.knowledge_graph_cache WHERE created_at < v_cutoff;
      ELSIF p_mode = 'all' THEN DELETE FROM public.knowledge_graph_cache;
      END IF;
    WHEN 'telegram_example_cache' THEN
      IF p_mode = 'older_than' THEN DELETE FROM public.telegram_example_cache WHERE created_at < v_cutoff;
      ELSIF p_mode = 'all' THEN DELETE FROM public.telegram_example_cache;
      END IF;
    WHEN 'edge_function_metrics' THEN
      IF p_mode = 'older_than' THEN DELETE FROM public.edge_function_metrics WHERE created_at < v_cutoff;
      ELSIF p_mode = 'all' THEN DELETE FROM public.edge_function_metrics;
      END IF;
    WHEN 'agent_execution_logs' THEN
      IF p_mode = 'older_than' THEN DELETE FROM public.agent_execution_logs WHERE created_at < v_cutoff;
      ELSIF p_mode = 'all' THEN DELETE FROM public.agent_execution_logs;
      END IF;
    WHEN 'agent_pipeline_logs' THEN
      IF p_mode = 'older_than' THEN DELETE FROM public.agent_pipeline_logs WHERE created_at < v_cutoff;
      ELSIF p_mode = 'all' THEN DELETE FROM public.agent_pipeline_logs;
      END IF;
    WHEN 'cron_run_logs' THEN
      IF p_mode = 'older_than' THEN DELETE FROM public.cron_run_logs WHERE created_at < v_cutoff;
      ELSIF p_mode = 'all' THEN DELETE FROM public.cron_run_logs;
      END IF;
    WHEN 'admin_audit_logs' THEN
      IF p_mode = 'older_than' THEN DELETE FROM public.admin_audit_logs WHERE created_at < v_cutoff;
      END IF;
    WHEN 'campaign_kpi_logs' THEN
      IF p_mode = 'older_than' THEN DELETE FROM public.campaign_kpi_logs WHERE created_at < v_cutoff;
      END IF;
    WHEN 'regulation_propagation_log' THEN
      IF p_mode = 'older_than' THEN DELETE FROM public.regulation_propagation_log WHERE created_at < v_cutoff;
      END IF;
    WHEN 'usage_logs' THEN
      IF p_mode = 'older_than' THEN DELETE FROM public.usage_logs WHERE created_at < v_cutoff;
      END IF;
    WHEN 'telegram_messages_log' THEN
      IF p_mode = 'older_than' THEN DELETE FROM public.telegram_messages_log WHERE created_at < v_cutoff;
      ELSIF p_mode = 'all' THEN DELETE FROM public.telegram_messages_log;
      END IF;
    WHEN 'sales_chat_messages_log' THEN
      IF p_mode = 'older_than' THEN DELETE FROM public.sales_chat_messages_log WHERE created_at < v_cutoff;
      ELSIF p_mode = 'all' THEN DELETE FROM public.sales_chat_messages_log;
      END IF;
    WHEN 'content_publishing_logs' THEN
      IF p_mode = 'older_than' THEN DELETE FROM public.content_publishing_logs WHERE created_at < v_cutoff;
      END IF;
    WHEN 'approval_logs' THEN
      IF p_mode = 'older_than' THEN DELETE FROM public.approval_logs WHERE created_at < v_cutoff;
      END IF;
    WHEN 'campaign_notification_logs' THEN
      IF p_mode = 'older_than' THEN DELETE FROM public.campaign_notification_logs WHERE created_at < v_cutoff;
      END IF;
    WHEN 'generation_tasks' THEN
      IF p_mode = 'expired' THEN DELETE FROM public.generation_tasks WHERE expires_at < now();
      ELSIF p_mode = 'older_than' THEN DELETE FROM public.generation_tasks WHERE created_at < v_cutoff;
      END IF;
    WHEN 'workflow_checkpoints' THEN
      IF p_mode = 'older_than' THEN DELETE FROM public.workflow_checkpoints WHERE created_at < v_cutoff;
      END IF;
    WHEN 'telegram_processed_updates' THEN
      IF p_mode = 'older_than' THEN DELETE FROM public.telegram_processed_updates WHERE processed_at < v_cutoff;
      ELSIF p_mode = 'all' THEN DELETE FROM public.telegram_processed_updates;
      END IF;
    WHEN 'telegram_chat_state' THEN
      IF p_mode = 'older_than' THEN DELETE FROM public.telegram_chat_state WHERE updated_at < v_cutoff;
      END IF;
    ELSE
      RAISE EXCEPTION 'Table % is not whitelisted for cleanup', p_table;
  END CASE;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_bulk_cleanup_expired()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb := '{}'::jsonb;
  v_count integer;
BEGIN
  v_count := public.cleanup_expired_cache();
  v_result := v_result || jsonb_build_object('ai_response_cache', v_count);

  v_count := public.cleanup_knowledge_graph_cache();
  v_result := v_result || jsonb_build_object('knowledge_graph_cache', v_count);

  v_count := public.cleanup_telegram_processed_updates();
  v_result := v_result || jsonb_build_object('telegram_processed_updates', v_count);

  v_count := public.cleanup_expired_generation_tasks();
  v_result := v_result || jsonb_build_object('generation_tasks', v_count);

  v_count := public.cleanup_old_checkpoints();
  v_result := v_result || jsonb_build_object('workflow_checkpoints', v_count);

  v_count := public.cleanup_stale_telegram_chat_state();
  v_result := v_result || jsonb_build_object('telegram_chat_state', v_count);

  DELETE FROM public.web_search_cache WHERE expires_at < now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object('web_search_cache', v_count);

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_db_memory_stats()
RETURNS TABLE (
  table_name text,
  category text,
  row_count bigint,
  size_bytes bigint,
  size_pretty text,
  oldest_record timestamptz,
  newest_record timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec record;
  v_count bigint;
  v_oldest timestamptz;
  v_newest timestamptz;
  v_date_col text;
BEGIN
  FOR rec IN
    SELECT * FROM (VALUES
      ('ai_response_cache','cache'),
      ('web_search_cache','cache'),
      ('knowledge_graph_cache','cache'),
      ('telegram_example_cache','cache'),
      ('edge_function_metrics','log'),
      ('agent_execution_logs','log'),
      ('agent_pipeline_logs','log'),
      ('cron_run_logs','log'),
      ('admin_audit_logs','log'),
      ('campaign_kpi_logs','log'),
      ('regulation_propagation_log','log'),
      ('usage_logs','log'),
      ('telegram_messages_log','log'),
      ('sales_chat_messages_log','log'),
      ('content_publishing_logs','log'),
      ('approval_logs','log'),
      ('campaign_notification_logs','log'),
      ('content_embeddings','embedding'),
      ('conversation_embeddings','embedding'),
      ('generation_tasks','task'),
      ('workflow_checkpoints','task'),
      ('telegram_processed_updates','task'),
      ('telegram_chat_state','task')
    ) AS t(tname, cat)
  LOOP
    IF rec.tname = 'telegram_processed_updates' THEN v_date_col := 'processed_at';
    ELSIF rec.tname = 'telegram_chat_state' THEN v_date_col := 'updated_at';
    ELSE v_date_col := 'created_at';
    END IF;

    BEGIN
      EXECUTE format('SELECT COUNT(*), MIN(%I), MAX(%I) FROM public.%I', v_date_col, v_date_col, rec.tname)
        INTO v_count, v_oldest, v_newest;

      table_name := rec.tname;
      category := rec.cat;
      row_count := v_count;
      size_bytes := pg_total_relation_size(format('public.%I', rec.tname)::regclass);
      size_pretty := pg_size_pretty(size_bytes);
      oldest_record := v_oldest;
      newest_record := v_newest;
      RETURN NEXT;
    EXCEPTION WHEN OTHERS THEN
      CONTINUE;
    END;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.find_orphan_storage_paths(p_bucket text)
RETURNS TABLE (
  object_name text,
  size_bytes bigint,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.name::text,
    COALESCE((o.metadata->>'size')::bigint, 0),
    o.created_at
  FROM storage.objects o
  WHERE o.bucket_id = p_bucket
    AND NOT EXISTS (
      SELECT 1 FROM public.carousel_images ci
      WHERE ci.image_url LIKE '%' || o.name || '%'
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.channel_image_history ch
      WHERE ch.image_url LIKE '%' || o.name || '%'
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.brand_templates bt
      WHERE bt.logo_url LIKE '%' || o.name || '%'
    )
  ORDER BY o.created_at ASC
  LIMIT 500;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_cleanup_table(text, text, integer) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.admin_bulk_cleanup_expired() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.get_db_memory_stats() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.find_orphan_storage_paths(text) FROM PUBLIC, authenticated, anon;

GRANT EXECUTE ON FUNCTION public.admin_cleanup_table(text, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_bulk_cleanup_expired() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_db_memory_stats() TO service_role;
GRANT EXECUTE ON FUNCTION public.find_orphan_storage_paths(text) TO service_role;