-- 1. Bulk cleanup expired
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
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin role required';
  END IF;

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

-- 2. admin_cleanup_table — comprehensive whitelist
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
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin role required';
  END IF;

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
      ELSIF p_mode = 'all' THEN DELETE FROM public.campaign_kpi_logs;
      END IF;
    WHEN 'regulation_propagation_log' THEN
      IF p_mode = 'older_than' THEN DELETE FROM public.regulation_propagation_log WHERE created_at < v_cutoff;
      ELSIF p_mode = 'all' THEN DELETE FROM public.regulation_propagation_log;
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
      ELSIF p_mode = 'all' THEN DELETE FROM public.content_publishing_logs;
      END IF;
    WHEN 'approval_logs' THEN
      IF p_mode = 'older_than' THEN DELETE FROM public.approval_logs WHERE created_at < v_cutoff;
      ELSIF p_mode = 'all' THEN DELETE FROM public.approval_logs;
      END IF;
    WHEN 'campaign_notification_logs' THEN
      IF p_mode = 'older_than' THEN DELETE FROM public.campaign_notification_logs WHERE created_at < v_cutoff;
      ELSIF p_mode = 'all' THEN DELETE FROM public.campaign_notification_logs;
      END IF;
    WHEN 'content_embeddings' THEN
      IF p_mode = 'older_than' THEN DELETE FROM public.content_embeddings WHERE created_at < v_cutoff;
      END IF;
    WHEN 'conversation_embeddings' THEN
      IF p_mode = 'older_than' THEN DELETE FROM public.conversation_embeddings WHERE created_at < v_cutoff;
      END IF;
    WHEN 'generation_tasks' THEN
      IF p_mode = 'expired' THEN DELETE FROM public.generation_tasks WHERE expires_at < now();
      ELSIF p_mode = 'older_than' THEN DELETE FROM public.generation_tasks WHERE created_at < v_cutoff;
      ELSIF p_mode = 'all' THEN DELETE FROM public.generation_tasks;
      END IF;
    WHEN 'workflow_checkpoints' THEN
      IF p_mode = 'older_than' THEN DELETE FROM public.workflow_checkpoints WHERE created_at < v_cutoff;
      ELSIF p_mode = 'all' THEN DELETE FROM public.workflow_checkpoints;
      END IF;
    WHEN 'telegram_processed_updates' THEN
      IF p_mode = 'older_than' THEN DELETE FROM public.telegram_processed_updates WHERE processed_at < v_cutoff;
      ELSIF p_mode = 'all' THEN DELETE FROM public.telegram_processed_updates;
      END IF;
    WHEN 'telegram_chat_state' THEN
      IF p_mode = 'older_than' THEN DELETE FROM public.telegram_chat_state WHERE updated_at < v_cutoff;
      ELSIF p_mode = 'all' THEN DELETE FROM public.telegram_chat_state;
      END IF;
    ELSE
      RAISE EXCEPTION 'Table % is not whitelisted for admin cleanup', p_table;
  END CASE;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- 3. View join admin_audit_logs với profiles (dùng cột admin_id, details thật)
CREATE OR REPLACE VIEW public.v_admin_audit_with_user AS
SELECT
  l.id,
  l.created_at,
  l.action,
  l.details,
  l.target_user_id,
  l.admin_id,
  COALESCE(p.full_name, p.email, 'Unknown') AS admin_name,
  p.email AS admin_email
FROM public.admin_audit_logs l
LEFT JOIN public.profiles p ON p.id = l.admin_id;

GRANT SELECT ON public.v_admin_audit_with_user TO authenticated;