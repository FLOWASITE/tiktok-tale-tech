-- Whitelist-based cleanup function for admin storage manager
CREATE OR REPLACE FUNCTION public.admin_cleanup_table(
  p_table text,
  p_mode text,
  p_days integer DEFAULT 30
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted integer := 0;
  v_user_id uuid := auth.uid();
  v_is_admin boolean;
  v_sql text;
  v_where text;
BEGIN
  -- Verify admin
  SELECT public.has_role(v_user_id, 'admin') INTO v_is_admin;
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Permission denied: admin role required';
  END IF;

  -- Validate mode
  IF p_mode NOT IN ('expired', 'older_than', 'all') THEN
    RAISE EXCEPTION 'Invalid mode: must be expired, older_than, or all';
  END IF;

  -- Whitelist of allowed tables with their cleanup logic
  -- Format: table_name => (has_expires_at, date_column)
  IF p_table NOT IN (
    'ai_response_cache', 'web_search_cache', 'knowledge_graph_cache', 'telegram_example_cache',
    'edge_function_metrics', 'agent_execution_logs', 'agent_pipeline_logs', 'cron_run_logs',
    'admin_audit_logs', 'campaign_kpi_logs', 'regulation_propagation_log', 'usage_logs',
    'telegram_messages_log', 'sales_chat_messages_log', 'content_publishing_logs',
    'approval_logs', 'campaign_notification_logs',
    'content_embeddings', 'conversation_embeddings',
    'generation_tasks', 'workflow_checkpoints',
    'telegram_processed_updates', 'telegram_chat_state'
  ) THEN
    RAISE EXCEPTION 'Table % not allowed for cleanup', p_table;
  END IF;

  -- Build WHERE clause
  IF p_mode = 'expired' THEN
    -- Only tables with expires_at column support this
    IF p_table NOT IN ('ai_response_cache', 'web_search_cache', 'knowledge_graph_cache', 'generation_tasks') THEN
      RAISE EXCEPTION 'Table % does not support expired mode', p_table;
    END IF;
    v_where := 'expires_at < now()';
  ELSIF p_mode = 'older_than' THEN
    IF p_days IS NULL OR p_days < 1 THEN
      RAISE EXCEPTION 'p_days must be >= 1 for older_than mode';
    END IF;
    -- Most tables use created_at; some use processed_at or updated_at
    IF p_table = 'telegram_processed_updates' THEN
      v_where := format('processed_at < now() - interval ''%s days''', p_days);
    ELSIF p_table = 'telegram_chat_state' THEN
      v_where := format('updated_at < now() - interval ''%s days''', p_days);
    ELSE
      v_where := format('created_at < now() - interval ''%s days''', p_days);
    END IF;
  ELSE -- all
    v_where := 'true';
  END IF;

  v_sql := format('DELETE FROM public.%I WHERE %s', p_table, v_where);
  EXECUTE v_sql;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  -- Audit log
  INSERT INTO public.admin_audit_logs (admin_user_id, action, target_type, target_id, metadata)
  VALUES (
    v_user_id,
    'cleanup_table',
    p_table,
    NULL,
    jsonb_build_object('mode', p_mode, 'days', p_days, 'rows_deleted', v_deleted)
  );

  RETURN v_deleted;
END;
$$;

-- Get aggregate memory stats across whitelisted tables
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
  v_user_id uuid := auth.uid();
  v_is_admin boolean;
  rec record;
  v_count bigint;
  v_oldest timestamptz;
  v_newest timestamptz;
  v_date_col text;
BEGIN
  SELECT public.has_role(v_user_id, 'admin') INTO v_is_admin;
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Permission denied: admin role required';
  END IF;

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
      -- Skip tables that don't exist or have errors
      CONTINUE;
    END;
  END LOOP;
END;
$$;

-- Find orphan storage file paths (not referenced anywhere)
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
DECLARE
  v_is_admin boolean;
BEGIN
  SELECT public.has_role(auth.uid(), 'admin') INTO v_is_admin;
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Permission denied: admin role required';
  END IF;

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

GRANT EXECUTE ON FUNCTION public.admin_cleanup_table(text, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_db_memory_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_orphan_storage_paths(text) TO authenticated;