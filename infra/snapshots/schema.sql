--
-- PostgreSQL database dump
--

\restrict W0ew3bkRBnjq1BSHi5GyaOGoaQcyfjRfosZGo7akTPVRyBVEj5j5CegDeBoMjct

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: ad_funnel_stage; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.ad_funnel_stage AS ENUM (
    'awareness',
    'consideration',
    'conversion',
    'retention'
);


--
-- Name: ad_objective; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.ad_objective AS ENUM (
    'traffic',
    'conversions',
    'engagement',
    'awareness',
    'leads',
    'app_installs',
    'video_views',
    'messages'
);


--
-- Name: ad_platform; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.ad_platform AS ENUM (
    'meta_feed',
    'meta_story',
    'meta_reels',
    'google_rsa',
    'google_display',
    'tiktok',
    'zalo',
    'linkedin',
    'zalo_oa',
    'zalo_message',
    'zalo_article',
    'facebook_feed',
    'facebook_story',
    'instagram_feed',
    'instagram_story',
    'instagram_reels'
);


--
-- Name: agent_approval_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.agent_approval_status AS ENUM (
    'pending',
    'approved',
    'rejected',
    'edited'
);


--
-- Name: agent_autonomy_level; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.agent_autonomy_level AS ENUM (
    'human_in_loop',
    'human_on_loop',
    'full_auto'
);


--
-- Name: agent_pipeline_stage; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.agent_pipeline_stage AS ENUM (
    'strategy',
    'create',
    'quality',
    'approval',
    'publish',
    'analyze'
);


--
-- Name: agent_priority; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.agent_priority AS ENUM (
    'low',
    'normal',
    'high',
    'urgent'
);


--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'user',
    'pro',
    'admin'
);


--
-- Name: carousel_ai_tool; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.carousel_ai_tool AS ENUM (
    'ideogram',
    'midjourney',
    'dalle',
    'leonardo'
);


--
-- Name: carousel_platform; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.carousel_platform AS ENUM (
    'facebook',
    'tiktok',
    'instagram',
    'linkedin'
);


--
-- Name: industry_pack_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.industry_pack_status AS ENUM (
    'draft',
    'stable',
    'deprecated'
);


--
-- Name: org_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.org_role AS ENUM (
    'owner',
    'admin',
    'member',
    'viewer'
);


--
-- Name: plan_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.plan_type AS ENUM (
    'free',
    'starter',
    'pro',
    'enterprise'
);


--
-- Name: script_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.script_status AS ENUM (
    'draft',
    'pending_approval',
    'approved',
    'rejected'
);


--
-- Name: subscription_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.subscription_status AS ENUM (
    'active',
    'cancelled',
    'expired',
    'pending',
    'trial'
);


--
-- Name: usage_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.usage_type AS ENUM (
    'script',
    'carousel',
    'multichannel',
    'image_generation',
    'ai_edit',
    'video_generation'
);


--
-- Name: video_generation_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.video_generation_status AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed'
);


--
-- Name: video_provider; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.video_provider AS ENUM (
    'lovable',
    'minimax',
    'runway',
    'geminigen',
    'poyo'
);


--
-- Name: admin_bulk_cleanup_expired(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_bulk_cleanup_expired() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: admin_cleanup_table(text, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_cleanup_table(p_table text, p_mode text, p_days integer DEFAULT 30) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: aggregate_content_learnings(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.aggregate_content_learnings(p_brand_template_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_channel TEXT;
  v_edit_type TEXT;
  v_count INT;
BEGIN
  -- Loop through each channel and edit_type combination
  FOR v_channel, v_edit_type, v_count IN
    SELECT channel, edit_type, COUNT(*)
    FROM content_learnings
    WHERE brand_template_id = p_brand_template_id
    AND created_at > NOW() - INTERVAL '90 days'
    GROUP BY channel, edit_type
    HAVING COUNT(*) >= 3 -- Minimum samples for meaningful preference
  LOOP
    -- Upsert preference
    INSERT INTO brand_preferences_learned (
      brand_template_id,
      channel,
      preference_key,
      preference_value,
      confidence_score,
      sample_count,
      last_edit_at
    )
    VALUES (
      p_brand_template_id,
      v_channel,
      'edit_tendency_' || v_edit_type,
      jsonb_build_object('tendency', v_edit_type, 'frequency', 'high'),
      LEAST(0.9, 0.5 + (v_count * 0.05)), -- Confidence grows with samples
      v_count,
      NOW()
    )
    ON CONFLICT (brand_template_id, channel, preference_key)
    DO UPDATE SET
      preference_value = EXCLUDED.preference_value,
      confidence_score = LEAST(0.9, brand_preferences_learned.confidence_score + 0.02),
      sample_count = EXCLUDED.sample_count,
      last_edit_at = EXCLUDED.last_edit_at,
      updated_at = NOW();
  END LOOP;
END;
$$;


--
-- Name: aggregate_edge_function_stats(date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.aggregate_edge_function_stats(p_date date DEFAULT (CURRENT_DATE - 1)) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_count INTEGER;
BEGIN
  INSERT INTO edge_function_daily_stats (
    function_name, stat_date, total_calls, error_count, cold_start_count,
    avg_duration_ms, p50_duration_ms, p95_duration_ms, max_duration_ms, min_duration_ms
  )
  SELECT
    function_name,
    p_date,
    COUNT(*)::INTEGER,
    COUNT(*) FILTER (WHERE had_error)::INTEGER,
    COUNT(*) FILTER (WHERE is_cold_start)::INTEGER,
    ROUND(AVG(duration_ms), 2),
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_ms)::INTEGER,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms)::INTEGER,
    MAX(duration_ms),
    MIN(duration_ms)
  FROM edge_function_metrics
  WHERE created_at >= p_date AND created_at < p_date + 1
  GROUP BY function_name
  ON CONFLICT (function_name, stat_date) DO UPDATE SET
    total_calls = EXCLUDED.total_calls,
    error_count = EXCLUDED.error_count,
    cold_start_count = EXCLUDED.cold_start_count,
    avg_duration_ms = EXCLUDED.avg_duration_ms,
    p50_duration_ms = EXCLUDED.p50_duration_ms,
    p95_duration_ms = EXCLUDED.p95_duration_ms,
    max_duration_ms = EXCLUDED.max_duration_ms,
    min_duration_ms = EXCLUDED.min_duration_ms;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;


--
-- Name: auto_assign_landing_page_to_keywords(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_assign_landing_page_to_keywords() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_url text;
BEGIN
  -- Chỉ chạy khi status đổi sang published và có target_keyword_ids
  IF NEW.status = 'published' 
     AND (OLD.status IS DISTINCT FROM NEW.status)
     AND NEW.target_keyword_ids IS NOT NULL 
     AND array_length(NEW.target_keyword_ids, 1) > 0 THEN
    
    -- Ưu tiên website_url, fallback published_url chung
    v_url := COALESCE(
      NEW.website_published_url, 
      NEW.blogger_published_url, 
      NEW.wordpress_published_url
    );
    
    IF v_url IS NOT NULL THEN
      UPDATE public.seo_keywords
      SET assigned_landing_page_id = NEW.id,
          tracking_url = v_url,
          status = CASE WHEN status IN ('new','researching','planned') THEN 'published'::text ELSE status END
      WHERE id = ANY(NEW.target_keyword_ids)
        AND organization_id = NEW.organization_id
        AND assigned_landing_page_id IS NULL; -- không đè nếu đã gán bài khác
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: auto_bump_industry_version_on_rules_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_bump_industry_version_on_rules_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
DECLARE
  rules_changed boolean := false;
  base_version text;
  ts_suffix text;
BEGIN
  -- Detect any rule-relevant field change
  IF OLD.compliance_rules   IS DISTINCT FROM NEW.compliance_rules
     OR OLD.claim_restrictions IS DISTINCT FROM NEW.claim_restrictions
     OR OLD.forbidden_terms    IS DISTINCT FROM NEW.forbidden_terms
     OR OLD.argument_patterns  IS DISTINCT FROM NEW.argument_patterns
     OR OLD.system_rules       IS DISTINCT FROM NEW.system_rules
     OR OLD.brand_voice        IS DISTINCT FROM NEW.brand_voice
  THEN
    rules_changed := true;
  END IF;

  -- Only act if rules changed AND admin did NOT also manually bump version
  IF rules_changed AND OLD.version IS NOT DISTINCT FROM NEW.version THEN
    -- Strip any prior auto-suffix so we don't keep stacking timestamps
    base_version := regexp_replace(COALESCE(NEW.version, '1.0'), '\.\d{14}$', '');
    ts_suffix    := to_char(now() AT TIME ZONE 'UTC', 'YYYYMMDDHH24MISS');
    NEW.version  := base_version || '.' || ts_suffix;
    RAISE NOTICE 'auto_bump_industry_version: % -> %', OLD.version, NEW.version;
  END IF;

  RETURN NEW;
END;
$_$;


--
-- Name: auto_increment_brand_version(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_increment_brand_version() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF OLD IS DISTINCT FROM NEW THEN
    NEW.version := OLD.version + 1;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: auto_increment_carousel_image_version(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_increment_carousel_image_version() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  max_version integer;
BEGIN
  SELECT COALESCE(MAX(version), 0) INTO max_version
  FROM public.carousel_images
  WHERE carousel_id = NEW.carousel_id AND slide_number = NEW.slide_number;
  
  NEW.version := max_version + 1;
  RETURN NEW;
END;
$$;


--
-- Name: auto_increment_image_version(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_increment_image_version() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  max_version integer;
BEGIN
  SELECT COALESCE(MAX(version), 0) INTO max_version
  FROM public.channel_image_history
  WHERE content_id = NEW.content_id AND channel = NEW.channel;
  
  NEW.version := max_version + 1;
  RETURN NEW;
END;
$$;


--
-- Name: auto_populate_ad_perf_org_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_populate_ad_perf_org_id() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    SELECT organization_id INTO NEW.organization_id
    FROM public.ad_copies
    WHERE id = NEW.ad_copy_id;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: calc_keyword_priority(integer, integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calc_keyword_priority(_volume integer, _difficulty integer, _intent text) RETURNS integer
    LANGUAGE plpgsql IMMUTABLE
    SET search_path TO 'public'
    AS $$
DECLARE
  intent_weight NUMERIC;
  score NUMERIC;
BEGIN
  intent_weight := CASE _intent
    WHEN 'transactional' THEN 1.5
    WHEN 'commercial' THEN 1.3
    WHEN 'informational' THEN 1.0
    WHEN 'navigational' THEN 0.7
    ELSE 1.0
  END;
  score := LN(GREATEST(_volume, 1) + 1) * 12 * intent_weight * (100 - COALESCE(_difficulty, 50)) / 100.0;
  RETURN LEAST(100, GREATEST(0, ROUND(score)::INTEGER));
END;
$$;


--
-- Name: calculate_next_crawl_at(text, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_next_crawl_at(frequency text, last_crawled timestamp with time zone DEFAULT now()) RETURNS timestamp with time zone
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  CASE frequency
    WHEN 'daily' THEN RETURN last_crawled + INTERVAL '1 day';
    WHEN 'weekly' THEN RETURN last_crawled + INTERVAL '1 week';
    WHEN 'monthly' THEN RETURN last_crawled + INTERVAL '1 month';
    ELSE RETURN last_crawled + INTERVAL '1 week';
  END CASE;
END;
$$;


--
-- Name: calculate_next_sync_at(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_next_sync_at(frequency text) RETURNS timestamp with time zone
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  CASE frequency
    WHEN 'hourly' THEN RETURN now() + INTERVAL '1 hour';
    WHEN 'daily' THEN RETURN now() + INTERVAL '1 day';
    ELSE RETURN NULL;
  END CASE;
END;
$$;


--
-- Name: can_use_feature(uuid, public.usage_type); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.can_use_feature(_org_id uuid, _usage_type public.usage_type) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _plan_type plan_type;
  _base_limit integer;
  _addon_limit integer;
  _total_limit integer;
  _current_usage integer;
  _period_start timestamptz;
  _period_end timestamptz;
BEGIN
  IF _usage_type = 'ai_edit' THEN RETURN true; END IF;

  SELECT plan_type, current_period_start, current_period_end 
  INTO _plan_type, _period_start, _period_end
  FROM public.subscriptions
  WHERE organization_id = _org_id AND status = 'active';
  
  IF _plan_type IS NULL THEN RETURN false; END IF;
  
  SELECT 
    CASE _usage_type
      WHEN 'script' THEN monthly_scripts
      WHEN 'carousel' THEN monthly_carousels
      WHEN 'multichannel' THEN monthly_multichannel
      WHEN 'image_generation' THEN monthly_images
    END INTO _base_limit
  FROM public.plan_limits WHERE plan_type = _plan_type;
  
  IF _base_limit = -1 THEN RETURN true; END IF;
  
  -- Calculate addon limits
  SELECT COALESCE(SUM(
    CASE _usage_type
      WHEN 'script' THEN pl.monthly_scripts
      WHEN 'carousel' THEN pl.monthly_carousels
      WHEN 'multichannel' THEN pl.monthly_multichannel
      WHEN 'image_generation' THEN pl.monthly_images
    END
  ), 0) INTO _addon_limit
  FROM public.addon_purchases ap
  JOIN public.plan_limits pl ON pl.plan_type = ap.plan_type
  WHERE ap.organization_id = _org_id
    AND ap.status = 'active'
    AND ap.expires_at > now();

  _total_limit := _base_limit + _addon_limit;
  
  _current_usage := public.get_org_usage(_org_id, _usage_type);
  RETURN _current_usage < _total_limit;
END;
$$;


--
-- Name: can_use_unit(uuid, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.can_use_unit(_org_id uuid, _unit_type text, _amount integer DEFAULT 1) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _plan plan_type;
  _limit integer;
  _used integer;
BEGIN
  SELECT plan_type INTO _plan FROM public.subscriptions
    WHERE organization_id = _org_id AND status = 'active' LIMIT 1;
  IF _plan IS NULL THEN RETURN false; END IF;

  SELECT CASE _unit_type
    WHEN 'content' THEN monthly_content_units
    WHEN 'image'   THEN monthly_image_units
    WHEN 'video'   THEN monthly_video_units
  END INTO _limit FROM public.plan_limits WHERE plan_type = _plan;

  IF _limit IS NULL THEN RETURN false; END IF;
  IF _limit = -1 THEN RETURN true; END IF;

  _used := public.get_org_usage_units(_org_id, _unit_type);
  RETURN (_used + _amount) <= _limit;
END;
$$;


--
-- Name: check_kpi_target_on_log(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_kpi_target_on_log() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  campaign_record RECORD;
  goal JSONB;
  metric_key TEXT;
  metric_value NUMERIC;
  target_value NUMERIC;
  notification_key TEXT;
  goal_label TEXT;
BEGIN
  -- Get campaign info
  SELECT * INTO campaign_record FROM public.campaigns WHERE id = NEW.campaign_id;
  
  IF campaign_record IS NULL OR campaign_record.goals IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Check each goal
  FOR goal IN SELECT * FROM jsonb_array_elements(campaign_record.goals)
  LOOP
    metric_key := goal->>'metric';
    target_value := (goal->>'target')::NUMERIC;
    goal_label := COALESCE(goal->>'label', metric_key);
    
    -- Get metric value from the new log
    IF NEW.metrics ? metric_key THEN
      metric_value := (NEW.metrics->>metric_key)::NUMERIC;
      
      IF metric_value >= target_value THEN
        notification_key := 'kpi_reached_' || metric_key || '_' || NEW.campaign_id::TEXT;
        
        -- Check if notification already sent
        IF NOT EXISTS (
          SELECT 1 FROM public.campaign_notification_logs 
          WHERE campaign_notification_logs.notification_key = check_kpi_target_on_log.notification_key
        ) THEN
          -- Insert notification
          INSERT INTO public.notifications (user_id, organization_id, type, title, message, data)
          VALUES (
            campaign_record.created_by,
            campaign_record.organization_id,
            CASE WHEN metric_value > target_value THEN 'kpi_target_exceeded' ELSE 'kpi_target_reached' END,
            CASE WHEN metric_value > target_value THEN 'Vượt mục tiêu KPI!' ELSE 'Đạt mục tiêu KPI!' END,
            campaign_record.name || ': ' || goal_label || ' đã đạt ' || metric_value::TEXT || '/' || target_value::TEXT,
            jsonb_build_object(
              'campaign_id', NEW.campaign_id,
              'metric', metric_key,
              'label', goal_label,
              'target', target_value,
              'current', metric_value
            )
          );
          
          -- Log to prevent duplicates
          INSERT INTO public.campaign_notification_logs (campaign_id, notification_key, notification_type)
          VALUES (NEW.campaign_id, notification_key, 
            CASE WHEN metric_value > target_value THEN 'kpi_target_exceeded' ELSE 'kpi_target_reached' END
          );
        END IF;
      END IF;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$;


--
-- Name: check_org_features_batch(uuid, public.usage_type[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_org_features_batch(p_org_id uuid, p_usage_types public.usage_type[] DEFAULT ARRAY['script'::public.usage_type, 'carousel'::public.usage_type, 'multichannel'::public.usage_type, 'image_generation'::public.usage_type]) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
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


--
-- Name: check_parent_is_core(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_parent_is_core() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.parent_pack_id IS NOT NULL THEN
    -- Check that parent exists and is a core industry
    IF NOT EXISTS (
      SELECT 1 FROM public.industry_global_packs 
      WHERE id = NEW.parent_pack_id 
      AND industry_level = 'core'
    ) THEN
      RAISE EXCEPTION 'Parent pack must be a core industry';
    END IF;
    -- Force sub level when parent is set
    NEW.industry_level := 'sub';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: claim_pipeline_stage(uuid, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.claim_pipeline_stage(p_pipeline_id uuid, p_expected_stage text DEFAULT NULL::text, p_stale_seconds integer DEFAULT 300) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_token text := gen_random_uuid()::text;
  v_updated int;
BEGIN
  UPDATE public.agent_pipelines
     SET stage_claim_token = v_token,
         stage_claim_at = now()
   WHERE id = p_pipeline_id
     AND (p_expected_stage IS NULL OR current_stage::text = p_expected_stage)
     AND (stage_claim_token IS NULL OR stage_claim_at < now() - make_interval(secs => p_stale_seconds));
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated > 0 THEN RETURN v_token; END IF;
  RETURN NULL;
END;
$$;


--
-- Name: cleanup_expired_cache(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_cache() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM ai_response_cache
  WHERE expires_at < now();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;


--
-- Name: cleanup_expired_facebook_oauth_sessions(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_facebook_oauth_sessions() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.facebook_oauth_sessions WHERE expires_at < now();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;


--
-- Name: cleanup_expired_generation_tasks(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_generation_tasks() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.generation_tasks
  WHERE expires_at < NOW()
    OR (status IN ('completed', 'failed') AND completed_at < NOW() - INTERVAL '7 days');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;


--
-- Name: cleanup_expired_oauth_pending_states(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_oauth_pending_states() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  DELETE FROM public.oauth_pending_states WHERE expires_at < now();
END;
$$;


--
-- Name: cleanup_knowledge_graph_cache(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_knowledge_graph_cache() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE deleted_count INTEGER;
BEGIN
  DELETE FROM public.knowledge_graph_cache WHERE expires_at < now();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;


--
-- Name: cleanup_old_checkpoints(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_old_checkpoints() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.workflow_checkpoints
  WHERE created_at < NOW() - INTERVAL '7 days'
    OR (status IN ('completed', 'failed') AND created_at < NOW() - INTERVAL '1 day');
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;


--
-- Name: cleanup_old_edge_metrics(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_old_edge_metrics() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_count INTEGER;
BEGIN
  DELETE FROM edge_function_metrics WHERE created_at < now() - INTERVAL '30 days';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;


--
-- Name: cleanup_stale_telegram_chat_state(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_stale_telegram_chat_state() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.telegram_chat_state
  WHERE updated_at < now() - INTERVAL '30 minutes';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;


--
-- Name: cleanup_telegram_processed_updates(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_telegram_processed_updates() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.telegram_processed_updates
  WHERE processed_at < now() - INTERVAL '24 hours';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;


--
-- Name: cleanup_web_search_cache(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_web_search_cache() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM web_search_cache WHERE expires_at < now();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;


--
-- Name: extract_doc_year(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.extract_doc_year(doc_name text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    SET search_path TO 'public'
    AS $_$
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
$_$;


--
-- Name: fetch_brand_context_batch(uuid, integer, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fetch_brand_context_batch(p_brand_template_id uuid, p_max_personas integer DEFAULT 5, p_max_products integer DEFAULT 5, p_max_topics integer DEFAULT 10) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
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


--
-- Name: find_duplicate_regulations(double precision, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.find_duplicate_regulations(similarity_threshold double precision DEFAULT 0.85, max_results integer DEFAULT 100) RETURNS TABLE(node_id_1 uuid, node_id_2 uuid, name_1 text, name_2 text, similarity double precision, quality_1 smallint, quality_2 smallint, match_type text)
    LANGUAGE plpgsql STABLE
    SET search_path TO 'public', 'extensions'
    AS $$
BEGIN
  RETURN QUERY
  WITH regulation_nodes AS (
    SELECT 
      n.id,
      n.display_name::TEXT as display_name_text,
      n.embedding,
      n.content_quality_score,
      (regexp_match(n.display_name::TEXT, '(\d+/\d{4}/[A-Za-z\-]+)'))[1] as doc_code,
      (regexp_match(n.display_name::TEXT, '(\d+/\d{4})'))[1] as doc_number,
      public.extract_doc_year(n.display_name::TEXT) as doc_year,
      public.normalize_vn_text(n.display_name::TEXT) as normalized_name
    FROM public.industry_knowledge_nodes n
    WHERE n.node_type = 'regulation'
      AND n.is_active = true
      AND n.embedding IS NOT NULL
  ),
  duplicate_pairs AS (
    SELECT 
      n1.id as id1,
      n2.id as id2,
      n1.display_name_text as name1,
      n2.display_name_text as name2,
      1 - (n1.embedding <=> n2.embedding) as sim,
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
    WHERE 1 - (n1.embedding <=> n2.embedding) >= similarity_threshold
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
$$;


--
-- Name: find_node_duplicates(uuid, double precision, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.find_node_duplicates(target_node_id uuid, similarity_threshold double precision DEFAULT 0.85, max_results integer DEFAULT 20) RETURNS TABLE(duplicate_node_id uuid, duplicate_name text, similarity double precision, duplicate_quality smallint, match_type text)
    LANGUAGE plpgsql STABLE
    SET search_path TO 'public', 'extensions'
    AS $$
DECLARE
  target_embedding extensions.vector;
  target_doc_code TEXT;
  target_doc_number TEXT;
  target_doc_year TEXT;
  target_normalized_name TEXT;
BEGIN
  SELECT 
    n.embedding,
    (regexp_match(n.display_name::TEXT, '(\d+/\d{4}/[A-Za-z\-]+)'))[1],
    (regexp_match(n.display_name::TEXT, '(\d+/\d{4})'))[1],
    public.extract_doc_year(n.display_name::TEXT),
    public.normalize_vn_text(n.display_name::TEXT)
  INTO target_embedding, target_doc_code, target_doc_number, target_doc_year, target_normalized_name
  FROM public.industry_knowledge_nodes n
  WHERE n.id = target_node_id;

  IF target_embedding IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH candidates AS (
    SELECT 
      n.id,
      n.display_name::TEXT as display_name_text,
      n.content_quality_score::SMALLINT as quality,
      1 - (n.embedding <=> target_embedding) as sim,
      (regexp_match(n.display_name::TEXT, '(\d+/\d{4}/[A-Za-z\-]+)'))[1] as doc_code,
      (regexp_match(n.display_name::TEXT, '(\d+/\d{4})'))[1] as doc_number,
      public.extract_doc_year(n.display_name::TEXT) as doc_year,
      public.normalize_vn_text(n.display_name::TEXT) as normalized_name,
      CASE
        WHEN target_doc_code IS NOT NULL 
             AND (regexp_match(n.display_name::TEXT, '(\d+/\d{4}/[A-Za-z\-]+)'))[1] = target_doc_code 
        THEN 'exact_code'
        WHEN target_doc_number IS NOT NULL 
             AND (regexp_match(n.display_name::TEXT, '(\d+/\d{4})'))[1] = target_doc_number 
        THEN 'same_number'
        WHEN target_doc_number IS NULL 
             AND (regexp_match(n.display_name::TEXT, '(\d+/\d{4})'))[1] IS NULL
             AND target_doc_year IS NOT NULL 
             AND public.extract_doc_year(n.display_name::TEXT) = target_doc_year 
        THEN 'same_year'
        ELSE 'semantic_only'
      END as mtype
    FROM public.industry_knowledge_nodes n
    WHERE n.id != target_node_id
      AND n.node_type = 'regulation'
      AND n.is_active = true
      AND n.embedding IS NOT NULL
      AND 1 - (n.embedding <=> target_embedding) >= similarity_threshold
  )
  SELECT 
    c.id,
    c.display_name_text,
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
$$;


--
-- Name: find_orphan_storage_paths(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.find_orphan_storage_paths(p_bucket text) RETURNS TABLE(object_name text, size_bytes bigint, created_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'storage'
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


--
-- Name: find_related_content(extensions.vector, uuid, uuid, integer, double precision); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.find_related_content(query_embedding extensions.vector, org_id uuid, exclude_id uuid DEFAULT NULL::uuid, match_count integer DEFAULT 5, similarity_threshold double precision DEFAULT 0.7) RETURNS TABLE(id uuid, title text, topic text, similarity double precision, website_content text, blogger_content text, wordpress_content text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public', 'extensions'
    AS $$
  SELECT
    mcc.id,
    mcc.title,
    mcc.topic,
    1 - (mcc.content_embedding <=> query_embedding) AS similarity,
    mcc.website_content,
    mcc.blogger_content,
    mcc.wordpress_content
  FROM public.multi_channel_contents mcc
  WHERE mcc.organization_id = org_id
    AND mcc.content_embedding IS NOT NULL
    AND (exclude_id IS NULL OR mcc.id != exclude_id)
    AND mcc.status = 'published'
    AND 1 - (mcc.content_embedding <=> query_embedding) >= similarity_threshold
  ORDER BY mcc.content_embedding <=> query_embedding ASC
  LIMIT match_count;
$$;


--
-- Name: get_batch_processing_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_batch_processing_stats() RETURNS TABLE(job_type text, running_count bigint, pending_count bigint, completed_today bigint, failed_today bigint)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    j.job_type,
    COUNT(*) FILTER (WHERE j.status = 'running')::BIGINT AS running_count,
    COUNT(*) FILTER (WHERE j.status = 'pending')::BIGINT AS pending_count,
    COUNT(*) FILTER (WHERE j.status = 'completed' AND j.completed_at >= CURRENT_DATE)::BIGINT AS completed_today,
    COUNT(*) FILTER (WHERE j.status = 'failed' AND j.completed_at >= CURRENT_DATE)::BIGINT AS failed_today
  FROM public.batch_processing_jobs j
  GROUP BY j.job_type;
END;
$$;


--
-- Name: get_cache_stats(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_cache_stats(p_organization_id uuid DEFAULT NULL::uuid) RETURNS TABLE(function_name text, cache_scope text, total_entries bigint, total_hits bigint, avg_hit_count numeric, oldest_entry timestamp with time zone, newest_entry timestamp with time zone)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.function_name,
    c.cache_scope,
    COUNT(*)::bigint as total_entries,
    SUM(c.hit_count)::bigint as total_hits,
    ROUND(AVG(c.hit_count), 2) as avg_hit_count,
    MIN(c.created_at) as oldest_entry,
    MAX(c.created_at) as newest_entry
  FROM ai_response_cache c
  WHERE c.expires_at > now()
    AND (p_organization_id IS NULL OR c.organization_id = p_organization_id OR c.cache_scope = 'global')
  GROUP BY c.function_name, c.cache_scope
  ORDER BY total_hits DESC;
END;
$$;


--
-- Name: get_connected_nodes(uuid, text[], text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_connected_nodes(p_node_id uuid, p_edge_types text[] DEFAULT NULL::text[], p_direction text DEFAULT 'both'::text) RETURNS TABLE(node_id uuid, node_type text, node_key text, display_name jsonb, edge_type text, edge_weight double precision, direction text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT n.id, n.node_type, n.node_key, n.display_name, e.edge_type, e.weight, 'outgoing'::TEXT
  FROM public.industry_knowledge_edges e
  JOIN public.industry_knowledge_nodes n ON n.id = e.target_node_id
  WHERE e.source_node_id = p_node_id AND n.is_active = true
    AND (p_edge_types IS NULL OR e.edge_type = ANY(p_edge_types))
    AND p_direction IN ('outgoing', 'both')
  UNION ALL
  SELECT n.id, n.node_type, n.node_key, n.display_name, e.edge_type, e.weight, 'incoming'::TEXT
  FROM public.industry_knowledge_edges e
  JOIN public.industry_knowledge_nodes n ON n.id = e.source_node_id
  WHERE e.target_node_id = p_node_id AND n.is_active = true
    AND (p_edge_types IS NULL OR e.edge_type = ANY(p_edge_types))
    AND p_direction IN ('incoming', 'both')
  ORDER BY edge_weight DESC;
END;
$$;


--
-- Name: get_content_quality_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_content_quality_stats() RETURNS TABLE(quality_level text, node_count bigint, percentage numeric)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  total_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO total_count 
  FROM public.industry_knowledge_nodes 
  WHERE node_type = 'regulation' AND full_text IS NOT NULL;
  
  RETURN QUERY
  SELECT 
    CASE 
      WHEN content_quality_score >= 90 THEN 'excellent'
      WHEN content_quality_score >= 70 THEN 'good'
      WHEN content_quality_score >= 50 THEN 'acceptable'
      WHEN content_quality_score IS NOT NULL THEN 'poor'
      ELSE 'unscored'
    END AS quality_level,
    COUNT(*)::BIGINT AS node_count,
    CASE WHEN total_count > 0 
      THEN ROUND((COUNT(*)::NUMERIC / total_count) * 100, 2)
      ELSE 0 
    END AS percentage
  FROM public.industry_knowledge_nodes
  WHERE node_type = 'regulation'
  GROUP BY 
    CASE 
      WHEN content_quality_score >= 90 THEN 'excellent'
      WHEN content_quality_score >= 70 THEN 'good'
      WHEN content_quality_score >= 50 THEN 'acceptable'
      WHEN content_quality_score IS NOT NULL THEN 'poor'
      ELSE 'unscored'
    END
  ORDER BY 
    CASE quality_level
      WHEN 'excellent' THEN 1
      WHEN 'good' THEN 2
      WHEN 'acceptable' THEN 3
      WHEN 'poor' THEN 4
      ELSE 5
    END;
END;
$$;


--
-- Name: get_db_memory_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_db_memory_stats() RETURNS TABLE(table_name text, category text, row_count bigint, size_bytes bigint, size_pretty text, oldest_record timestamp with time zone, newest_record timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: get_detailed_quality_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_detailed_quality_stats() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_regulations', COUNT(*) FILTER (WHERE node_type = 'regulation'),
    'with_full_text', COUNT(*) FILTER (WHERE node_type = 'regulation' AND full_text IS NOT NULL AND LENGTH(full_text) > 100),
    'with_quality_score', COUNT(*) FILTER (WHERE node_type = 'regulation' AND content_quality_score IS NOT NULL),
    'excellent_90_plus', COUNT(*) FILTER (WHERE node_type = 'regulation' AND content_quality_score >= 90),
    'good_80_to_89', COUNT(*) FILTER (WHERE node_type = 'regulation' AND content_quality_score >= 80 AND content_quality_score < 90),
    'acceptable_70_to_79', COUNT(*) FILTER (WHERE node_type = 'regulation' AND content_quality_score >= 70 AND content_quality_score < 80),
    'poor_below_70', COUNT(*) FILTER (WHERE node_type = 'regulation' AND content_quality_score < 70),
    'pending_parse', COUNT(*) FILTER (WHERE node_type = 'regulation' AND (parse_status = 'pending' OR parse_status IS NULL)),
    'failed_parse', COUNT(*) FILTER (WHERE node_type = 'regulation' AND parse_status = 'failed'),
    'needs_ai_clean', COUNT(*) FILTER (
      WHERE node_type = 'regulation' 
      AND content_quality_score IS NOT NULL 
      AND content_quality_score < 85
      AND (quality_breakdown->>'artifact_penalty')::int > 15
    ),
    'with_artifacts', COUNT(*) FILTER (
      WHERE node_type = 'regulation'
      AND full_text IS NOT NULL
      AND (
        full_text LIKE '%Turn on more accessible%'
        OR full_text LIKE '%[![%'
        OR full_text LIKE '%| --- |%'
        OR full_text LIKE '%Đăng nhập%Đăng ký%'
        OR full_text LIKE '%Văn bản liên quan%Xem thêm%'
      )
    ),
    'avg_quality_score', ROUND(AVG(content_quality_score) FILTER (WHERE node_type = 'regulation' AND content_quality_score IS NOT NULL)),
    'avg_text_length', ROUND(AVG(LENGTH(full_text)) FILTER (WHERE node_type = 'regulation' AND full_text IS NOT NULL)),
    'quality_distribution', jsonb_build_object(
      '0-49', COUNT(*) FILTER (WHERE node_type = 'regulation' AND content_quality_score BETWEEN 0 AND 49),
      '50-69', COUNT(*) FILTER (WHERE node_type = 'regulation' AND content_quality_score BETWEEN 50 AND 69),
      '70-79', COUNT(*) FILTER (WHERE node_type = 'regulation' AND content_quality_score BETWEEN 70 AND 79),
      '80-89', COUNT(*) FILTER (WHERE node_type = 'regulation' AND content_quality_score BETWEEN 80 AND 89),
      '90-100', COUNT(*) FILTER (WHERE node_type = 'regulation' AND content_quality_score BETWEEN 90 AND 100)
    )
  )
  INTO result
  FROM industry_knowledge_nodes;
  
  RETURN result;
END;
$$;


--
-- Name: get_graph_health_summary(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_graph_health_summary() RETURNS TABLE(metric_name text, metric_value numeric, status text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_total_nodes INT;
  v_total_edges INT;
  v_with_embeddings INT;
  v_orphan_count INT;
  v_embedding_pct NUMERIC;
  v_orphan_pct NUMERIC;
  v_connectivity NUMERIC;
BEGIN
  -- Get counts
  SELECT COUNT(*) INTO v_total_nodes FROM public.industry_knowledge_nodes WHERE is_active = true;
  SELECT COUNT(*) INTO v_total_edges FROM public.industry_knowledge_edges;
  SELECT COUNT(*) INTO v_with_embeddings FROM public.industry_knowledge_nodes WHERE is_active = true AND embedding IS NOT NULL;
  SELECT COUNT(*) INTO v_orphan_count FROM public.industry_knowledge_nodes n
    WHERE n.is_active = true
    AND NOT EXISTS (SELECT 1 FROM public.industry_knowledge_edges e WHERE e.source_node_id = n.id OR e.target_node_id = n.id);
  
  -- Calculate percentages
  v_embedding_pct := CASE WHEN v_total_nodes > 0 THEN (v_with_embeddings::NUMERIC / v_total_nodes * 100) ELSE 0 END;
  v_orphan_pct := CASE WHEN v_total_nodes > 0 THEN (v_orphan_count::NUMERIC / v_total_nodes * 100) ELSE 0 END;
  v_connectivity := CASE WHEN v_total_nodes > 0 THEN (v_total_edges::NUMERIC / v_total_nodes) ELSE 0 END;
  
  RETURN QUERY VALUES
    ('total_nodes', v_total_nodes::NUMERIC, 'info'),
    ('total_edges', v_total_edges::NUMERIC, 'info'),
    ('embedding_coverage', ROUND(v_embedding_pct, 2), 
      CASE WHEN v_embedding_pct >= 90 THEN 'pass' WHEN v_embedding_pct >= 50 THEN 'warn' ELSE 'fail' END),
    ('orphan_nodes', v_orphan_count::NUMERIC, 
      CASE WHEN v_orphan_pct <= 5 THEN 'pass' WHEN v_orphan_pct <= 15 THEN 'warn' ELSE 'fail' END),
    ('orphan_percentage', ROUND(v_orphan_pct, 2),
      CASE WHEN v_orphan_pct <= 5 THEN 'pass' WHEN v_orphan_pct <= 15 THEN 'warn' ELSE 'fail' END),
    ('avg_connectivity', ROUND(v_connectivity, 2),
      CASE WHEN v_connectivity >= 1.5 THEN 'pass' WHEN v_connectivity >= 0.5 THEN 'warn' ELSE 'fail' END);
END;
$$;


--
-- Name: get_industry_regulations(uuid, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_industry_regulations(p_global_pack_id uuid, p_include_inherited boolean DEFAULT true) RETURNS TABLE(regulation_node_id uuid, regulation_key text, regulation_name jsonb, regulation_properties jsonb, relationship_type text, is_inherited boolean)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT n_reg.id, n_reg.node_key, n_reg.display_name, n_reg.properties, e.edge_type, false
  FROM public.industry_knowledge_nodes n_ind
  JOIN public.industry_knowledge_edges e ON e.source_node_id = n_ind.id
  JOIN public.industry_knowledge_nodes n_reg ON n_reg.id = e.target_node_id
  WHERE n_ind.global_pack_id = p_global_pack_id AND n_ind.node_type = 'industry'
    AND n_reg.node_type = 'regulation' AND n_reg.is_active = true
    AND e.edge_type IN ('regulated_by', 'requires_compliance')
  UNION
  SELECT n_reg.id, n_reg.node_key, n_reg.display_name, n_reg.properties, e2.edge_type, true
  FROM public.industry_knowledge_nodes n_ind
  JOIN public.industry_knowledge_edges e1 ON e1.target_node_id = n_ind.id
  JOIN public.industry_knowledge_nodes n_parent ON n_parent.id = e1.source_node_id
  JOIN public.industry_knowledge_edges e2 ON e2.source_node_id = n_parent.id
  JOIN public.industry_knowledge_nodes n_reg ON n_reg.id = e2.target_node_id
  WHERE n_ind.global_pack_id = p_global_pack_id AND n_ind.node_type = 'industry'
    AND e1.edge_type = 'parent_of' AND n_parent.node_type = 'industry'
    AND n_reg.node_type = 'regulation' AND n_reg.is_active = true
    AND e2.edge_type IN ('regulated_by', 'requires_compliance')
    AND p_include_inherited = true
  ORDER BY is_inherited, regulation_key;
END;
$$;


--
-- Name: get_org_plan_type(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_org_plan_type(_org_id uuid) RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT plan_type::text
  FROM public.subscriptions
  WHERE organization_id = _org_id AND status = 'active'
  LIMIT 1
$$;


--
-- Name: get_org_usage(uuid, public.usage_type); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_org_usage(_org_id uuid, _usage_type public.usage_type) RETURNS integer
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT COUNT(*)::integer
  FROM public.usage_logs ul
  JOIN public.subscriptions s ON s.organization_id = ul.organization_id
  WHERE ul.organization_id = _org_id
    AND ul.usage_type = _usage_type
    AND ul.created_at >= s.current_period_start
    AND ul.created_at <= s.current_period_end
$$;


--
-- Name: get_org_usage_units(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_org_usage_units(_org_id uuid, _unit_type text) RETURNS integer
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT CASE _unit_type
    WHEN 'content' THEN (
      SELECT COUNT(*)::int FROM public.usage_logs ul
      JOIN public.subscriptions s ON s.organization_id = ul.organization_id
      WHERE ul.organization_id = _org_id
        AND ul.usage_type::text IN ('script','carousel','multichannel','video_generation')
        AND ul.created_at >= s.current_period_start
        AND ul.created_at <= s.current_period_end
    )
    WHEN 'image' THEN (
      SELECT COUNT(*)::int FROM public.usage_logs ul
      JOIN public.subscriptions s ON s.organization_id = ul.organization_id
      WHERE ul.organization_id = _org_id
        AND ul.usage_type::text = 'image_generation'
        AND ul.created_at >= s.current_period_start
        AND ul.created_at <= s.current_period_end
    )
    WHEN 'video' THEN (
      SELECT COUNT(*)::int FROM public.usage_logs ul
      JOIN public.subscriptions s ON s.organization_id = ul.organization_id
      WHERE ul.organization_id = _org_id
        AND ul.usage_type::text = 'video_generation'
        AND ul.created_at >= s.current_period_start
        AND ul.created_at <= s.current_period_end
    )
    ELSE 0
  END
$$;


--
-- Name: get_org_usage_units_batch(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_org_usage_units_batch(_org_id uuid) RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT jsonb_build_object(
    'content', public.get_org_usage_units(_org_id, 'content'),
    'image',   public.get_org_usage_units(_org_id, 'image'),
    'video',   public.get_org_usage_units(_org_id, 'video')
  )
$$;


--
-- Name: get_orphan_nodes(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_orphan_nodes(p_limit integer DEFAULT 100) RETURNS TABLE(node_id uuid, node_type text, node_key text, display_name jsonb, created_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT n.id, n.node_type, n.node_key, n.display_name, n.created_at
  FROM public.industry_knowledge_nodes n
  WHERE n.is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM public.industry_knowledge_edges e
      WHERE e.source_node_id = n.id OR e.target_node_id = n.id
    )
  ORDER BY n.created_at DESC
  LIMIT p_limit;
END;
$$;


--
-- Name: get_regulation_embedding_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_regulation_embedding_stats() RETURNS TABLE(total_regulations bigint, with_embedding bigint, missing_embedding bigint, embedding_percentage double precision)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT 
    COUNT(*) as total_regulations,
    SUM(CASE WHEN embedding IS NOT NULL THEN 1 ELSE 0 END)::BIGINT as with_embedding,
    SUM(CASE WHEN embedding IS NULL THEN 1 ELSE 0 END)::BIGINT as missing_embedding,
    ROUND((SUM(CASE WHEN embedding IS NOT NULL THEN 1 ELSE 0 END)::FLOAT / NULLIF(COUNT(*), 0) * 100)::NUMERIC, 1)::FLOAT as embedding_percentage
  FROM industry_knowledge_nodes
  WHERE node_type = 'regulation' AND is_active = true;
$$;


--
-- Name: get_related_industries(uuid, double precision, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_related_industries(p_global_pack_id uuid, p_min_weight double precision DEFAULT 0.5, p_limit integer DEFAULT 5) RETURNS TABLE(industry_pack_id uuid, industry_code text, industry_name jsonb, relationship_type text, relationship_weight double precision)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT igp.id, igp.industry_code, n_target.display_name, e.edge_type, e.weight
  FROM public.industry_knowledge_nodes n_source
  JOIN public.industry_knowledge_edges e ON e.source_node_id = n_source.id
  JOIN public.industry_knowledge_nodes n_target ON n_target.id = e.target_node_id
  JOIN public.industry_global_packs igp ON igp.id = n_target.global_pack_id
  WHERE n_source.global_pack_id = p_global_pack_id
    AND n_source.node_type = 'industry' AND n_target.node_type = 'industry'
    AND n_target.is_active = true AND igp.is_active = true
    AND e.weight >= p_min_weight
    AND e.edge_type IN ('related_to', 'shares_audience', 'competes_with')
  ORDER BY e.weight DESC LIMIT p_limit;
END;
$$;


--
-- Name: get_user_org_id(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_org_id(_user_id uuid) RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT organization_id FROM public.organization_members
  WHERE user_id = _user_id
  ORDER BY 
    CASE role 
      WHEN 'owner' THEN 1 
      WHEN 'admin' THEN 2 
      WHEN 'member' THEN 3 
      ELSE 4 
    END,
    created_at ASC
  LIMIT 1
$$;


--
-- Name: get_user_usage(uuid, public.usage_type); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_usage(_user_id uuid, _usage_type public.usage_type) RETURNS integer
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT COUNT(*)::integer
  FROM public.usage_logs ul
  JOIN public.subscriptions s ON s.user_id = ul.user_id
  WHERE ul.user_id = _user_id
    AND ul.usage_type = _usage_type
    AND ul.created_at >= s.current_period_start
    AND ul.created_at <= s.current_period_end
$$;


--
-- Name: get_web_search_cache_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_web_search_cache_stats() RETURNS TABLE(search_type text, total_entries bigint, total_hits bigint, avg_hit_count numeric, cache_size_estimate bigint)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.search_type,
    COUNT(*)::BIGINT as total_entries,
    SUM(c.hit_count)::BIGINT as total_hits,
    ROUND(AVG(c.hit_count), 2) as avg_hit_count,
    SUM(pg_column_size(c.results))::BIGINT as cache_size_estimate
  FROM web_search_cache c
  WHERE c.expires_at > now()
  GROUP BY c.search_type
  ORDER BY total_hits DESC;
END;
$$;


--
-- Name: handle_assignment_notification(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_assignment_notification() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- On INSERT: notify assignee about new assignment
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (user_id, organization_id, type, title, message, data)
    VALUES (
      NEW.assigned_to,
      NEW.organization_id,
      'assignment_created',
      'Nhiệm vụ mới',
      'Bạn được phân công một nhiệm vụ mới cho kênh ' || NEW.channel,
      jsonb_build_object(
        'assignment_id', NEW.id,
        'content_id', NEW.content_id,
        'channel', NEW.channel,
        'priority', NEW.priority,
        'due_date', NEW.due_date
      )
    );
    RETURN NEW;
  END IF;

  -- On UPDATE: notify assignee if status changed
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.notifications (user_id, organization_id, type, title, message, data)
    VALUES (
      NEW.assigned_to,
      NEW.organization_id,
      'assignment_status_changed',
      'Trạng thái nhiệm vụ thay đổi',
      'Nhiệm vụ của bạn đã chuyển sang trạng thái: ' || NEW.status,
      jsonb_build_object(
        'assignment_id', NEW.id,
        'content_id', NEW.content_id,
        'channel', NEW.channel,
        'old_status', OLD.status,
        'new_status', NEW.status
      )
    );
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  new_org_id UUID;
  user_full_name TEXT;
BEGIN
  -- Get full_name with fallback for Google OAuth (name field)
  user_full_name := COALESCE(
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'name'
  );

  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    user_full_name,
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  
  IF NEW.email = 'flowasite@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  END IF;
  
  IF NOT COALESCE((NEW.raw_user_meta_data->>'skip_default_org')::boolean, false) THEN
    INSERT INTO public.organizations (name, slug, owner_id)
    VALUES (
      COALESCE(user_full_name, split_part(NEW.email, '@', 1)) || '''s Workspace',
      NEW.id::text, NEW.id
    ) RETURNING id INTO new_org_id;
    
    INSERT INTO public.organization_members (organization_id, user_id, role, joined_at)
    VALUES (new_org_id, NEW.id, 'owner', now());
    
    INSERT INTO public.subscriptions (user_id, organization_id, plan_type, status)
    VALUES (NEW.id, new_org_id, 'free', 'active');
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: has_org_role(uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_org_role(_user_id uuid, _org_id uuid, _role text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE user_id = _user_id
      AND organization_id = _org_id
      AND role::text = _role
  )
$$;


--
-- Name: has_org_role(uuid, uuid, public.org_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_org_role(_user_id uuid, _org_id uuid, _role public.org_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id 
      AND organization_id = _org_id 
      AND role = _role
  )
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: increment_cache_hit(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_cache_hit(p_cache_key text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE ai_response_cache
  SET hit_count = hit_count + 1,
      last_hit_at = now()
  WHERE cache_key = p_cache_key;
END;
$$;


--
-- Name: increment_firecrawl_cache_hit(text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_firecrawl_cache_hit(_kw text, _lang text, _country text) RETURNS void
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  UPDATE public.firecrawl_serp_cache
     SET hit_count = hit_count + 1
   WHERE keyword_normalized = _kw
     AND lang = _lang
     AND country = _country;
$$;


--
-- Name: increment_industry_version(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_industry_version(current_version text) RETURNS text
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  major int;
  minor int;
  parts text[];
BEGIN
  -- Parse version like "1.0" or "2.3"
  parts := string_to_array(current_version, '.');
  
  IF array_length(parts, 1) = 2 THEN
    major := parts[1]::int;
    minor := parts[2]::int;
    minor := minor + 1;
    RETURN major::text || '.' || minor::text;
  ELSE
    -- Default if format is wrong
    RETURN '1.0';
  END IF;
END;
$$;


--
-- Name: invalidate_cache_on_brand_update(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.invalidate_cache_on_brand_update() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF OLD.forbidden_words IS DISTINCT FROM NEW.forbidden_words OR
     OLD.tone_of_voice IS DISTINCT FROM NEW.tone_of_voice OR
     OLD.preferred_words IS DISTINCT FROM NEW.preferred_words OR
     OLD.brand_positioning IS DISTINCT FROM NEW.brand_positioning OR
     OLD.formality_level IS DISTINCT FROM NEW.formality_level OR
     OLD.language_style IS DISTINCT FROM NEW.language_style THEN
    
    DELETE FROM ai_response_cache
    WHERE cache_scope = 'org' 
      AND organization_id = NEW.organization_id
      AND brand_template_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: invalidate_cache_on_industry_update(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.invalidate_cache_on_industry_update() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF OLD.version IS DISTINCT FROM NEW.version THEN
    DELETE FROM ai_response_cache
    WHERE industry_memory_version = OLD.version;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: is_org_admin(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_org_admin(_user_id uuid, _org_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id 
      AND organization_id = _org_id 
      AND role IN ('owner', 'admin')
  )
$$;


--
-- Name: is_org_member(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_org_member(_user_id uuid, _org_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE user_id = _user_id
      AND organization_id = _org_id
  )
$$;


--
-- Name: levenshtein_similarity(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.levenshtein_similarity(text1 text, text2 text) RETURNS double precision
    LANGUAGE plpgsql IMMUTABLE
    SET search_path TO 'public'
    AS $$
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
$$;


--
-- Name: log_knowledge_graph_query(text, jsonb, integer, integer, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_knowledge_graph_query(p_query_type text, p_query_params jsonb DEFAULT '{}'::jsonb, p_result_count integer DEFAULT 0, p_duration_ms integer DEFAULT 0, p_organization_id uuid DEFAULT NULL::uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.knowledge_graph_analytics (
    query_type, query_params, result_count, duration_ms, user_id, organization_id
  ) VALUES (
    p_query_type, p_query_params, p_result_count, p_duration_ms, auth.uid(), p_organization_id
  )
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;


--
-- Name: log_prompt_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_prompt_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.ai_prompt_history (
    prompt_id,
    organization_id,
    version,
    content,
    variables,
    change_type,
    change_reason,
    changed_by
  ) VALUES (
    NEW.id,
    NEW.organization_id,
    NEW.version,
    NEW.content,
    NEW.variables,
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'created'
      WHEN OLD.content IS DISTINCT FROM NEW.content THEN 'content_update'
      WHEN OLD.is_active IS DISTINCT FROM NEW.is_active THEN 'status_change'
      ELSE 'metadata_update'
    END,
    COALESCE(
      current_setting('app.change_reason', true),
      CASE 
        WHEN TG_OP = 'INSERT' THEN 'Initial creation'
        ELSE 'Auto-logged via trigger'
      END
    ),
    auth.uid()
  );
  RETURN NEW;
END;
$$;


--
-- Name: match_blackboard_context(extensions.vector, uuid, uuid, text[], double precision, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.match_blackboard_context(query_embedding extensions.vector, match_session_id uuid DEFAULT NULL::uuid, match_brand_id uuid DEFAULT NULL::uuid, match_node_types text[] DEFAULT NULL::text[], match_threshold double precision DEFAULT 0.65, match_count integer DEFAULT 8) RETURNS TABLE(id uuid, content_type text, content_text text, node_name text, session_id uuid, brand_template_id uuid, similarity double precision, priority_score double precision, metadata jsonb, created_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
$$;


--
-- Name: match_cached_ai_results(extensions.vector, text, uuid, uuid, double precision, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.match_cached_ai_results(query_embedding extensions.vector, match_function_name text, match_organization_id uuid DEFAULT NULL::uuid, match_brand_template_id uuid DEFAULT NULL::uuid, match_threshold double precision DEFAULT 0.92, match_count integer DEFAULT 3) RETURNS TABLE(id uuid, cache_key text, response_data jsonb, similarity double precision, hit_count integer, created_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
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


--
-- Name: merge_duplicate_nodes(uuid, uuid[], uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.merge_duplicate_nodes(p_keep_node_id uuid, p_remove_node_ids uuid[], p_performed_by uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions'
    AS $$
DECLARE
  v_edges_transferred INT := 0;
  v_nodes_deactivated INT := 0;
  v_remove_id UUID;
  v_keep_node_name TEXT;
BEGIN
  SELECT COALESCE(display_name->>'vi', display_name->>'en')
  INTO v_keep_node_name
  FROM public.industry_knowledge_nodes
  WHERE id = p_keep_node_id;
  
  FOREACH v_remove_id IN ARRAY p_remove_node_ids
  LOOP
    -- Transfer outgoing edges
    UPDATE public.industry_knowledge_edges
    SET source_node_id = p_keep_node_id
    WHERE source_node_id = v_remove_id
      AND target_node_id != p_keep_node_id
      AND NOT EXISTS (
        SELECT 1 FROM public.industry_knowledge_edges e2
        WHERE e2.source_node_id = p_keep_node_id
          AND e2.target_node_id = industry_knowledge_edges.target_node_id
          AND e2.edge_type = industry_knowledge_edges.edge_type
      );
    v_edges_transferred := v_edges_transferred + (CASE WHEN FOUND THEN 1 ELSE 0 END);
    
    -- Transfer incoming edges
    UPDATE public.industry_knowledge_edges
    SET target_node_id = p_keep_node_id
    WHERE target_node_id = v_remove_id
      AND source_node_id != p_keep_node_id
      AND NOT EXISTS (
        SELECT 1 FROM public.industry_knowledge_edges e2
        WHERE e2.target_node_id = p_keep_node_id
          AND e2.source_node_id = industry_knowledge_edges.source_node_id
          AND e2.edge_type = industry_knowledge_edges.edge_type
      );
    v_edges_transferred := v_edges_transferred + (CASE WHEN FOUND THEN 1 ELSE 0 END);
    
    -- Delete remaining duplicate edges
    DELETE FROM public.industry_knowledge_edges
    WHERE source_node_id = v_remove_id OR target_node_id = v_remove_id;
    
    -- Soft delete the duplicate node
    UPDATE public.industry_knowledge_nodes
    SET is_active = false,
        updated_at = now(),
        properties = COALESCE(properties, '{}'::JSONB) || jsonb_build_object(
          'merged_into', p_keep_node_id,
          'merged_at', now(),
          'merged_by', p_performed_by
        )
    WHERE id = v_remove_id;
    
    v_nodes_deactivated := v_nodes_deactivated + 1;
  END LOOP;
  
  -- Log the merge action (respect CHECK constraints)
  INSERT INTO public.regulation_propagation_log (
    source_node_id,
    change_type,
    change_summary,
    propagation_status,
    priority,
    reviewed_by,
    reviewed_at,
    review_status,
    propagated_at
  ) VALUES (
    p_keep_node_id,
    'updated',
    'Merged ' || v_nodes_deactivated || ' duplicate nodes into ' || COALESCE(v_keep_node_name, p_keep_node_id::text),
    'applied',
    'low',
    p_performed_by,
    CASE WHEN p_performed_by IS NULL THEN NULL ELSE now() END,
    CASE WHEN p_performed_by IS NULL THEN 'pending' ELSE 'approved' END,
    now()
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'keep_node_id', p_keep_node_id,
    'keep_node_name', v_keep_node_name,
    'nodes_deactivated', v_nodes_deactivated,
    'edges_transferred', v_edges_transferred
  );
END;
$$;


--
-- Name: normalize_vn_text(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.normalize_vn_text(input_text text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    SET search_path TO 'public'
    AS $$
BEGIN
  IF input_text IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN lower(trim(regexp_replace(
    regexp_replace(input_text, '^(Luật|Thông tư|Nghị định|Quyết định|Công văn|Hướng dẫn)\s+', '', 'i'),
    '\s+', ' ', 'g'
  )));
END;
$$;


--
-- Name: notify_industry_upgrade(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_industry_upgrade() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  industry_name TEXT;
BEGIN
  -- Only trigger when version changes and pack is active/stable
  IF OLD.version IS DISTINCT FROM NEW.version AND NEW.is_active = true THEN
    -- Get industry name from translations
    SELECT name INTO industry_name
    FROM industry_template_translations 
    WHERE industry_template_id = NEW.id 
      AND language_code = 'vi' 
    LIMIT 1;
    
    -- Fallback to code if no translation
    IF industry_name IS NULL THEN
      industry_name := NEW.code;
    END IF;
    
    -- Insert notifications for all users whose brands use this industry pack
    INSERT INTO notifications (user_id, organization_id, type, title, message, data)
    SELECT DISTINCT 
      om.user_id,
      om.organization_id,
      'industry_upgrade',
      'Industry Pack đã được nâng cấp',
      'Industry "' || industry_name || '" đã được cập nhật từ v' || COALESCE(OLD.version, '1.0') || ' lên v' || NEW.version,
      jsonb_build_object(
        'industry_template_id', NEW.id,
        'industry_name', industry_name,
        'from_version', COALESCE(OLD.version, '1.0'),
        'to_version', NEW.version,
        'upgrade_url', '/brands'
      )
    FROM brand_templates bt
    JOIN organization_members om ON bt.organization_id = om.organization_id
    WHERE bt.industry_template_id = NEW.id
      AND bt.organization_id IS NOT NULL;
      
    RAISE NOTICE 'Industry upgrade notifications created for % (v% -> v%)', industry_name, OLD.version, NEW.version;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: on_industry_template_update(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.on_industry_template_update() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  new_version text;
  has_compliance_change boolean;
BEGIN
  -- Check if compliance-related fields changed
  has_compliance_change := (
    OLD.compliance_rules IS DISTINCT FROM NEW.compliance_rules OR
    OLD.claim_restrictions IS DISTINCT FROM NEW.claim_restrictions OR
    OLD.forbidden_terms IS DISTINCT FROM NEW.forbidden_terms OR
    OLD.brand_voice IS DISTINCT FROM NEW.brand_voice
  );
  
  -- Only create version if compliance fields changed
  IF has_compliance_change THEN
    -- Increment version
    new_version := increment_industry_version(COALESCE(OLD.version, '1.0'));
    NEW.version := new_version;
    
    -- Create version snapshot in industry_memory_versions
    INSERT INTO public.industry_memory_versions (
      industry_template_id,
      version,
      compliance_rules,
      claim_restrictions,
      forbidden_terms,
      brand_voice,
      changed_by,
      change_notes
    ) VALUES (
      NEW.id,
      new_version,
      NEW.compliance_rules,
      NEW.claim_restrictions,
      NEW.forbidden_terms,
      NEW.brand_voice,
      NEW.updated_by,
      'Auto-created on template update'
    );
    
    RAISE NOTICE 'Industry Memory version created: % -> %', COALESCE(OLD.version, '1.0'), new_version;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: prevent_byob_collision_with_default_bot(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.prevent_byob_collision_with_default_bot() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.organization_id IS NOT NULL AND COALESCE(NEW.is_default, false) = false THEN
    IF EXISTS (
      SELECT 1 FROM public.telegram_bot_configs
      WHERE organization_id IS NULL
        AND is_default = true
        AND bot_username = NEW.bot_username
        AND id <> NEW.id
    ) THEN
      RAISE EXCEPTION 'BYOB bot username "%" trùng với default bot của Flowa. Mỗi BYOB phải dùng bot riêng (tạo bot mới qua @BotFather với username khác).', NEW.bot_username;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: record_industry_pack_use(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_industry_pack_use(_org_id uuid, _pack_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _is_member BOOLEAN;
BEGIN
  -- Verify caller is member of org
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = _org_id AND user_id = auth.uid()
  ) INTO _is_member;

  IF NOT _is_member THEN
    RAISE EXCEPTION 'Not a member of this organization';
  END IF;

  UPDATE public.organizations
  SET last_used_industry_pack_ids = (
    ARRAY[_pack_id] || array_remove(
      COALESCE(last_used_industry_pack_ids, '{}'::uuid[]),
      _pack_id
    )
  )[1:5]
  WHERE id = _org_id;
END;
$$;


--
-- Name: recover_stuck_generation_tasks(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.recover_stuck_generation_tasks() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.generation_tasks
  SET status = 'failed',
      error_message = COALESCE(error_message, 'Auto-recovered: stale background task (>10min no update)'),
      completed_at = NOW(),
      updated_at = NOW()
  WHERE status IN ('pending', 'generating')
    AND updated_at < NOW() - INTERVAL '10 minutes';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;


--
-- Name: refresh_cluster_status(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.refresh_cluster_status(_cluster_id uuid) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _kw_total int;
  _kw_covered int;
  _has_pillar boolean;
  _new_status text;
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE assigned_landing_page_id IS NOT NULL)
  INTO _kw_total, _kw_covered
  FROM public.seo_keywords
  WHERE cluster_id = _cluster_id;

  SELECT (pillar_content_id IS NOT NULL) INTO _has_pillar
  FROM public.seo_clusters WHERE id = _cluster_id;

  IF _kw_total = 0 THEN
    _new_status := 'planning';
  ELSIF _has_pillar AND (_kw_covered::numeric / NULLIF(_kw_total, 0)::numeric) >= 0.8 THEN
    _new_status := 'completed';
  ELSIF _kw_covered > 0 THEN
    _new_status := 'active';
  ELSE
    _new_status := 'planning';
  END IF;

  UPDATE public.seo_clusters
  SET status = _new_status, updated_at = now()
  WHERE id = _cluster_id AND status <> 'archived';

  RETURN _new_status;
END;
$$;


--
-- Name: refresh_compliance_rules_mv(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.refresh_compliance_rules_mv() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_resolved_compliance_rules;
END;
$$;


--
-- Name: release_pipeline_claim(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.release_pipeline_claim(p_pipeline_id uuid, p_token text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE public.agent_pipelines
     SET stage_claim_token = NULL, stage_claim_at = NULL
   WHERE id = p_pipeline_id AND stage_claim_token = p_token;
END;
$$;


--
-- Name: search_brand_memory(extensions.vector, uuid, text[], double precision, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.search_brand_memory(query_embedding extensions.vector, match_brand_template_id uuid, match_types text[] DEFAULT NULL::text[], match_threshold double precision DEFAULT 0.6, match_count integer DEFAULT 5) RETURNS TABLE(id uuid, memory_type text, content text, confidence double precision, source text, similarity double precision, used_count integer)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bm.id,
    bm.memory_type,
    bm.content,
    bm.confidence::FLOAT,
    bm.source,
    (1 - (bm.embedding <=> query_embedding))::FLOAT AS similarity,
    bm.used_count
  FROM public.brand_memory bm
  WHERE bm.brand_template_id = match_brand_template_id
    AND bm.embedding IS NOT NULL
    AND (match_types IS NULL OR bm.memory_type = ANY(match_types))
    AND (1 - (bm.embedding <=> query_embedding)) > match_threshold
  ORDER BY bm.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;


--
-- Name: search_conversation_embeddings(extensions.vector, uuid, uuid, uuid, text[], uuid, double precision, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.search_conversation_embeddings(query_embedding extensions.vector, match_user_id uuid, match_organization_id uuid DEFAULT NULL::uuid, match_brand_template_id uuid DEFAULT NULL::uuid, match_types text[] DEFAULT NULL::text[], exclude_conversation_id uuid DEFAULT NULL::uuid, match_threshold double precision DEFAULT 0.7, match_count integer DEFAULT 5) RETURNS TABLE(id uuid, conversation_id uuid, message_id uuid, embedding_type text, content_text text, similarity double precision, metadata jsonb, created_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ce.id,
    ce.conversation_id,
    ce.message_id,
    ce.embedding_type,
    ce.content_text,
    1 - (ce.embedding <=> query_embedding) AS similarity,
    ce.metadata,
    ce.created_at
  FROM conversation_embeddings ce
  WHERE 
    ce.user_id = match_user_id
    AND (match_organization_id IS NULL OR ce.organization_id = match_organization_id)
    AND (match_brand_template_id IS NULL OR ce.brand_template_id = match_brand_template_id)
    AND (match_types IS NULL OR ce.embedding_type = ANY(match_types))
    AND (exclude_conversation_id IS NULL OR ce.conversation_id != exclude_conversation_id)
    AND ce.embedding IS NOT NULL
    AND 1 - (ce.embedding <=> query_embedding) > match_threshold
  ORDER BY ce.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;


--
-- Name: search_embeddings(extensions.vector, uuid, uuid, text[], double precision, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.search_embeddings(query_embedding extensions.vector, match_organization_id uuid, match_brand_template_id uuid DEFAULT NULL::uuid, match_content_types text[] DEFAULT NULL::text[], match_threshold double precision DEFAULT 0.7, match_count integer DEFAULT 5) RETURNS TABLE(id uuid, content_type text, content_id uuid, content_text text, similarity double precision, metadata jsonb)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ce.id,
    ce.content_type,
    ce.content_id,
    ce.content_text,
    (1 - (ce.embedding <=> query_embedding))::FLOAT as similarity,
    ce.metadata
  FROM public.content_embeddings ce
  WHERE ce.organization_id = match_organization_id
    AND (match_brand_template_id IS NULL OR ce.brand_template_id = match_brand_template_id)
    AND (match_content_types IS NULL OR ce.content_type = ANY(match_content_types))
    AND (1 - (ce.embedding <=> query_embedding)) > match_threshold
  ORDER BY ce.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;


--
-- Name: search_help_articles(extensions.vector, text, text, double precision, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.search_help_articles(query_embedding extensions.vector, match_route text DEFAULT NULL::text, match_category text DEFAULT NULL::text, match_threshold double precision DEFAULT 0.5, match_count integer DEFAULT 5) RETURNS TABLE(id uuid, title text, content text, category text, keywords text[], similarity double precision)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions'
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


--
-- Name: search_knowledge_nodes(extensions.vector, text[], uuid, double precision, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.search_knowledge_nodes(p_query_embedding extensions.vector, p_node_types text[] DEFAULT NULL::text[], p_global_pack_id uuid DEFAULT NULL::uuid, p_threshold double precision DEFAULT 0.3, p_limit integer DEFAULT 10) RETURNS TABLE(id uuid, node_type text, node_key text, display_name jsonb, description jsonb, properties jsonb, global_pack_id uuid, similarity double precision)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    n.id,
    n.node_type,
    n.node_key,
    n.display_name,
    n.description,
    n.properties,
    n.global_pack_id,
    1 - (n.embedding <=> p_query_embedding) AS similarity
  FROM industry_knowledge_nodes n
  WHERE 
    n.is_active = true
    AND n.embedding IS NOT NULL
    AND (p_node_types IS NULL OR n.node_type = ANY(p_node_types))
    AND (p_global_pack_id IS NULL OR n.global_pack_id = p_global_pack_id)
    AND 1 - (n.embedding <=> p_query_embedding) >= p_threshold
  ORDER BY n.embedding <=> p_query_embedding
  LIMIT p_limit;
END;
$$;


--
-- Name: tg_recompute_cluster_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tg_recompute_cluster_stats() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  affected_cluster UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    affected_cluster := OLD.cluster_id;
  ELSE
    affected_cluster := NEW.cluster_id;
    -- Cập nhật cluster cũ nếu đã thay đổi
    IF TG_OP = 'UPDATE' AND OLD.cluster_id IS DISTINCT FROM NEW.cluster_id AND OLD.cluster_id IS NOT NULL THEN
      UPDATE public.keyword_clusters
      SET keyword_count = (SELECT COUNT(*) FROM public.seo_keywords WHERE cluster_id = OLD.cluster_id),
          avg_priority = COALESCE((SELECT AVG(priority_score) FROM public.seo_keywords WHERE cluster_id = OLD.cluster_id), 0),
          updated_at = now()
      WHERE id = OLD.cluster_id;
    END IF;
  END IF;

  IF affected_cluster IS NOT NULL THEN
    UPDATE public.keyword_clusters
    SET keyword_count = (SELECT COUNT(*) FROM public.seo_keywords WHERE cluster_id = affected_cluster),
        avg_priority = COALESCE((SELECT AVG(priority_score) FROM public.seo_keywords WHERE cluster_id = affected_cluster), 0),
        updated_at = now()
    WHERE id = affected_cluster;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: tg_seo_keywords_before_write(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tg_seo_keywords_before_write() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.priority_score := public.calc_keyword_priority(NEW.search_volume, NEW.difficulty, NEW.intent);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;


--
-- Name: traverse_knowledge_graph(uuid, text[], integer, double precision); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.traverse_knowledge_graph(p_start_node_id uuid, p_edge_types text[] DEFAULT NULL::text[], p_max_depth integer DEFAULT 3, p_min_weight double precision DEFAULT 0.0) RETURNS TABLE(node_id uuid, node_type text, node_key text, display_name jsonb, depth integer, path_weight double precision, path text[])
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE graph_traversal AS (
    SELECT n.id, n.node_type, n.node_key, n.display_name, 0 AS depth, 1.0::FLOAT AS path_weight, ARRAY[n.node_key] AS path
    FROM public.industry_knowledge_nodes n
    WHERE n.id = p_start_node_id AND n.is_active = true
    UNION
    SELECT n.id, n.node_type, n.node_key, n.display_name, gt.depth + 1, (gt.path_weight * e.weight)::FLOAT, gt.path || n.node_key
    FROM graph_traversal gt
    JOIN public.industry_knowledge_edges e ON e.source_node_id = gt.id
    JOIN public.industry_knowledge_nodes n ON n.id = e.target_node_id
    WHERE gt.depth < p_max_depth AND n.is_active = true AND e.weight >= p_min_weight
      AND NOT (n.node_key = ANY(gt.path))
      AND (p_edge_types IS NULL OR e.edge_type = ANY(p_edge_types))
  )
  SELECT DISTINCT ON (gt.id) gt.id, gt.node_type, gt.node_key, gt.display_name, gt.depth, gt.path_weight, gt.path
  FROM graph_traversal gt WHERE gt.depth > 0
  ORDER BY gt.id, gt.path_weight DESC;
END;
$$;


--
-- Name: trigger_set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_conversation_on_message(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_conversation_on_message() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE public.chat_conversations
  SET 
    message_count = message_count + 1,
    last_message_at = NEW.created_at,
    updated_at = now(),
    title = CASE 
      WHEN title IS NULL AND NEW.role = 'user' 
      THEN LEFT(NEW.content, 100)
      ELSE title
    END
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;


--
-- Name: update_image_access_time(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_image_access_time() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.is_selected = true AND (OLD.is_selected = false OR OLD.is_selected IS NULL) THEN
    NEW.last_accessed_at := now();
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: update_industry_v2_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_industry_v2_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: update_pipeline_content_id(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_pipeline_content_id(p_pipeline_id uuid, p_content_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE public.agent_pipelines
  SET content_id = p_content_id,
      updated_at = NOW()
  WHERE id = p_pipeline_id;
END;
$$;


--
-- Name: update_regulation_sources_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_regulation_sources_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_variant_content_count(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_variant_content_count() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Handle INSERT
  IF TG_OP = 'INSERT' AND NEW.brand_voice_variant_id IS NOT NULL THEN
    UPDATE public.brand_voice_variants 
    SET content_count = content_count + 1, updated_at = now()
    WHERE id = NEW.brand_voice_variant_id;
  END IF;
  
  -- Handle UPDATE (variant changed)
  IF TG_OP = 'UPDATE' THEN
    -- Decrement old variant count
    IF OLD.brand_voice_variant_id IS NOT NULL AND 
       (NEW.brand_voice_variant_id IS NULL OR OLD.brand_voice_variant_id <> NEW.brand_voice_variant_id) THEN
      UPDATE public.brand_voice_variants 
      SET content_count = GREATEST(0, content_count - 1), updated_at = now()
      WHERE id = OLD.brand_voice_variant_id;
    END IF;
    
    -- Increment new variant count
    IF NEW.brand_voice_variant_id IS NOT NULL AND 
       (OLD.brand_voice_variant_id IS NULL OR OLD.brand_voice_variant_id <> NEW.brand_voice_variant_id) THEN
      UPDATE public.brand_voice_variants 
      SET content_count = content_count + 1, updated_at = now()
      WHERE id = NEW.brand_voice_variant_id;
    END IF;
  END IF;
  
  -- Handle DELETE
  IF TG_OP = 'DELETE' AND OLD.brand_voice_variant_id IS NOT NULL THEN
    UPDATE public.brand_voice_variants 
    SET content_count = GREATEST(0, content_count - 1), updated_at = now()
    WHERE id = OLD.brand_voice_variant_id;
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: validate_agent_goal_parent(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_agent_goal_parent() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  parent_org uuid;
BEGIN
  IF NEW.parent_goal_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.parent_goal_id = NEW.id THEN
    RAISE EXCEPTION 'Campaign không thể là cha của chính nó';
  END IF;
  SELECT organization_id INTO parent_org FROM public.agent_goals WHERE id = NEW.parent_goal_id;
  IF parent_org IS NULL OR parent_org <> NEW.organization_id THEN
    RAISE EXCEPTION 'Campaign cha phải cùng workspace';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: validate_primary_channels(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_primary_channels() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF array_length(NEW.primary_channels, 1) > 3 THEN
    RAISE EXCEPTION 'primary_channels cannot exceed 3 items';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: validate_relevance_score(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_relevance_score() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.relevance_score < 0 OR NEW.relevance_score > 100 THEN
    RAISE EXCEPTION 'relevance_score must be between 0 and 100';
  END IF;
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ad_copies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ad_copies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    topic text NOT NULL,
    platform public.ad_platform DEFAULT 'meta_feed'::public.ad_platform NOT NULL,
    objective public.ad_objective DEFAULT 'traffic'::public.ad_objective NOT NULL,
    landing_url text,
    brand_template_id uuid,
    organization_id uuid,
    user_id uuid,
    status text DEFAULT 'draft'::text,
    audience_brief text,
    product_id uuid,
    persona_id uuid,
    funnel_stage public.ad_funnel_stage DEFAULT 'awareness'::public.ad_funnel_stage,
    industry_template_id uuid,
    industry_template_version text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    campaign_id uuid,
    saved_audience_id uuid,
    sequence_stage_id uuid,
    CONSTRAINT ad_copies_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'review'::text, 'approved'::text, 'published'::text])))
);


--
-- Name: ad_copy_ab_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ad_copy_ab_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ab_test_id uuid NOT NULL,
    variation_id uuid NOT NULL,
    impressions integer DEFAULT 0,
    clicks integer DEFAULT 0,
    conversions integer DEFAULT 0,
    spend numeric(12,2) DEFAULT 0,
    ctr numeric(8,4) GENERATED ALWAYS AS (
CASE
    WHEN (impressions > 0) THEN (((clicks)::numeric / (impressions)::numeric) * (100)::numeric)
    ELSE (0)::numeric
END) STORED,
    conversion_rate numeric(8,4) GENERATED ALWAYS AS (
CASE
    WHEN (clicks > 0) THEN (((conversions)::numeric / (clicks)::numeric) * (100)::numeric)
    ELSE (0)::numeric
END) STORED,
    cpc numeric(10,2) GENERATED ALWAYS AS (
CASE
    WHEN (clicks > 0) THEN (spend / (clicks)::numeric)
    ELSE (0)::numeric
END) STORED,
    logged_at date DEFAULT CURRENT_DATE NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: ad_copy_ab_tests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ad_copy_ab_tests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    ad_copy_id uuid NOT NULL,
    name text NOT NULL,
    hypothesis text,
    test_variable text DEFAULT 'full_copy'::text NOT NULL,
    variation_ids uuid[] NOT NULL,
    winner_variation_id uuid,
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    status text DEFAULT 'draft'::text,
    metrics_to_track text[] DEFAULT '{ctr,conversions}'::text[],
    confidence_threshold numeric DEFAULT 95,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: ad_copy_ai_insights; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ad_copy_ai_insights (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    ad_copy_id uuid,
    insight_type text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    severity text DEFAULT 'info'::text,
    metrics_context jsonb DEFAULT '{}'::jsonb,
    suggested_action text,
    action_impact_estimate numeric(5,2),
    valid_from timestamp with time zone DEFAULT now(),
    valid_until timestamp with time zone,
    is_dismissed boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: ad_copy_analytics_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ad_copy_analytics_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    snapshot_date date NOT NULL,
    total_ad_copies integer DEFAULT 0,
    active_ad_copies integer DEFAULT 0,
    total_impressions bigint DEFAULT 0,
    total_clicks bigint DEFAULT 0,
    total_conversions integer DEFAULT 0,
    total_spend numeric(15,2) DEFAULT 0,
    total_revenue numeric(15,2) DEFAULT 0,
    avg_ctr numeric(5,4) DEFAULT 0,
    avg_cpc numeric(12,2) DEFAULT 0,
    avg_cpm numeric(12,2) DEFAULT 0,
    avg_conversion_rate numeric(5,4) DEFAULT 0,
    overall_roas numeric(6,2) DEFAULT 0,
    platform_breakdown jsonb DEFAULT '{}'::jsonb,
    objective_breakdown jsonb DEFAULT '{}'::jsonb,
    top_performers jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: ad_copy_benchmarks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ad_copy_benchmarks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    platform text NOT NULL,
    industry text,
    objective text,
    avg_ctr numeric(8,4),
    avg_cpc numeric(12,2),
    avg_cpm numeric(12,2),
    avg_conversion_rate numeric(8,4),
    avg_roas numeric(10,2),
    sample_count integer DEFAULT 0,
    period_start date,
    period_end date,
    data_source text DEFAULT 'internal'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: ad_copy_creative_scores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ad_copy_creative_scores (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    variation_id uuid NOT NULL,
    overall_score integer,
    grade text,
    headline_score integer,
    primary_text_score integer,
    cta_score integer,
    emotional_appeal_score integer,
    clarity_score integer,
    urgency_score integer,
    relevance_score integer,
    score_breakdown jsonb,
    strengths text[],
    weaknesses text[],
    optimization_priority text,
    model_version text DEFAULT 'v1'::text,
    scored_at timestamp with time zone DEFAULT now(),
    organization_id uuid,
    CONSTRAINT ad_copy_creative_scores_clarity_score_check CHECK (((clarity_score >= 0) AND (clarity_score <= 100))),
    CONSTRAINT ad_copy_creative_scores_cta_score_check CHECK (((cta_score >= 0) AND (cta_score <= 100))),
    CONSTRAINT ad_copy_creative_scores_emotional_appeal_score_check CHECK (((emotional_appeal_score >= 0) AND (emotional_appeal_score <= 100))),
    CONSTRAINT ad_copy_creative_scores_grade_check CHECK ((grade = ANY (ARRAY['A+'::text, 'A'::text, 'B'::text, 'C'::text, 'D'::text, 'F'::text]))),
    CONSTRAINT ad_copy_creative_scores_headline_score_check CHECK (((headline_score >= 0) AND (headline_score <= 100))),
    CONSTRAINT ad_copy_creative_scores_overall_score_check CHECK (((overall_score >= 0) AND (overall_score <= 100))),
    CONSTRAINT ad_copy_creative_scores_primary_text_score_check CHECK (((primary_text_score >= 0) AND (primary_text_score <= 100))),
    CONSTRAINT ad_copy_creative_scores_relevance_score_check CHECK (((relevance_score >= 0) AND (relevance_score <= 100))),
    CONSTRAINT ad_copy_creative_scores_urgency_score_check CHECK (((urgency_score >= 0) AND (urgency_score <= 100)))
);


--
-- Name: ad_copy_optimization_suggestions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ad_copy_optimization_suggestions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    variation_id uuid NOT NULL,
    field text NOT NULL,
    original_text text,
    suggested_text text NOT NULL,
    predicted_improvement numeric,
    improvement_metric text,
    confidence text,
    reason text NOT NULL,
    technique text,
    status text DEFAULT 'pending'::text,
    applied_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    organization_id uuid,
    CONSTRAINT ad_copy_optimization_suggestions_confidence_check CHECK ((confidence = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text]))),
    CONSTRAINT ad_copy_optimization_suggestions_field_check CHECK ((field = ANY (ARRAY['headline'::text, 'primary_text'::text, 'description'::text, 'cta'::text]))),
    CONSTRAINT ad_copy_optimization_suggestions_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'applied'::text, 'dismissed'::text, 'tested'::text])))
);


--
-- Name: ad_copy_performance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ad_copy_performance (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ad_copy_id uuid NOT NULL,
    variation_id uuid,
    logged_at date NOT NULL,
    impressions integer DEFAULT 0,
    reach integer DEFAULT 0,
    clicks integer DEFAULT 0,
    likes integer DEFAULT 0,
    comments integer DEFAULT 0,
    shares integer DEFAULT 0,
    saves integer DEFAULT 0,
    leads integer DEFAULT 0,
    conversions integer DEFAULT 0,
    conversion_value numeric(12,2) DEFAULT 0,
    spend numeric(12,2) DEFAULT 0,
    ctr numeric(8,4) DEFAULT 0,
    cpc numeric(10,2) DEFAULT 0,
    cpm numeric(10,2) DEFAULT 0,
    conversion_rate numeric(8,4) DEFAULT 0,
    roas numeric(10,2) DEFAULT 0,
    engagement_rate numeric(8,4) DEFAULT 0,
    data_source text DEFAULT 'manual'::text,
    external_ad_id text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    sync_config_id uuid,
    synced_at timestamp with time zone,
    raw_api_response jsonb,
    organization_id uuid
);


--
-- Name: ad_copy_prediction_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ad_copy_prediction_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    variation_id uuid NOT NULL,
    predicted_ctr numeric,
    predicted_cpc numeric,
    predicted_cpm numeric,
    predicted_conversion_rate numeric,
    predicted_roas numeric,
    confidence_score integer,
    actual_ctr numeric,
    actual_cpc numeric,
    actual_cpm numeric,
    actual_conversion_rate numeric,
    actual_roas numeric,
    accuracy_score numeric,
    prediction_factors jsonb,
    predicted_at timestamp with time zone DEFAULT now(),
    validated_at timestamp with time zone,
    organization_id uuid,
    CONSTRAINT ad_copy_prediction_history_confidence_score_check CHECK (((confidence_score >= 0) AND (confidence_score <= 100)))
);


--
-- Name: ad_copy_variations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ad_copy_variations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ad_copy_id uuid NOT NULL,
    variation_label text DEFAULT 'A'::text NOT NULL,
    primary_text text,
    headline text,
    description text,
    cta_button text DEFAULT 'learn_more'::text,
    headlines jsonb DEFAULT '[]'::jsonb,
    descriptions jsonb DEFAULT '[]'::jsonb,
    char_counts jsonb DEFAULT '{}'::jsonb,
    policy_warnings jsonb DEFAULT '[]'::jsonb,
    is_approved boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: ad_sequence_stage_copies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ad_sequence_stage_copies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    stage_id uuid NOT NULL,
    ad_copy_id uuid NOT NULL,
    sort_order integer DEFAULT 0,
    is_primary boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: ad_sequence_stages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ad_sequence_stages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sequence_id uuid NOT NULL,
    stage_name text NOT NULL,
    stage_order integer NOT NULL,
    stage_label text,
    delay_days integer DEFAULT 0,
    duration_days integer DEFAULT 7,
    budget_percentage integer DEFAULT 25,
    audience_adjustments jsonb,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: ad_sequences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ad_sequences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    brand_template_id uuid,
    campaign_id uuid,
    name text NOT NULL,
    description text,
    sequence_type text NOT NULL,
    status text DEFAULT 'draft'::text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT ad_sequences_sequence_type_check CHECK ((sequence_type = ANY (ARRAY['funnel'::text, 'retargeting'::text, 'launch'::text, 'seasonal'::text]))),
    CONSTRAINT ad_sequences_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'paused'::text, 'completed'::text])))
);


--
-- Name: ad_swipe_files; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ad_swipe_files (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    source_type text NOT NULL,
    source_url text,
    competitor_name text,
    platform text NOT NULL,
    industry text,
    objective text,
    screenshot_url text,
    video_url text,
    primary_text text,
    headline text,
    description text,
    cta_button text,
    performance_tier text,
    tags text[] DEFAULT '{}'::text[],
    notes text,
    is_favorite boolean DEFAULT false,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT ad_swipe_files_performance_tier_check CHECK ((performance_tier = ANY (ARRAY['A'::text, 'B'::text, 'C'::text]))),
    CONSTRAINT ad_swipe_files_source_type_check CHECK ((source_type = ANY (ARRAY['manual'::text, 'competitor'::text, 'internal'::text, 'meta_library'::text])))
);


--
-- Name: ad_sync_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ad_sync_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ad_copy_id uuid NOT NULL,
    organization_id uuid,
    connection_id uuid,
    external_ad_id text NOT NULL,
    external_campaign_id text,
    external_adset_id text,
    external_ad_name text,
    sync_enabled boolean DEFAULT true,
    sync_frequency text DEFAULT 'daily'::text,
    last_synced_at timestamp with time zone,
    next_sync_at timestamp with time zone,
    sync_status text DEFAULT 'pending'::text,
    last_error text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT ad_sync_configs_sync_frequency_check CHECK ((sync_frequency = ANY (ARRAY['hourly'::text, 'daily'::text, 'manual'::text]))),
    CONSTRAINT ad_sync_configs_sync_status_check CHECK ((sync_status = ANY (ARRAY['pending'::text, 'syncing'::text, 'success'::text, 'error'::text])))
);


--
-- Name: addon_purchases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.addon_purchases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    plan_type public.plan_type NOT NULL,
    billing_cycle text DEFAULT 'monthly'::text NOT NULL,
    amount integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    purchased_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    payment_order_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: admin_audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_id uuid NOT NULL,
    action text NOT NULL,
    target_user_id uuid,
    details jsonb DEFAULT '{}'::jsonb,
    ip_address text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: agent_approvals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_approvals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pipeline_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    content_preview text,
    channel_versions jsonb DEFAULT '{}'::jsonb,
    scores jsonb DEFAULT '{}'::jsonb,
    status public.agent_approval_status DEFAULT 'pending'::public.agent_approval_status NOT NULL,
    reviewer_id uuid,
    reviewer_notes text,
    decided_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval)
);


--
-- Name: agent_blackboard; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_blackboard (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    agent_name text NOT NULL,
    data_key text NOT NULL,
    data_value jsonb NOT NULL,
    ttl_seconds integer DEFAULT 3600,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: agent_execution_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_execution_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    agent_name text NOT NULL,
    status text DEFAULT 'started'::text NOT NULL,
    input_summary text,
    output_summary text,
    tools_used text[],
    duration_ms integer,
    token_usage jsonb,
    error_message text,
    retry_count integer DEFAULT 0,
    model_used text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: agent_goals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_goals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    target_topics text[] DEFAULT '{}'::text[],
    target_channels text[] DEFAULT '{}'::text[],
    frequency jsonb DEFAULT '{}'::jsonb,
    autonomy_level public.agent_autonomy_level DEFAULT 'human_in_loop'::public.agent_autonomy_level NOT NULL,
    brand_template_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    is_paused boolean DEFAULT false NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    campaign_id uuid,
    clarification_context jsonb,
    campaign_duration_days integer,
    campaign_start_date date,
    campaign_end_date date,
    approval_mode text DEFAULT 'approve_plan'::text,
    period_type text DEFAULT 'custom'::text NOT NULL,
    period_label text,
    parent_goal_id uuid,
    content_mix jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT agent_goals_period_type_check CHECK ((period_type = ANY (ARRAY['month'::text, 'quarter'::text, 'year'::text, 'custom'::text])))
);


--
-- Name: COLUMN agent_goals.content_mix; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agent_goals.content_mix IS 'Per-channel content type breakdown: { facebook: { post: 4, carousel: 2, video: 0 } }';


--
-- Name: agent_pipeline_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_pipeline_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pipeline_id uuid,
    agent_name text NOT NULL,
    action text NOT NULL,
    input_summary text,
    output_summary text,
    tokens_used integer DEFAULT 0,
    cost_usd numeric(10,6) DEFAULT 0,
    duration_ms integer DEFAULT 0,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: agent_pipelines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_pipelines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    goal_id uuid,
    content_title text NOT NULL,
    content_topic text,
    pipeline_state jsonb DEFAULT '{}'::jsonb,
    priority public.agent_priority DEFAULT 'normal'::public.agent_priority NOT NULL,
    autonomy_level public.agent_autonomy_level DEFAULT 'human_in_loop'::public.agent_autonomy_level NOT NULL,
    is_flagged boolean DEFAULT false NOT NULL,
    flag_reason text,
    content_id uuid,
    estimated_completion timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    campaign_id uuid,
    stage_started_at timestamp with time zone,
    campaign_plan_id uuid,
    piece_number integer,
    scheduled_publish_at timestamp with time zone,
    content_type text DEFAULT 'multichannel'::text NOT NULL,
    quality_scores jsonb,
    overall_quality_score integer,
    current_stage public.agent_pipeline_stage DEFAULT 'strategy'::public.agent_pipeline_stage NOT NULL,
    stage_claim_token text,
    stage_claim_at timestamp with time zone,
    CONSTRAINT agent_pipelines_content_type_check CHECK ((content_type = ANY (ARRAY['multichannel'::text, 'video_script'::text, 'carousel'::text])))
);


--
-- Name: agent_team_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_team_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    user_id uuid NOT NULL,
    can_create_goals boolean DEFAULT false NOT NULL,
    can_approve boolean DEFAULT false NOT NULL,
    can_override boolean DEFAULT false NOT NULL,
    max_autonomy_level text DEFAULT 'human_in_loop'::text NOT NULL,
    monthly_pipeline_limit integer,
    is_active boolean DEFAULT true NOT NULL,
    granted_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT agent_team_permissions_max_autonomy_level_check CHECK ((max_autonomy_level = ANY (ARRAY['human_in_loop'::text, 'human_on_loop'::text, 'full_auto'::text])))
);


--
-- Name: ai_agent_model_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_agent_model_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    agent_name text NOT NULL,
    model_override text,
    temperature numeric DEFAULT 0.7,
    max_tokens integer,
    is_enabled boolean DEFAULT true,
    quality_mode text DEFAULT 'balanced'::text,
    fallback_model text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: ai_channel_model_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_channel_model_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    channel text NOT NULL,
    model_override text,
    temperature numeric(3,2) DEFAULT 0.7,
    max_tokens integer,
    is_enabled boolean DEFAULT true,
    priority integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    quality_mode_default text DEFAULT 'balanced'::text,
    prompt_style text DEFAULT 'default'::text,
    hook_intensity text DEFAULT 'medium'::text,
    cost_priority text DEFAULT 'balanced'::text,
    preferred_hook_types text[] DEFAULT '{}'::text[],
    allow_user_override boolean DEFAULT true,
    force_provider text
);


--
-- Name: COLUMN ai_channel_model_configs.quality_mode_default; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ai_channel_model_configs.quality_mode_default IS 'Default quality mode: fast, balanced, quality';


--
-- Name: COLUMN ai_channel_model_configs.prompt_style; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ai_channel_model_configs.prompt_style IS 'Prompt optimization style: default, concise, detailed, creative';


--
-- Name: COLUMN ai_channel_model_configs.hook_intensity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ai_channel_model_configs.hook_intensity IS 'Hook strength: soft, medium, strong, viral';


--
-- Name: COLUMN ai_channel_model_configs.cost_priority; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ai_channel_model_configs.cost_priority IS 'Cost optimization priority: economy, balanced, quality';


--
-- Name: COLUMN ai_channel_model_configs.preferred_hook_types; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ai_channel_model_configs.preferred_hook_types IS 'Preferred hook framework types for this channel';


--
-- Name: COLUMN ai_channel_model_configs.allow_user_override; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ai_channel_model_configs.allow_user_override IS 'Whether users can override this config at brand/content level';


--
-- Name: COLUMN ai_channel_model_configs.force_provider; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ai_channel_model_configs.force_provider IS 'Force routing to a specific provider (e.g. openrouter, lovable, openai) instead of auto-detecting from model name';


--
-- Name: ai_function_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_function_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    slug text NOT NULL,
    label text NOT NULL,
    icon text DEFAULT 'zap'::text,
    color text DEFAULT '#6b7280'::text,
    sort_order integer DEFAULT 0,
    is_system boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: ai_function_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_function_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    function_name text NOT NULL,
    provider_config_id uuid,
    model_override text,
    parameters jsonb DEFAULT '{}'::jsonb,
    is_enabled boolean DEFAULT true,
    cache_ttl_hours integer DEFAULT 24,
    priority_level text DEFAULT 'normal'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    temperature numeric(3,2) DEFAULT 0.7,
    max_tokens integer DEFAULT 4096,
    custom_system_prompt text,
    force_provider text,
    CONSTRAINT ai_function_configs_priority_level_check CHECK ((priority_level = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text])))
);


--
-- Name: COLUMN ai_function_configs.temperature; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ai_function_configs.temperature IS 'AI model temperature (0.0-1.0)';


--
-- Name: COLUMN ai_function_configs.max_tokens; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ai_function_configs.max_tokens IS 'Maximum tokens for AI response';


--
-- Name: COLUMN ai_function_configs.custom_system_prompt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ai_function_configs.custom_system_prompt IS 'Optional custom system prompt override';


--
-- Name: COLUMN ai_function_configs.force_provider; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ai_function_configs.force_provider IS 'Force routing to a specific provider (e.g. openrouter, lovable, openai) instead of auto-detecting from model name';


--
-- Name: ai_function_group_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_function_group_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    function_type text NOT NULL,
    model_override text,
    force_provider text,
    temperature numeric,
    is_enabled boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: ai_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    trace_id text NOT NULL,
    function_name text NOT NULL,
    organization_id uuid,
    user_id uuid,
    brand_template_id uuid,
    total_duration_ms integer NOT NULL,
    ai_call_duration_ms integer,
    context_fetch_duration_ms integer,
    input_tokens_estimated integer,
    output_tokens_estimated integer,
    context_sources text[] DEFAULT '{}'::text[],
    context_richness_score integer,
    total_turns integer,
    tools_executed text[],
    exit_reason text,
    had_error boolean DEFAULT false,
    error_type text,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    channels text[],
    quality_mode text,
    models_used jsonb,
    channel_durations jsonb,
    cache_hit boolean DEFAULT false,
    estimated_cost_usd numeric(10,6),
    used_fallback boolean DEFAULT false,
    fallback_model text,
    retry_count integer DEFAULT 0,
    content_id uuid,
    action_type text,
    prompt_id uuid,
    prompt_version integer,
    ab_test_id uuid,
    ab_test_variant text,
    span_id text,
    parent_span_id text,
    compliance_risk_level text,
    compliance_violations jsonb,
    compliance_action text,
    sampled_response text,
    CONSTRAINT ai_metrics_ab_test_variant_check CHECK ((ab_test_variant = ANY (ARRAY['a'::text, 'b'::text, NULL::text])))
);


--
-- Name: TABLE ai_metrics; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ai_metrics IS 'Stores performance metrics and observability data for AI function calls';


--
-- Name: COLUMN ai_metrics.channels; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ai_metrics.channels IS 'Array of channels generated (facebook, instagram, etc.)';


--
-- Name: COLUMN ai_metrics.quality_mode; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ai_metrics.quality_mode IS 'Quality mode used: fast, balanced, quality';


--
-- Name: COLUMN ai_metrics.models_used; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ai_metrics.models_used IS 'JSON mapping channel to model used';


--
-- Name: COLUMN ai_metrics.channel_durations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ai_metrics.channel_durations IS 'JSON mapping channel to generation duration in ms';


--
-- Name: COLUMN ai_metrics.estimated_cost_usd; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ai_metrics.estimated_cost_usd IS 'Estimated cost in USD based on token usage';


--
-- Name: COLUMN ai_metrics.used_fallback; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ai_metrics.used_fallback IS 'Whether circuit breaker triggered fallback model';


--
-- Name: COLUMN ai_metrics.action_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ai_metrics.action_type IS 'Action type: create, expand, regenerate, preview';


--
-- Name: ai_prompt_ab_tests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_prompt_ab_tests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    name text NOT NULL,
    description text,
    function_name text NOT NULL,
    prompt_key text NOT NULL,
    variant_a_id uuid,
    variant_b_id uuid,
    variant_a_weight integer DEFAULT 50,
    status text DEFAULT 'draft'::text,
    winner_variant text,
    variant_a_impressions integer DEFAULT 0,
    variant_a_avg_score numeric(5,2),
    variant_a_avg_time_ms integer,
    variant_b_impressions integer DEFAULT 0,
    variant_b_avg_score numeric(5,2),
    variant_b_avg_time_ms integer,
    confidence_level numeric(5,2),
    min_sample_size integer DEFAULT 100,
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    completed_at timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT ai_prompt_ab_tests_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'running'::text, 'paused'::text, 'completed'::text, 'cancelled'::text]))),
    CONSTRAINT ai_prompt_ab_tests_variant_a_weight_check CHECK (((variant_a_weight >= 0) AND (variant_a_weight <= 100))),
    CONSTRAINT ai_prompt_ab_tests_winner_variant_check CHECK ((winner_variant = ANY (ARRAY['a'::text, 'b'::text, NULL::text])))
);


--
-- Name: ai_prompt_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_prompt_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    prompt_id uuid,
    organization_id uuid,
    content text NOT NULL,
    version integer NOT NULL,
    variables jsonb,
    changed_by uuid,
    change_reason text,
    change_type text DEFAULT 'update'::text,
    avg_quality_score numeric(5,2),
    usage_count integer DEFAULT 0,
    avg_generation_time_ms integer,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT ai_prompt_history_change_type_check CHECK ((change_type = ANY (ARRAY['created'::text, 'update'::text, 'content_update'::text, 'status_change'::text, 'metadata_update'::text, 'rollback'::text, 'ab_test'::text])))
);


--
-- Name: ai_prompts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_prompts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    function_name text NOT NULL,
    prompt_key text NOT NULL,
    prompt_type text NOT NULL,
    name text NOT NULL,
    description text,
    content text NOT NULL,
    variables jsonb DEFAULT '[]'::jsonb,
    version integer DEFAULT 1 NOT NULL,
    is_active boolean DEFAULT true,
    is_default boolean DEFAULT false,
    category_id uuid,
    tags text[] DEFAULT '{}'::text[],
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT ai_prompts_prompt_type_check CHECK ((prompt_type = ANY (ARRAY['system'::text, 'user'::text, 'template'::text, 'component'::text])))
);


--
-- Name: ai_provider_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_provider_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    provider_type text NOT NULL,
    display_name text NOT NULL,
    is_active boolean DEFAULT true,
    api_key_secret_name text,
    base_url text,
    default_model text,
    config jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    encrypted_api_key text,
    CONSTRAINT ai_provider_configs_provider_type_check CHECK ((provider_type = ANY (ARRAY['lovable'::text, 'perplexity'::text, 'firecrawl'::text, 'openai'::text, 'anthropic'::text, 'gemini'::text, 'replicate'::text, 'custom'::text, 'openrouter'::text, 'kie'::text, 'poyo'::text, 'dashscope'::text, 'geminigen'::text])))
);


--
-- Name: COLUMN ai_provider_configs.encrypted_api_key; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ai_provider_configs.encrypted_api_key IS 'Encrypted API key for the provider. Only decrypted in edge functions.';


--
-- Name: ai_response_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_response_cache (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cache_key text NOT NULL,
    input_hash text NOT NULL,
    function_name text NOT NULL,
    response_data jsonb NOT NULL,
    response_schema_version text DEFAULT '1.0'::text NOT NULL,
    cache_scope text DEFAULT 'org'::text NOT NULL,
    organization_id uuid,
    brand_template_id uuid,
    industry_memory_version text,
    brand_voice_version text,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    hit_count integer DEFAULT 0 NOT NULL,
    last_hit_at timestamp with time zone,
    embedding extensions.vector(384),
    input_text text,
    CONSTRAINT valid_cache_scope CHECK ((((cache_scope = 'global'::text) AND (organization_id IS NULL)) OR ((cache_scope = 'org'::text) AND (organization_id IS NOT NULL))))
);


--
-- Name: approval_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.approval_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    approver_id uuid NOT NULL,
    creator_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid
);


--
-- Name: approval_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.approval_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    content_id uuid NOT NULL,
    organization_id uuid,
    action text NOT NULL,
    performed_by uuid NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    industry_memory_snapshot jsonb,
    CONSTRAINT approval_logs_action_check CHECK ((action = ANY (ARRAY['submitted'::text, 'approved'::text, 'rejected'::text])))
);


--
-- Name: COLUMN approval_logs.industry_memory_snapshot; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.approval_logs.industry_memory_snapshot IS 'Stores Industry Memory context at time of approval: { industry_template_id, industry_name, version, compliance_passed, checklist, reviewer_confirmed, rejected_rules }';


--
-- Name: audio_assets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audio_assets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    organization_id uuid,
    asset_type text NOT NULL,
    source_text text,
    prompt text,
    voice_id text,
    language text DEFAULT 'vi'::text,
    duration_seconds numeric(10,2),
    audio_url text,
    srt_content text,
    vtt_content text,
    provider text DEFAULT 'elevenlabs'::text NOT NULL,
    cost_estimate numeric(10,6),
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    script_id uuid,
    CONSTRAINT audio_assets_asset_type_check CHECK ((asset_type = ANY (ARRAY['voiceover'::text, 'music'::text, 'sfx'::text, 'subtitle'::text])))
);


--
-- Name: batch_processing_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.batch_processing_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_type text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    total_items integer DEFAULT 0 NOT NULL,
    processed_items integer DEFAULT 0 NOT NULL,
    failed_items integer DEFAULT 0 NOT NULL,
    progress smallint DEFAULT 0 NOT NULL,
    current_item_id uuid,
    current_item_name text,
    error_log jsonb DEFAULT '[]'::jsonb,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    estimated_completion timestamp with time zone,
    created_by uuid,
    organization_id uuid,
    config jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT batch_processing_jobs_job_type_check CHECK ((job_type = ANY (ARRAY['parse'::text, 'embed'::text, 'quality_cleanup'::text, 'full_crawl'::text]))),
    CONSTRAINT batch_processing_jobs_progress_check CHECK (((progress >= 0) AND (progress <= 100))),
    CONSTRAINT batch_processing_jobs_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'running'::text, 'paused'::text, 'completed'::text, 'failed'::text, 'cancelled'::text])))
);


--
-- Name: blog_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blog_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    post_slug text NOT NULL,
    author_name text NOT NULL,
    author_email text NOT NULL,
    content text NOT NULL,
    is_approved boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: blog_posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blog_posts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    excerpt text,
    content text,
    cover_image text,
    category text DEFAULT 'General'::text,
    tags text[],
    author_name text DEFAULT 'Flowa Team'::text,
    author_avatar text,
    read_time text,
    status text DEFAULT 'draft'::text NOT NULL,
    seo_title text,
    seo_description text,
    organization_id uuid,
    content_id uuid,
    published_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_public boolean DEFAULT false NOT NULL
);


--
-- Name: blog_reactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blog_reactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    post_slug text NOT NULL,
    reaction_type text DEFAULT 'like'::text NOT NULL,
    visitor_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: brand_channel_optimizations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.brand_channel_optimizations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    brand_template_id uuid NOT NULL,
    channel text NOT NULL,
    quality_mode text DEFAULT 'balanced'::text,
    prompt_style text DEFAULT 'default'::text,
    max_tokens_override integer,
    cost_priority text DEFAULT 'balanced'::text,
    preferred_hook_types text[] DEFAULT '{}'::text[],
    hook_intensity text DEFAULT 'medium'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: brand_memory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.brand_memory (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    brand_template_id uuid,
    organization_id uuid,
    memory_type text NOT NULL,
    content text NOT NULL,
    embedding extensions.vector(384),
    confidence double precision DEFAULT 0.5,
    source text,
    used_count integer DEFAULT 0,
    last_used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: brand_preferences_learned; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.brand_preferences_learned (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    brand_template_id uuid NOT NULL,
    channel text NOT NULL,
    preference_key text NOT NULL,
    preference_value jsonb NOT NULL,
    confidence_score double precision DEFAULT 0.5 NOT NULL,
    sample_count integer DEFAULT 1 NOT NULL,
    last_edit_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: brand_products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.brand_products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    brand_template_id uuid NOT NULL,
    organization_id uuid,
    user_id uuid,
    name text NOT NULL,
    sku text,
    category text,
    description text,
    price_display text,
    image_url text,
    unique_selling_points text[] DEFAULT '{}'::text[],
    target_audience text,
    pain_points_solved text[] DEFAULT '{}'::text[],
    benefits text[] DEFAULT '{}'::text[],
    keywords text[] DEFAULT '{}'::text[],
    suggested_content_angles text[] DEFAULT '{}'::text[],
    best_channels text[] DEFAULT '{}'::text[],
    is_featured boolean DEFAULT false,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    reference_images jsonb DEFAULT '[]'::jsonb NOT NULL,
    appearance jsonb DEFAULT '{}'::jsonb NOT NULL
);


--
-- Name: COLUMN brand_products.reference_images; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.brand_products.reference_images IS 'Array of {url, label} where label in front|back|side|in-use|packaging (max 5)';


--
-- Name: COLUMN brand_products.appearance; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.brand_products.appearance IS 'Object {color, material, size, distinctive_features} for AI prompt block';


--
-- Name: brand_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.brand_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    brand_name text NOT NULL,
    brand_guideline text NOT NULL,
    include_logo boolean DEFAULT true NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    logo_url text,
    primary_color text DEFAULT '#000000'::text,
    industry text[],
    brand_positioning text,
    tone_of_voice text[],
    formality_level text,
    language_style text[],
    preferred_words text[],
    forbidden_words text[],
    allow_emoji boolean DEFAULT true,
    compliance_rules text[],
    channel_overrides jsonb DEFAULT '{}'::jsonb,
    user_id uuid,
    organization_id uuid,
    country_code text DEFAULT 'VN'::text,
    industry_template_id uuid,
    sample_texts jsonb DEFAULT '{}'::jsonb,
    content_pillars jsonb DEFAULT '[]'::jsonb,
    footer_info jsonb,
    deleted_at timestamp with time zone,
    deleted_by uuid,
    mission text,
    vision text,
    unique_value_proposition text,
    tagline text,
    target_age_range text,
    target_gender text,
    market_segment text,
    target_locations text[] DEFAULT '{}'::text[],
    brand_hashtags text[] DEFAULT '{}'::text[],
    signature_phrases text[] DEFAULT '{}'::text[],
    cta_templates text[] DEFAULT '{}'::text[],
    evergreen_themes text[] DEFAULT '{}'::text[],
    secondary_colors text[] DEFAULT '{}'::text[],
    image_style text,
    main_competitors text[] DEFAULT '{}'::text[],
    competitive_advantages text[] DEFAULT '{}'::text[],
    sentence_style text DEFAULT 'balanced'::text,
    emoji_policy text DEFAULT 'minimal'::text,
    global_pack_id uuid,
    jurisdiction_code character varying(10) DEFAULT 'VN'::character varying,
    primary_channels text[] DEFAULT '{}'::text[],
    version integer DEFAULT 1 NOT NULL,
    headline text,
    sub_headline text,
    pinterest_default_board_id text,
    voice_variants jsonb DEFAULT '[]'::jsonb NOT NULL,
    imported_from jsonb
);


--
-- Name: COLUMN brand_templates.primary_color; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.brand_templates.primary_color IS 'Primary brand color in hex format';


--
-- Name: COLUMN brand_templates.sample_texts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.brand_templates.sample_texts IS 'Stores AI-generated or custom sample texts for each channel, format: {"facebook": "...", "linkedin": "...", ...}';


--
-- Name: COLUMN brand_templates.content_pillars; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.brand_templates.content_pillars IS 'Content pillars with name, weight (%), keywords, and color for content strategy';


--
-- Name: COLUMN brand_templates.footer_info; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.brand_templates.footer_info IS 'Business footer information for AI content generation';


--
-- Name: COLUMN brand_templates.deleted_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.brand_templates.deleted_at IS 'Timestamp when record was soft deleted. NULL means active.';


--
-- Name: COLUMN brand_templates.deleted_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.brand_templates.deleted_by IS 'User who performed the soft delete.';


--
-- Name: COLUMN brand_templates.sentence_style; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.brand_templates.sentence_style IS 'Writing style: short, balanced, long';


--
-- Name: COLUMN brand_templates.emoji_policy; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.brand_templates.emoji_policy IS 'Emoji usage: none, minimal, moderate';


--
-- Name: COLUMN brand_templates.imported_from; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.brand_templates.imported_from IS 'Audit metadata when brand was enriched via import. Shape: { source: "website"|"fanpage", url|page_id, imported_at, applied_fields: string[] }';


--
-- Name: brand_voice_variants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.brand_voice_variants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    brand_template_id uuid NOT NULL,
    name text NOT NULL,
    is_control boolean DEFAULT false,
    brand_positioning text,
    tone_of_voice text[],
    formality_level text,
    language_style text[],
    preferred_words text[],
    forbidden_words text[],
    allow_emoji boolean DEFAULT true,
    content_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    organization_id uuid,
    user_id uuid,
    sample_text text,
    sample_texts jsonb DEFAULT '{}'::jsonb
);


--
-- Name: COLUMN brand_voice_variants.sample_texts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.brand_voice_variants.sample_texts IS 'Stores sample texts for each channel: { "facebook": "...", "linkedin": "...", "instagram": "...", "tiktok": "...", "email": { "subject": "...", "body": "..." } }';


--
-- Name: calendar_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calendar_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    note_date date NOT NULL,
    content text NOT NULL,
    color text DEFAULT 'default'::text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: campaign_content_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campaign_content_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    goal_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    plan_data jsonb DEFAULT '[]'::jsonb NOT NULL,
    total_pieces integer DEFAULT 0 NOT NULL,
    completed_pieces integer DEFAULT 0 NOT NULL,
    campaign_start_date date,
    campaign_end_date date,
    campaign_duration_days integer,
    approval_mode text DEFAULT 'approve_plan'::text,
    plan_approved boolean DEFAULT false,
    plan_approved_at timestamp with time zone,
    clarification_context jsonb,
    status text DEFAULT 'draft'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    strategy_summary text,
    CONSTRAINT campaign_content_plans_approval_mode_check CHECK ((approval_mode = ANY (ARRAY['approve_plan'::text, 'approve_each'::text, 'full_auto'::text]))),
    CONSTRAINT campaign_content_plans_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'clarifying'::text, 'planning'::text, 'planned'::text, 'approved'::text, 'executing'::text, 'completed'::text, 'paused'::text])))
);


--
-- Name: campaign_contents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campaign_contents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    content_type text NOT NULL,
    content_id uuid NOT NULL,
    planned_publish_date date,
    sort_order integer DEFAULT 0,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT campaign_contents_content_type_check CHECK ((content_type = ANY (ARRAY['multichannel'::text, 'script'::text, 'carousel'::text])))
);


--
-- Name: campaign_kpi_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campaign_kpi_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    logged_at date NOT NULL,
    metrics jsonb DEFAULT '{}'::jsonb NOT NULL,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: campaign_milestones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campaign_milestones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    due_date date NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    completed_at timestamp with time zone,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT campaign_milestones_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text, 'missed'::text])))
);


--
-- Name: campaign_notification_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campaign_notification_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid,
    notification_key text NOT NULL,
    notification_type text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: campaigns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campaigns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    brand_template_id uuid,
    name text NOT NULL,
    description text,
    thumbnail_url text,
    start_date date NOT NULL,
    end_date date NOT NULL,
    campaign_type text DEFAULT 'awareness'::text NOT NULL,
    goals jsonb DEFAULT '[]'::jsonb,
    budget_total numeric(15,2),
    budget_spent numeric(15,2) DEFAULT 0,
    budget_currency text DEFAULT 'VND'::text,
    target_channels text[] DEFAULT '{}'::text[],
    status text DEFAULT 'draft'::text NOT NULL,
    tags text[] DEFAULT '{}'::text[],
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    content_brief jsonb,
    CONSTRAINT campaigns_campaign_type_check CHECK ((campaign_type = ANY (ARRAY['awareness'::text, 'engagement'::text, 'conversion'::text, 'retention'::text, 'launch'::text]))),
    CONSTRAINT campaigns_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'planning'::text, 'active'::text, 'paused'::text, 'completed'::text, 'cancelled'::text])))
);


--
-- Name: COLUMN campaigns.content_brief; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.campaigns.content_brief IS 'AI content brief: key_messages, primary_cta, pillar_allocation';


--
-- Name: carousel_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.carousel_images (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    carousel_id uuid NOT NULL,
    slide_number integer NOT NULL,
    image_url text NOT NULL,
    prompt text,
    version integer DEFAULT 1 NOT NULL,
    is_selected boolean DEFAULT true,
    created_by uuid,
    organization_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    scene_description text
);


--
-- Name: COLUMN carousel_images.scene_description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.carousel_images.scene_description IS 'Short prose describing visual style/colors/composition of generated image. Persisted for seamless continuity across regenerations and refreshes. Populated for all providers via Gemini Flash describe call.';


--
-- Name: carousel_style_presets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.carousel_style_presets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    preset_key text NOT NULL,
    display_name text NOT NULL,
    tokens jsonb NOT NULL,
    overlay_config jsonb NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: carousels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.carousels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    topic text NOT NULL,
    platform public.carousel_platform DEFAULT 'facebook'::public.carousel_platform NOT NULL,
    slide_count integer DEFAULT 5 NOT NULL,
    ai_tool public.carousel_ai_tool DEFAULT 'ideogram'::public.carousel_ai_tool NOT NULL,
    brand_name text DEFAULT 'Thuế Hộ by TAF.vn'::text NOT NULL,
    brand_guideline text,
    include_logo boolean DEFAULT true NOT NULL,
    slides_content jsonb DEFAULT '[]'::jsonb NOT NULL,
    caption_suggestion text,
    cta_suggestion text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    generated_images jsonb DEFAULT '[]'::jsonb,
    user_id uuid,
    organization_id uuid,
    status text DEFAULT 'draft'::text,
    industry_template_id uuid,
    industry_template_version text,
    critique_score integer,
    critique_details jsonb,
    was_refined boolean DEFAULT false,
    refinement_count integer DEFAULT 0,
    needs_manual_review boolean DEFAULT false,
    campaign_id uuid,
    carousel_style text DEFAULT 'educational'::text NOT NULL,
    visual_preset text DEFAULT 'minimalist'::text,
    seamless_consistency_score integer,
    seamless_analysis jsonb,
    brand_template_id uuid,
    published_channels text[] DEFAULT '{}'::text[] NOT NULL,
    generation_mode text DEFAULT 'legacy'::text,
    needs_regeneration boolean DEFAULT false,
    seamless_score integer,
    seamless_issues jsonb,
    locked_palette jsonb,
    needs_regeneration_slides jsonb,
    visual_lexicon text,
    creative_direction jsonb,
    CONSTRAINT carousels_slide_count_check CHECK (((slide_count >= 5) AND (slide_count <= 10)))
);

ALTER TABLE ONLY public.carousels REPLICA IDENTITY FULL;


--
-- Name: COLUMN carousels.critique_score; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.carousels.critique_score IS 'Self-critique quality score 0-100';


--
-- Name: COLUMN carousels.critique_details; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.carousels.critique_details IS 'Full critique result including scores, issues, suggestions';


--
-- Name: COLUMN carousels.was_refined; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.carousels.was_refined IS 'Whether content was auto-refined after initial generation';


--
-- Name: COLUMN carousels.refinement_count; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.carousels.refinement_count IS 'Number of refinement iterations performed';


--
-- Name: COLUMN carousels.visual_lexicon; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.carousels.visual_lexicon IS 'Short paragraph describing visual world from anchor slide: metaphor, lighting, rendering medium, perspective. Injected into seamlessContext for slides 2..N.';


--
-- Name: channel_image_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.channel_image_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    content_id uuid,
    channel text NOT NULL,
    image_url text NOT NULL,
    prompt text,
    aspect_ratio text,
    is_selected boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    organization_id uuid,
    version integer DEFAULT 1 NOT NULL,
    last_accessed_at timestamp with time zone DEFAULT now()
);


--
-- Name: character_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.character_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    appearance jsonb DEFAULT '{}'::jsonb NOT NULL,
    wardrobe text,
    reference_image_url text,
    brand_template_id uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    reference_images jsonb DEFAULT '[]'::jsonb,
    default_voice_id text,
    default_voice_provider text,
    default_role text DEFAULT 'supporting'::text NOT NULL,
    CONSTRAINT character_profiles_default_role_check CHECK ((default_role = ANY (ARRAY['main'::text, 'supporting'::text])))
);


--
-- Name: chat_conversation_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_conversation_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT chat_conversation_messages_role_check CHECK ((role = ANY (ARRAY['user'::text, 'assistant'::text, 'system'::text])))
);


--
-- Name: chat_conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    organization_id uuid,
    brand_template_id uuid,
    title text,
    summary text,
    message_count integer DEFAULT 0,
    last_message_at timestamp with time zone,
    is_archived boolean DEFAULT false,
    content_goal text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    session_learnings jsonb DEFAULT '{}'::jsonb,
    user_corrections jsonb DEFAULT '[]'::jsonb,
    embeddings_indexed_at timestamp with time zone
);


--
-- Name: chat_feedback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_feedback (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    organization_id uuid,
    message_id text NOT NULL,
    conversation_id text,
    feedback_type text NOT NULL,
    message_content text,
    user_message text,
    brand_template_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chat_feedback_feedback_type_check CHECK ((feedback_type = ANY (ARRAY['up'::text, 'down'::text])))
);


--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_edited boolean DEFAULT false,
    reply_to_id uuid
);


--
-- Name: circuit_breaker_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.circuit_breaker_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider text NOT NULL,
    model text NOT NULL,
    failure_count integer DEFAULT 0 NOT NULL,
    failure_rate double precision DEFAULT 0,
    tripped_at timestamp with time zone DEFAULT now() NOT NULL,
    instance_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cluster_coverage; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.cluster_coverage AS
SELECT
    NULL::uuid AS cluster_id,
    NULL::uuid AS organization_id,
    NULL::text AS name,
    NULL::text AS status,
    NULL::bigint AS keyword_count,
    NULL::bigint AS keywords_covered,
    NULL::bigint AS topic_count,
    NULL::bigint AS topics_used,
    NULL::numeric AS coverage_pct;


--
-- Name: competitor_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.competitor_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    competitor_name text NOT NULL,
    website_url text,
    industry text,
    notes text,
    facebook_page_id text,
    instagram_handle text,
    tiktok_handle text,
    is_active boolean DEFAULT true,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: content_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.content_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    content_id uuid NOT NULL,
    channel text NOT NULL,
    assigned_to uuid NOT NULL,
    assigned_by uuid NOT NULL,
    organization_id uuid NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    priority text DEFAULT 'normal'::text NOT NULL,
    due_date timestamp with time zone,
    notes text,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: content_embeddings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.content_embeddings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    content_type text NOT NULL,
    content_id uuid NOT NULL,
    chunk_index integer DEFAULT 0,
    content_text text NOT NULL,
    embedding extensions.vector(768),
    organization_id uuid,
    brand_template_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    session_id uuid,
    node_name text
);


--
-- Name: content_feedback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.content_feedback (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    organization_id uuid,
    conversation_id uuid,
    message_id text,
    trace_id text,
    governor_score integer,
    feedback_type text NOT NULL,
    tags text[] DEFAULT '{}'::text[],
    comment text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT content_feedback_feedback_type_check CHECK ((feedback_type = ANY (ARRAY['thumbs_up'::text, 'thumbs_down'::text])))
);


--
-- Name: content_learnings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.content_learnings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    brand_template_id uuid,
    user_id uuid,
    channel text NOT NULL,
    content_type text DEFAULT 'multichannel'::text NOT NULL,
    edit_type text NOT NULL,
    original_snippet text,
    edited_snippet text,
    edit_diff jsonb,
    content_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: content_publishing_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.content_publishing_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    schedule_id uuid,
    content_id uuid,
    channel text NOT NULL,
    organization_id uuid,
    action text NOT NULL,
    performed_by uuid,
    performed_at timestamp with time zone DEFAULT now(),
    details jsonb DEFAULT '{}'::jsonb,
    error_message text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT content_publishing_logs_action_check CHECK ((action = ANY (ARRAY['scheduled'::text, 'published'::text, 'failed'::text, 'cancelled'::text, 'rescheduled'::text])))
);


--
-- Name: content_schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.content_schedules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    content_id uuid,
    channel text NOT NULL,
    organization_id uuid,
    scheduled_at timestamp with time zone NOT NULL,
    timezone text DEFAULT 'Asia/Ho_Chi_Minh'::text,
    publish_status text DEFAULT 'scheduled'::text,
    published_at timestamp with time zone,
    publish_error text,
    external_post_id text,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT content_schedules_publish_status_check CHECK ((publish_status = ANY (ARRAY['scheduled'::text, 'publishing'::text, 'published'::text, 'failed'::text, 'cancelled'::text])))
);


--
-- Name: content_style_patterns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.content_style_patterns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    brand_template_id uuid,
    organization_id uuid,
    content_type text NOT NULL,
    pattern_category text NOT NULL,
    original_pattern text,
    user_pattern text,
    edit_type text,
    occurrence_count integer DEFAULT 1,
    confidence_score real DEFAULT 0.3,
    last_seen_at timestamp with time zone DEFAULT now(),
    examples jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: conversation_embeddings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversation_embeddings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    message_id uuid,
    embedding_type text NOT NULL,
    content_text text NOT NULL,
    embedding extensions.vector(768),
    user_id uuid NOT NULL,
    organization_id uuid,
    brand_template_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT conversation_embeddings_embedding_type_check CHECK ((embedding_type = ANY (ARRAY['summary'::text, 'message'::text, 'exchange'::text, 'key_insight'::text])))
);


--
-- Name: TABLE conversation_embeddings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.conversation_embeddings IS 'Stores embeddings for conversation history semantic search';


--
-- Name: core_contents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.core_contents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    topic text NOT NULL,
    content text NOT NULL,
    word_count integer,
    content_goal text DEFAULT 'education'::text NOT NULL,
    content_angle text,
    target_audience text,
    key_messages jsonb DEFAULT '[]'::jsonb,
    brand_template_id uuid,
    organization_id uuid,
    user_id uuid,
    source_type text DEFAULT 'ai_generated'::text NOT NULL,
    source_topic_history_id uuid,
    quality_score integer,
    ai_model_used text,
    content_role text,
    status text DEFAULT 'draft'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    generation_metadata jsonb DEFAULT '{}'::jsonb,
    outline jsonb,
    CONSTRAINT core_contents_content_role_check CHECK ((content_role = ANY (ARRAY['seed'::text, 'sprout'::text, 'harvest'::text]))),
    CONSTRAINT core_contents_quality_score_check CHECK (((quality_score >= 0) AND (quality_score <= 100))),
    CONSTRAINT core_contents_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'approved'::text, 'archived'::text])))
);


--
-- Name: TABLE core_contents; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.core_contents IS 'Single Source of Truth for content - long-form core content that can be transformed into platform-specific variants';


--
-- Name: COLUMN core_contents.content; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.core_contents.content IS 'Long-form content (800-2000 words) - the master content before platform adaptation';


--
-- Name: COLUMN core_contents.key_messages; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.core_contents.key_messages IS 'Array of key messages/points that must be preserved when transforming to variants';


--
-- Name: COLUMN core_contents.content_role; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.core_contents.content_role IS 'Content role in funnel: seed (awareness), sprout (trust), harvest (conversion)';


--
-- Name: countries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.countries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    native_name text,
    default_language text DEFAULT 'vi'::text NOT NULL,
    flag_emoji text,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE countries; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.countries IS 'Countries for Industry Memory localization';


--
-- Name: cron_run_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cron_run_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_name text NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    duration_ms integer,
    status text DEFAULT 'success'::text NOT NULL,
    triggered_by text DEFAULT 'cron'::text NOT NULL,
    summary jsonb DEFAULT '{}'::jsonb NOT NULL,
    errors jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cron_run_logs_status_check CHECK ((status = ANY (ARRAY['success'::text, 'partial'::text, 'failed'::text, 'running'::text]))),
    CONSTRAINT cron_run_logs_triggered_by_check CHECK ((triggered_by = ANY (ARRAY['cron'::text, 'manual'::text])))
);


--
-- Name: curated_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.curated_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    event_date date NOT NULL,
    end_date date,
    event_type text DEFAULT 'holiday'::text NOT NULL,
    country_code text DEFAULT 'VN'::text,
    industries text[] DEFAULT '{}'::text[],
    suggested_topics text[] DEFAULT '{}'::text[],
    suggested_angles text[] DEFAULT '{}'::text[],
    priority integer DEFAULT 3,
    is_active boolean DEFAULT true,
    created_by uuid,
    organization_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: curated_news; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.curated_news (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    summary text,
    source_url text,
    news_date date DEFAULT CURRENT_DATE,
    expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval),
    industries text[] DEFAULT '{}'::text[],
    relevance_score integer DEFAULT 50,
    suggested_angles text[] DEFAULT '{}'::text[],
    is_active boolean DEFAULT true,
    created_by uuid,
    organization_id uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: customer_personas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_personas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    brand_template_id uuid,
    organization_id uuid,
    user_id uuid,
    name text NOT NULL,
    avatar_emoji text DEFAULT '👤'::text,
    is_primary boolean DEFAULT false,
    age_range text,
    gender text,
    location text,
    income_level text,
    occupation text,
    pain_points text[] DEFAULT '{}'::text[],
    desires text[] DEFAULT '{}'::text[],
    objections text[] DEFAULT '{}'::text[],
    "values" text[] DEFAULT '{}'::text[],
    interests text[] DEFAULT '{}'::text[],
    buying_triggers text[] DEFAULT '{}'::text[],
    information_sources text[] DEFAULT '{}'::text[],
    preferred_channels text[] DEFAULT '{}'::text[],
    typical_funnel_stage text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    source_industry_persona_id uuid,
    is_customized boolean DEFAULT false,
    communication_style text,
    response_tone_hints text[],
    content_preferences jsonb,
    persona_prompt_hints text,
    education_level text,
    family_status text,
    device_usage text DEFAULT 'mobile-first'::text,
    tech_savviness text DEFAULT 'medium'::text,
    buying_motivation text[] DEFAULT '{}'::text[],
    priority_score integer DEFAULT 3,
    segment_size numeric(5,2),
    journey_map jsonb DEFAULT '[]'::jsonb,
    avatar_url text,
    color_theme text,
    data_source text,
    confidence_level text DEFAULT 'medium'::text,
    last_researched_date date,
    country_variants jsonb DEFAULT '{}'::jsonb
);


--
-- Name: COLUMN customer_personas.communication_style; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customer_personas.communication_style IS 'Communication style preference: direct, nurturing, consultative, educational, motivational';


--
-- Name: COLUMN customer_personas.response_tone_hints; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customer_personas.response_tone_hints IS 'Array of tone hints for AI content generation';


--
-- Name: COLUMN customer_personas.content_preferences; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customer_personas.content_preferences IS 'JSONB object with content format, visual, storytelling preferences';


--
-- Name: COLUMN customer_personas.persona_prompt_hints; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.customer_personas.persona_prompt_hints IS 'Custom prompt hints for AI when generating content for this persona';


--
-- Name: duplicate_ignore_list; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.duplicate_ignore_list (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    node_id_1 uuid NOT NULL,
    node_id_2 uuid NOT NULL,
    ignored_by uuid,
    ignored_at timestamp with time zone DEFAULT now(),
    reason text
);


--
-- Name: edge_function_daily_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.edge_function_daily_stats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    function_name text NOT NULL,
    stat_date date NOT NULL,
    total_calls integer DEFAULT 0,
    error_count integer DEFAULT 0,
    cold_start_count integer DEFAULT 0,
    avg_duration_ms numeric(10,2) DEFAULT 0,
    p50_duration_ms integer DEFAULT 0,
    p95_duration_ms integer DEFAULT 0,
    max_duration_ms integer DEFAULT 0,
    min_duration_ms integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: edge_function_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.edge_function_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    function_name text NOT NULL,
    duration_ms integer NOT NULL,
    status_code integer DEFAULT 200,
    is_cold_start boolean DEFAULT false,
    had_error boolean DEFAULT false,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: external_link_sources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.external_link_sources (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    brand_template_id uuid,
    source_type text NOT NULL,
    source_ref_id text,
    domain text NOT NULL,
    url text NOT NULL,
    title text,
    excerpt text,
    keywords text[] DEFAULT '{}'::text[],
    published_at timestamp with time zone,
    last_synced_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT external_link_sources_source_type_check CHECK ((source_type = ANY (ARRAY['wordpress'::text, 'blogger'::text, 'wordpress_com'::text, 'sitemap'::text, 'manual'::text]))),
    CONSTRAINT external_link_sources_status_check CHECK ((status = ANY (ARRAY['active'::text, 'archived'::text])))
);


--
-- Name: facebook_oauth_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.facebook_oauth_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    organization_id uuid,
    brand_template_id uuid,
    encrypted_user_token text NOT NULL,
    pages jsonb DEFAULT '[]'::jsonb NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '00:15:00'::interval) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: firecrawl_serp_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.firecrawl_serp_cache (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    keyword_normalized text NOT NULL,
    lang text DEFAULT 'vi'::text NOT NULL,
    country text DEFAULT 'VN'::text NOT NULL,
    results jsonb DEFAULT '[]'::jsonb NOT NULL,
    hit_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval) NOT NULL
);


--
-- Name: generation_signals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.generation_signals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    brand_id uuid,
    user_id uuid NOT NULL,
    prompt_mode text NOT NULL,
    channel text NOT NULL,
    image_style text,
    accepted boolean DEFAULT false,
    regenerated boolean DEFAULT false,
    edited_background boolean DEFAULT false,
    edited_text boolean DEFAULT false,
    switched_mode boolean DEFAULT false,
    time_to_accept_ms integer,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: generation_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.generation_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    organization_id uuid,
    task_type text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    progress integer DEFAULT 0,
    progress_message text,
    current_step text,
    input_params jsonb DEFAULT '{}'::jsonb NOT NULL,
    result_id uuid,
    result_type text,
    error_message text,
    retry_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    expires_at timestamp with time zone DEFAULT (now() + '24:00:00'::interval),
    result_metadata jsonb,
    CONSTRAINT generation_tasks_progress_check CHECK (((progress >= 0) AND (progress <= 100))),
    CONSTRAINT generation_tasks_result_type_check CHECK (((result_type IS NULL) OR (result_type = ANY (ARRAY['core_contents'::text, 'multi_channel_contents'::text])))),
    CONSTRAINT generation_tasks_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'generating'::text, 'completed'::text, 'failed'::text, 'cancelled'::text]))),
    CONSTRAINT generation_tasks_task_type_check CHECK ((task_type = ANY (ARRAY['core_content'::text, 'multichannel'::text, 'carousel_image'::text, 'image_generation'::text, 'carousel_prompt'::text])))
);


--
-- Name: geo_action_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.geo_action_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    brand_monitor_id uuid,
    source_module text DEFAULT 'monitor'::text NOT NULL,
    priority text DEFAULT 'medium'::text NOT NULL,
    title text NOT NULL,
    description text,
    brief jsonb DEFAULT '{}'::jsonb,
    status text DEFAULT 'pending'::text NOT NULL,
    impact_score integer DEFAULT 50,
    effort_level text DEFAULT 'medium'::text,
    assigned_to uuid,
    completed_at timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    content_id uuid,
    generated_content_id uuid,
    pre_score numeric(5,2),
    post_score numeric(5,2),
    resolved_at timestamp with time zone,
    CONSTRAINT geo_action_tasks_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'content_generated'::text, 'published'::text, 'measuring'::text, 'resolved'::text, 'done'::text])))
);


--
-- Name: geo_alert_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.geo_alert_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    brand_monitor_id uuid NOT NULL,
    alert_type text NOT NULL,
    severity text DEFAULT 'info'::text,
    title text NOT NULL,
    description text,
    data jsonb DEFAULT '{}'::jsonb,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT geo_alert_history_alert_type_check CHECK ((alert_type = ANY (ARRAY['sov_drop'::text, 'sov_spike'::text, 'new_competitor'::text, 'sentiment_drop'::text, 'citation_lost'::text, 'citation_gained'::text]))),
    CONSTRAINT geo_alert_history_severity_check CHECK ((severity = ANY (ARRAY['critical'::text, 'warning'::text, 'info'::text])))
);


--
-- Name: geo_brand_monitors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.geo_brand_monitors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    brand_template_id uuid NOT NULL,
    brand_name text NOT NULL,
    ai_engines text[] DEFAULT ARRAY['chatgpt'::text, 'gemini'::text, 'perplexity'::text] NOT NULL,
    keywords text[] DEFAULT '{}'::text[] NOT NULL,
    competitors text[] DEFAULT '{}'::text[] NOT NULL,
    scan_frequency text DEFAULT 'weekly'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    last_scanned_at timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: geo_content_scores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.geo_content_scores (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    content_id uuid NOT NULL,
    content_type text DEFAULT 'multi_channel'::text NOT NULL,
    overall_score integer DEFAULT 0 NOT NULL,
    factor_scores jsonb DEFAULT '{}'::jsonb NOT NULL,
    issues jsonb DEFAULT '[]'::jsonb NOT NULL,
    suggestions jsonb DEFAULT '[]'::jsonb,
    last_scored_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: geo_monitoring_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.geo_monitoring_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    brand_monitor_id uuid NOT NULL,
    ai_engine text NOT NULL,
    prompt text NOT NULL,
    response text,
    brand_mentioned boolean DEFAULT false NOT NULL,
    mention_count integer DEFAULT 0 NOT NULL,
    citation_urls text[] DEFAULT '{}'::text[],
    sentiment_score numeric DEFAULT 0,
    sentiment_label text,
    competitor_mentions jsonb DEFAULT '{}'::jsonb,
    scanned_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    is_simulated boolean DEFAULT true
);


--
-- Name: geo_prompts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.geo_prompts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    brand_monitor_id uuid NOT NULL,
    prompt_text text NOT NULL,
    intent_type text DEFAULT 'informational'::text,
    source text DEFAULT 'manual'::text,
    cluster_name text,
    is_active boolean DEFAULT true,
    last_used_at timestamp with time zone,
    use_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT geo_prompts_intent_type_check CHECK ((intent_type = ANY (ARRAY['informational'::text, 'commercial'::text, 'transactional'::text, 'navigational'::text, 'comparison'::text]))),
    CONSTRAINT geo_prompts_source_check CHECK ((source = ANY (ARRAY['manual'::text, 'auto_generated'::text, 'industry_pack'::text, 'ai_suggested'::text])))
);


--
-- Name: geo_scan_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.geo_scan_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    brand_monitor_id uuid NOT NULL,
    status text DEFAULT 'pending'::text,
    total_prompts integer DEFAULT 0,
    completed_prompts integer DEFAULT 0,
    total_api_calls integer DEFAULT 0,
    estimated_cost_usd numeric(10,4) DEFAULT 0,
    actual_cost_usd numeric(10,4) DEFAULT 0,
    engines_used text[] DEFAULT '{}'::text[],
    error_message text,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT geo_scan_jobs_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'running'::text, 'completed'::text, 'failed'::text, 'cancelled'::text])))
);


--
-- Name: geo_schema_outputs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.geo_schema_outputs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    content_id uuid NOT NULL,
    content_type text DEFAULT 'multi_channel'::text NOT NULL,
    schema_type text DEFAULT 'Article'::text NOT NULL,
    json_ld_code text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: geo_visibility_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.geo_visibility_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    brand_monitor_id uuid NOT NULL,
    snapshot_date date NOT NULL,
    sov_percentage numeric(5,2) DEFAULT 0,
    citation_rate numeric(5,2) DEFAULT 0,
    avg_sentiment numeric(5,2) DEFAULT 0,
    total_scans integer DEFAULT 0,
    mentions_count integer DEFAULT 0,
    citations_count integer DEFAULT 0,
    competitor_sov jsonb DEFAULT '{}'::jsonb,
    top_prompts jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: gsc_connections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gsc_connections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    brand_template_id uuid,
    site_url text NOT NULL,
    google_email text,
    access_token text NOT NULL,
    refresh_token text NOT NULL,
    token_expires_at timestamp with time zone,
    scopes text[],
    is_active boolean DEFAULT true NOT NULL,
    last_synced_at timestamp with time zone,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: gsc_metrics_daily; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gsc_metrics_daily (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    connection_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    date date NOT NULL,
    page text,
    query text,
    country text,
    device text,
    impressions integer DEFAULT 0 NOT NULL,
    clicks integer DEFAULT 0 NOT NULL,
    ctr numeric(6,4) DEFAULT 0 NOT NULL,
    "position" numeric(6,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: gsc_sync_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gsc_sync_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    connection_id uuid,
    organization_id uuid,
    status text NOT NULL,
    rows_synced integer DEFAULT 0,
    error_message text,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone
);


--
-- Name: help_articles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.help_articles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    category text DEFAULT 'general'::text,
    keywords text[] DEFAULT '{}'::text[],
    route_context text[] DEFAULT '{}'::text[],
    priority integer DEFAULT 0,
    is_published boolean DEFAULT true,
    created_by uuid,
    organization_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    embedding extensions.vector(768)
);


--
-- Name: hook_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hook_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    framework text NOT NULL,
    name text NOT NULL,
    opening_line text NOT NULL,
    visual_direction text,
    text_overlay text,
    psychology_reason text,
    engagement_level text DEFAULT 'medium'::text,
    platforms text[] DEFAULT '{}'::text[],
    industries text[] DEFAULT '{}'::text[],
    duration_fit text[] DEFAULT '{}'::text[],
    compatible_tones text[] DEFAULT '{}'::text[],
    compatible_formality text[] DEFAULT '{}'::text[],
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: industry_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.industry_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    icon_name text NOT NULL,
    color text DEFAULT '#6366f1'::text,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    label text
);


--
-- Name: TABLE industry_categories; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.industry_categories IS 'Categories grouping related industries';


--
-- Name: industry_category_translations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.industry_category_translations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category_id uuid NOT NULL,
    language_code text NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE industry_category_translations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.industry_category_translations IS 'Translations for industry categories';


--
-- Name: industry_global_packs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.industry_global_packs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    industry_code character varying(50) NOT NULL,
    category_id uuid,
    target_audience character varying(10) DEFAULT 'both'::character varying,
    global_brand_voice jsonb DEFAULT '{}'::jsonb,
    global_terminology jsonb DEFAULT '{"preferred_terms": {}, "forbidden_terms_global": [], "forbidden_words_by_lang": {}}'::jsonb,
    global_compliance_rules jsonb DEFAULT '[]'::jsonb,
    global_claim_restrictions jsonb DEFAULT '[]'::jsonb,
    global_argument_patterns jsonb DEFAULT '{"valid_patterns": [], "forbidden_patterns": []}'::jsonb,
    global_system_rules jsonb DEFAULT '[]'::jsonb,
    risk_guidelines jsonb DEFAULT '{"risk_thresholds": {}, "scoring_weights": {}, "high_risk_keywords": []}'::jsonb,
    related_industries text[] DEFAULT '{}'::text[],
    is_active boolean DEFAULT true,
    version text DEFAULT '1.0'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    parent_pack_id uuid,
    industry_level character varying(20) DEFAULT 'core'::character varying,
    sort_order integer DEFAULT 0,
    is_popular boolean DEFAULT false NOT NULL,
    popular_sort_order integer,
    CONSTRAINT chk_industry_level CHECK (((industry_level)::text = ANY ((ARRAY['core'::character varying, 'sub'::character varying])::text[])))
);


--
-- Name: industry_glossary; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.industry_glossary (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    industry_template_id uuid NOT NULL,
    term text NOT NULL,
    abbreviation text,
    category text DEFAULT 'general'::text NOT NULL,
    is_preferred boolean DEFAULT true NOT NULL,
    related_terms text[] DEFAULT '{}'::text[],
    usage_context text,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE industry_glossary; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.industry_glossary IS 'Industry-specific glossary terms with definitions and usage guidelines';


--
-- Name: COLUMN industry_glossary.term; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.industry_glossary.term IS 'The glossary term or phrase';


--
-- Name: COLUMN industry_glossary.abbreviation; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.industry_glossary.abbreviation IS 'Common abbreviation if applicable (e.g., FDA, IELTS)';


--
-- Name: COLUMN industry_glossary.category; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.industry_glossary.category IS 'Category: general, legal, technical, process, document, certification';


--
-- Name: COLUMN industry_glossary.is_preferred; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.industry_glossary.is_preferred IS 'Whether this is the preferred term to use in content';


--
-- Name: COLUMN industry_glossary.related_terms; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.industry_glossary.related_terms IS 'Array of related or synonym terms';


--
-- Name: COLUMN industry_glossary.usage_context; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.industry_glossary.usage_context IS 'When and how to use this term';


--
-- Name: industry_glossary_translations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.industry_glossary_translations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    glossary_id uuid NOT NULL,
    language_code text DEFAULT 'vi'::text NOT NULL,
    definition text NOT NULL,
    example_usage text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE industry_glossary_translations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.industry_glossary_translations IS 'Multi-language translations for glossary terms';


--
-- Name: industry_jurisdiction_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.industry_jurisdiction_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    global_pack_id uuid,
    jurisdiction_code character varying(10) NOT NULL,
    resolved_rules jsonb DEFAULT '{}'::jsonb NOT NULL,
    validity_status character varying(20) DEFAULT 'current'::character varying,
    last_verified_date date,
    disclaimer text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: industry_knowledge_edges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.industry_knowledge_edges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_node_id uuid NOT NULL,
    target_node_id uuid NOT NULL,
    edge_type text NOT NULL,
    weight double precision DEFAULT 1.0,
    properties jsonb DEFAULT '{}'::jsonb,
    is_bidirectional boolean DEFAULT false,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT industry_knowledge_edges_edge_type_check CHECK ((edge_type = ANY (ARRAY['related_to'::text, 'parent_of'::text, 'regulated_by'::text, 'uses_term'::text, 'shares_audience'::text, 'competes_with'::text, 'requires_compliance'::text, 'derived_from'::text, 'applies_to'::text]))),
    CONSTRAINT industry_knowledge_edges_weight_check CHECK (((weight >= (0.0)::double precision) AND (weight <= (1.0)::double precision)))
);


--
-- Name: industry_knowledge_nodes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.industry_knowledge_nodes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    global_pack_id uuid,
    node_type text NOT NULL,
    node_key text NOT NULL,
    display_name jsonb DEFAULT '{}'::jsonb NOT NULL,
    description jsonb DEFAULT '{}'::jsonb,
    properties jsonb DEFAULT '{}'::jsonb,
    embedding extensions.vector(384),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    source_url text,
    source_id uuid,
    last_verified_at timestamp with time zone,
    content_hash text,
    full_text text,
    extracted_data jsonb DEFAULT '{}'::jsonb,
    document_url text,
    document_type text,
    effective_date date,
    parse_status text DEFAULT 'pending'::text,
    content_quality_score smallint,
    quality_breakdown jsonb,
    parsed_structure jsonb,
    CONSTRAINT industry_knowledge_nodes_content_quality_score_check CHECK (((content_quality_score >= 0) AND (content_quality_score <= 100))),
    CONSTRAINT industry_knowledge_nodes_node_type_check CHECK ((node_type = ANY (ARRAY['industry'::text, 'regulation'::text, 'term'::text, 'concept'::text, 'persona'::text, 'jurisdiction'::text]))),
    CONSTRAINT industry_knowledge_nodes_parse_status_check CHECK ((parse_status = ANY (ARRAY['pending'::text, 'parsing'::text, 'parsed'::text, 'failed'::text, 'skipped'::text])))
);


--
-- Name: COLUMN industry_knowledge_nodes.full_text; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.industry_knowledge_nodes.full_text IS 'Full extracted text content from parsed PDF/DOCX document';


--
-- Name: COLUMN industry_knowledge_nodes.extracted_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.industry_knowledge_nodes.extracted_data IS 'AI-extracted structured data: summary, key_changes, claim_restrictions, etc.';


--
-- Name: COLUMN industry_knowledge_nodes.document_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.industry_knowledge_nodes.document_url IS 'Direct download URL for the source PDF/DOCX file';


--
-- Name: COLUMN industry_knowledge_nodes.document_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.industry_knowledge_nodes.document_type IS 'File type: pdf, docx, html';


--
-- Name: COLUMN industry_knowledge_nodes.effective_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.industry_knowledge_nodes.effective_date IS 'Legal effective date extracted from document';


--
-- Name: COLUMN industry_knowledge_nodes.parse_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.industry_knowledge_nodes.parse_status IS 'Document parsing status: pending, parsing, parsed, failed, skipped';


--
-- Name: COLUMN industry_knowledge_nodes.parsed_structure; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.industry_knowledge_nodes.parsed_structure IS 'Structured legal document metadata: document_type, document_number, issuing_authority, effective_date, chapters, articles, signatories';


--
-- Name: industry_memory_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.industry_memory_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    industry_template_id uuid NOT NULL,
    version text NOT NULL,
    compliance_rules jsonb DEFAULT '[]'::jsonb,
    forbidden_terms text[] DEFAULT '{}'::text[],
    claim_restrictions jsonb DEFAULT '[]'::jsonb,
    brand_voice jsonb DEFAULT '{}'::jsonb,
    changed_by uuid,
    change_notes text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: industry_template_translations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.industry_template_translations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    industry_template_id uuid NOT NULL,
    language_code text NOT NULL,
    name text NOT NULL,
    short_name text,
    brand_positioning text,
    preferred_words text[] DEFAULT '{}'::text[],
    forbidden_words text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE industry_template_translations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.industry_template_translations IS 'Translations for industry templates including localized words';


--
-- Name: industry_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.industry_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    country_id uuid NOT NULL,
    category_id uuid,
    code text NOT NULL,
    target_audience text DEFAULT 'B2B'::text NOT NULL,
    brand_voice jsonb DEFAULT '{}'::jsonb NOT NULL,
    channel_settings jsonb DEFAULT '{}'::jsonb,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    version text DEFAULT '1.0'::text,
    compliance_rules jsonb DEFAULT '[]'::jsonb,
    claim_restrictions jsonb DEFAULT '[]'::jsonb,
    forbidden_terms text[] DEFAULT '{}'::text[],
    status public.industry_pack_status DEFAULT 'draft'::public.industry_pack_status NOT NULL,
    published_at timestamp with time zone,
    published_by uuid,
    metadata jsonb DEFAULT '{}'::jsonb,
    argument_patterns jsonb DEFAULT '{}'::jsonb,
    system_rules jsonb DEFAULT '[]'::jsonb,
    seasonal_events jsonb DEFAULT '[]'::jsonb,
    deleted_at timestamp with time zone,
    deleted_by uuid,
    CONSTRAINT industry_templates_target_audience_check CHECK ((target_audience = ANY (ARRAY['B2B'::text, 'B2C'::text, 'both'::text])))
);


--
-- Name: TABLE industry_templates; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.industry_templates IS 'Industry-specific brand voice templates by country';


--
-- Name: COLUMN industry_templates.metadata; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.industry_templates.metadata IS 'Extended metadata: { applies_to: string[], legal_basis: string[] }';


--
-- Name: COLUMN industry_templates.argument_patterns; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.industry_templates.argument_patterns IS 'Reasoning patterns: { valid_patterns: string[], forbidden_patterns: string[] }';


--
-- Name: COLUMN industry_templates.system_rules; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.industry_templates.system_rules IS 'Highest priority rules for AI enforcement - string[]';


--
-- Name: COLUMN industry_templates.seasonal_events; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.industry_templates.seasonal_events IS 'Array of industry-specific seasonal events. Structure: [{ "event": "Event Name", "date": "DD/MM", "suggestedAngles": ["angle1", "angle2"] }]';


--
-- Name: COLUMN industry_templates.deleted_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.industry_templates.deleted_at IS 'Timestamp when record was soft deleted. NULL means active.';


--
-- Name: COLUMN industry_templates.deleted_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.industry_templates.deleted_by IS 'User who performed the soft delete.';


--
-- Name: industry_memory_packs; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.industry_memory_packs WITH (security_invoker='true') AS
 SELECT it.id,
    it.code,
    itt.name,
    itt.short_name,
    c.id AS country_id,
    c.code AS country_code,
    c.name AS country_name,
    c.flag_emoji,
    it.version,
    it.status,
    it.target_audience,
    ic.code AS category_code,
    ict.name AS category_name,
    ic.color AS category_color,
    ic.icon_name AS category_icon,
    COALESCE(jsonb_array_length(it.compliance_rules), 0) AS compliance_rules_count,
    COALESCE(array_length(it.forbidden_terms, 1), 0) AS forbidden_terms_count,
    COALESCE(jsonb_array_length(it.claim_restrictions), 0) AS claim_restrictions_count,
    ( SELECT (count(*))::integer AS count
           FROM public.industry_memory_versions imv
          WHERE (imv.industry_template_id = it.id)) AS version_count,
    it.published_at,
    it.published_by,
    it.created_at,
    it.updated_at,
    it.is_active
   FROM ((((public.industry_templates it
     JOIN public.countries c ON ((it.country_id = c.id)))
     LEFT JOIN public.industry_template_translations itt ON (((it.id = itt.industry_template_id) AND (itt.language_code = c.default_language))))
     LEFT JOIN public.industry_categories ic ON ((it.category_id = ic.id)))
     LEFT JOIN public.industry_category_translations ict ON (((ic.id = ict.category_id) AND (ict.language_code = c.default_language))));


--
-- Name: industry_pack_translations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.industry_pack_translations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    global_pack_id uuid,
    language_code character varying(10) NOT NULL,
    name text NOT NULL,
    short_name text,
    preferred_terms text[] DEFAULT '{}'::text[],
    forbidden_terms text[] DEFAULT '{}'::text[],
    glossary jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: industry_persona_translations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.industry_persona_translations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    industry_persona_id uuid NOT NULL,
    language_code text DEFAULT 'vi'::text NOT NULL,
    name text NOT NULL,
    occupation text,
    pain_points text[] DEFAULT '{}'::text[],
    desires text[] DEFAULT '{}'::text[],
    objections text[] DEFAULT '{}'::text[],
    persona_prompt_hints text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: industry_persona_translations_v2; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.industry_persona_translations_v2 (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    persona_id uuid NOT NULL,
    language_code text DEFAULT 'vi'::text NOT NULL,
    name text NOT NULL,
    description text,
    lifestyle text,
    pain_points text[],
    goals text[],
    objections text[],
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: industry_personas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.industry_personas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    industry_template_id uuid NOT NULL,
    name text NOT NULL,
    avatar_emoji text DEFAULT '👤'::text,
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    age_range text,
    gender text,
    income_level text,
    occupation text,
    location text,
    pain_points text[] DEFAULT '{}'::text[],
    desires text[] DEFAULT '{}'::text[],
    objections text[] DEFAULT '{}'::text[],
    "values" text[] DEFAULT '{}'::text[],
    interests text[] DEFAULT '{}'::text[],
    buying_triggers text[] DEFAULT '{}'::text[],
    information_sources text[] DEFAULT '{}'::text[],
    preferred_channels text[] DEFAULT '{}'::text[],
    typical_funnel_stage text,
    communication_style text,
    response_tone_hints text[],
    content_preferences jsonb DEFAULT '{}'::jsonb,
    persona_prompt_hints text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    education_level text,
    family_status text,
    device_usage text DEFAULT 'mobile-first'::text,
    tech_savviness text DEFAULT 'medium'::text,
    buying_motivation text[] DEFAULT '{}'::text[],
    priority_score integer DEFAULT 3,
    segment_size numeric(5,2),
    journey_map jsonb DEFAULT '[]'::jsonb,
    avatar_url text,
    color_theme text,
    data_source text,
    confidence_level text DEFAULT 'medium'::text,
    last_researched_date date,
    country_variants jsonb DEFAULT '{}'::jsonb
);


--
-- Name: industry_personas_v2; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.industry_personas_v2 (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    global_pack_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    avatar_url text,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    age_range text,
    gender text,
    income_level text,
    education_level text,
    occupation text,
    location_type text,
    family_status text,
    "values" text[],
    interests text[],
    lifestyle text,
    personality_traits text[],
    buying_motivation text[],
    decision_factors text[],
    price_sensitivity text,
    purchase_frequency text,
    preferred_channels text[],
    device_usage jsonb DEFAULT '{}'::jsonb,
    tech_savviness text,
    social_platforms text[],
    content_consumption text[],
    communication_style text,
    response_tone_hints text[],
    content_preferences jsonb DEFAULT '{}'::jsonb,
    journey_stages jsonb DEFAULT '[]'::jsonb,
    pain_points text[],
    goals text[],
    objections text[],
    country_variants jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid
);


--
-- Name: TABLE industry_personas_v2; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.industry_personas_v2 IS 'Industry Park v2.1: Target personas linked to global packs instead of legacy industry_template_id';


--
-- Name: COLUMN industry_personas_v2.journey_stages; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.industry_personas_v2.journey_stages IS 'Customer journey stages as JSONB array: [{"stage": "Awareness", "touchpoints": [...], "emotions": [...]}]';


--
-- Name: COLUMN industry_personas_v2.country_variants; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.industry_personas_v2.country_variants IS 'JSONB object with jurisdiction-specific overrides, e.g. {"VN": {"income_level": "Medium"}, "US": {"income_level": "High"}}';


--
-- Name: industry_search_aliases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.industry_search_aliases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pack_id uuid NOT NULL,
    alias text NOT NULL,
    language_code text DEFAULT 'vi'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: insight_analytics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.insight_analytics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    organization_id uuid,
    insight_id text NOT NULL,
    insight_type text NOT NULL,
    action_type text NOT NULL,
    time_spent_ms integer,
    action_href text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: internal_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.internal_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    source_content_id uuid NOT NULL,
    target_content_id uuid NOT NULL,
    anchor_text text NOT NULL,
    url text NOT NULL,
    similarity numeric,
    status text DEFAULT 'approved'::text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: journey_stage_messaging; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.journey_stage_messaging (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    mapping_id uuid NOT NULL,
    journey_stage text NOT NULL,
    headline text,
    hook text,
    key_message text,
    pain_points_focus text[] DEFAULT '{}'::text[],
    benefits_highlight text[] DEFAULT '{}'::text[],
    cta_template text,
    emotional_tone text,
    objection_response text,
    content_types text[] DEFAULT '{}'::text[],
    avoid_messages text[] DEFAULT '{}'::text[],
    organization_id uuid,
    user_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT journey_stage_messaging_emotional_tone_check CHECK (((emotional_tone IS NULL) OR (emotional_tone = ANY (ARRAY['curiosity'::text, 'urgency'::text, 'trust'::text, 'delight'::text, 'empathy'::text, 'authority'::text])))),
    CONSTRAINT journey_stage_messaging_journey_stage_check CHECK ((journey_stage = ANY (ARRAY['awareness'::text, 'consideration'::text, 'decision'::text, 'loyalty'::text])))
);


--
-- Name: keyword_enrichment_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.keyword_enrichment_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    status text DEFAULT 'queued'::text NOT NULL,
    total integer DEFAULT 0 NOT NULL,
    done integer DEFAULT 0 NOT NULL,
    errors jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    keyword_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    CONSTRAINT keyword_enrichment_jobs_status_check CHECK ((status = ANY (ARRAY['queued'::text, 'running'::text, 'done'::text, 'failed'::text])))
);


--
-- Name: COLUMN keyword_enrichment_jobs.keyword_ids; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.keyword_enrichment_jobs.keyword_ids IS 'Danh sách keyword IDs được enrich trong job này (để tra cứu chính xác success/failed)';


--
-- Name: keyword_research_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.keyword_research_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    seed_keyword text NOT NULL,
    mode text DEFAULT 'expand'::text NOT NULL,
    status text DEFAULT 'queued'::text NOT NULL,
    result jsonb DEFAULT '{}'::jsonb,
    keywords_added integer DEFAULT 0 NOT NULL,
    ai_model text,
    cost_usd numeric(10,4) DEFAULT 0,
    error_message text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    seeds jsonb,
    competitor_urls jsonb,
    preset text,
    serp_grounding jsonb,
    preview jsonb,
    selected_count integer DEFAULT 0,
    auto_enrich boolean DEFAULT true,
    enrich_job_id uuid,
    CONSTRAINT keyword_research_jobs_mode_check CHECK ((mode = ANY (ARRAY['expand'::text, 'cluster'::text, 'gap_analysis'::text, 'serp_scan'::text, 'preview'::text, 'deep'::text]))),
    CONSTRAINT keyword_research_jobs_status_check CHECK ((status = ANY (ARRAY['queued'::text, 'running'::text, 'done'::text, 'failed'::text])))
);


--
-- Name: knowledge_graph_analytics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.knowledge_graph_analytics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    query_type text NOT NULL,
    query_params jsonb DEFAULT '{}'::jsonb,
    result_count integer DEFAULT 0,
    duration_ms integer DEFAULT 0,
    user_id uuid,
    organization_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT knowledge_graph_analytics_query_type_check CHECK ((query_type = ANY (ARRAY['search'::text, 'traverse'::text, 'connected'::text, 'related'::text, 'regulations'::text])))
);


--
-- Name: knowledge_graph_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.knowledge_graph_cache (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cache_key text NOT NULL,
    start_node_id uuid,
    traversal_result jsonb NOT NULL,
    hit_count integer DEFAULT 0,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: kpi_adjustment_dismissals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kpi_adjustment_dismissals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    metric text NOT NULL,
    dismissed_at timestamp with time zone DEFAULT now() NOT NULL,
    dismissed_until timestamp with time zone NOT NULL,
    user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: marketing_calendar; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketing_calendar (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_name text NOT NULL,
    event_name_vi text,
    event_type text NOT NULL,
    start_date date NOT NULL,
    end_date date,
    country_code text DEFAULT 'VN'::text,
    industries text[] DEFAULT '{}'::text[],
    suggested_themes text[] DEFAULT '{}'::text[],
    suggested_keywords text[] DEFAULT '{}'::text[],
    urgency_level integer DEFAULT 1,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT marketing_calendar_event_type_check CHECK ((event_type = ANY (ARRAY['holiday'::text, 'shopping'::text, 'industry'::text, 'trending'::text]))),
    CONSTRAINT marketing_calendar_urgency_level_check CHECK (((urgency_level >= 1) AND (urgency_level <= 5)))
);


--
-- Name: multi_channel_contents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.multi_channel_contents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    topic text NOT NULL,
    industry text,
    content_goal text NOT NULL,
    selected_channels text[] NOT NULL,
    brand_template_id uuid,
    brand_name text NOT NULL,
    brand_guideline text,
    primary_color text,
    website_content text,
    facebook_content text,
    instagram_content text,
    twitter_content text,
    google_maps_content text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    linkedin_content text,
    email_content text,
    youtube_content text,
    zalo_oa_content text,
    telegram_content text,
    channel_images jsonb DEFAULT '{}'::jsonb,
    tags text[] DEFAULT '{}'::text[],
    status text DEFAULT 'draft'::text,
    user_id uuid,
    organization_id uuid,
    channel_statuses jsonb DEFAULT '{}'::jsonb,
    content_calendar_color text,
    priority text DEFAULT 'normal'::text,
    deadline timestamp with time zone,
    tiktok_content text,
    threads_content text,
    industry_template_version text,
    brand_voice_variant_id uuid,
    critique_score integer,
    critique_details jsonb,
    was_refined boolean DEFAULT false,
    refinement_count integer DEFAULT 0,
    needs_manual_review boolean DEFAULT false,
    website_seo_data jsonb,
    selected_hooks jsonb DEFAULT '[]'::jsonb,
    global_hook jsonb,
    hook_evaluations jsonb,
    core_content_id uuid,
    content_role text,
    pinterest_content text,
    pinterest_title text,
    pinterest_pin_type text,
    pinterest_post_url text,
    pinterest_post_id text,
    bluesky_content text,
    bluesky_post_id text,
    bluesky_post_url text,
    blogger_content text,
    wordpress_content text,
    target_keyword_ids uuid[] DEFAULT '{}'::uuid[],
    content_embedding extensions.vector(384),
    cluster_id uuid,
    website_post_url text,
    website_post_id text,
    blogger_post_url text,
    blogger_post_id text,
    wordpress_post_url text,
    wordpress_post_id text,
    flowa_blog_post_url text,
    flowa_blog_post_id text,
    wordpress_seo_data jsonb,
    blogger_seo_data jsonb,
    shopify_content text,
    shopify_post_url text,
    shopify_post_id text,
    shopify_seo_data jsonb,
    wix_content text,
    wix_post_id text,
    wix_post_url text,
    wix_seo_data jsonb,
    medium_content text,
    medium_post_id text,
    medium_post_url text,
    medium_seo_data jsonb,
    CONSTRAINT mcc_pinterest_pin_type_check CHECK (((pinterest_pin_type IS NULL) OR (pinterest_pin_type = ANY (ARRAY['auto'::text, 'image'::text, 'carousel'::text, 'video'::text, 'idea'::text])))),
    CONSTRAINT multi_channel_contents_content_role_check CHECK ((content_role = ANY (ARRAY['seed'::text, 'sprout'::text, 'harvest'::text]))),
    CONSTRAINT multi_channel_contents_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text])))
);


--
-- Name: COLUMN multi_channel_contents.channel_statuses; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.multi_channel_contents.channel_statuses IS 'Stores individual status for each channel. Example: {"facebook": "published", "instagram": "review"}';


--
-- Name: COLUMN multi_channel_contents.critique_score; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.multi_channel_contents.critique_score IS 'Self-critique quality score 0-100';


--
-- Name: COLUMN multi_channel_contents.critique_details; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.multi_channel_contents.critique_details IS 'Full critique result including scores, issues, suggestions';


--
-- Name: COLUMN multi_channel_contents.was_refined; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.multi_channel_contents.was_refined IS 'Whether content was auto-refined after initial generation';


--
-- Name: COLUMN multi_channel_contents.refinement_count; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.multi_channel_contents.refinement_count IS 'Number of refinement iterations performed';


--
-- Name: COLUMN multi_channel_contents.website_seo_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.multi_channel_contents.website_seo_data IS 'Structured SEO data for website content including seo_title, meta_description, focus_keyword, heading_structure, featured_snippet, etc.';


--
-- Name: COLUMN multi_channel_contents.selected_hooks; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.multi_channel_contents.selected_hooks IS 'Array of selected hooks per channel: [{channel, opening_line, hook_type, psychology}]';


--
-- Name: COLUMN multi_channel_contents.global_hook; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.multi_channel_contents.global_hook IS 'Global hook applied to all channels if set';


--
-- Name: COLUMN multi_channel_contents.hook_evaluations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.multi_channel_contents.hook_evaluations IS 'Hook evaluation results from AI Hook Evaluator per channel. Structure: { channel: { combined_score, regex_score, ai_score, issues, strengths } }';


--
-- Name: COLUMN multi_channel_contents.core_content_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.multi_channel_contents.core_content_id IS 'Link to parent core content. When not null, this content was derived/transformed from a core content source';


--
-- Name: COLUMN multi_channel_contents.content_role; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.multi_channel_contents.content_role IS 'Content role in orchestration flow: seed (awareness), sprout (trust building), harvest (conversion)';


--
-- Name: mv_resolved_compliance_rules; Type: MATERIALIZED VIEW; Schema: public; Owner: -
--

CREATE MATERIALIZED VIEW public.mv_resolved_compliance_rules AS
 SELECT ijp.id AS jurisdiction_profile_id,
    ijp.global_pack_id,
    igp.industry_code,
    ijp.jurisdiction_code,
    ijp.validity_status,
    ijp.disclaimer,
    ijp.resolved_rules,
    ((ijp.resolved_rules -> 'terminology'::text) -> 'forbidden_terms'::text) AS forbidden_terms,
    ((ijp.resolved_rules -> 'terminology'::text) -> 'forbidden_words_local'::text) AS forbidden_words_local,
    (ijp.resolved_rules -> 'compliance_rules'::text) AS compliance_rules,
    (ijp.resolved_rules -> 'claim_restrictions'::text) AS claim_restrictions,
    (ijp.resolved_rules -> 'tone_guidelines'::text) AS tone_guidelines,
    ijp.updated_at
   FROM (public.industry_jurisdiction_profiles ijp
     JOIN public.industry_global_packs igp ON ((igp.id = ijp.global_pack_id)))
  WHERE (igp.is_active = true)
  WITH NO DATA;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    organization_id uuid,
    type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    data jsonb DEFAULT '{}'::jsonb,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: oauth_pending_states; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.oauth_pending_states (
    state text NOT NULL,
    user_id uuid NOT NULL,
    platform text NOT NULL,
    brand_template_id uuid,
    organization_id uuid,
    pkce_verifier text NOT NULL,
    dpop_private_jwk jsonb NOT NULL,
    pds_url text NOT NULL,
    authz_issuer text NOT NULL,
    token_endpoint text NOT NULL,
    par_endpoint text,
    authorization_endpoint text,
    handle text,
    did text,
    dpop_nonce text,
    expires_at timestamp with time zone DEFAULT (now() + '00:10:00'::interval) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: orchestrator_daily_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orchestrator_daily_stats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    date date NOT NULL,
    organization_id uuid NOT NULL,
    total_pipelines integer DEFAULT 0 NOT NULL,
    completed integer DEFAULT 0 NOT NULL,
    failed integer DEFAULT 0 NOT NULL,
    avg_duration_ms integer,
    avg_quality_score numeric(5,2) DEFAULT NULL::numeric,
    stage_bottleneck text,
    fast_path_hit_rate numeric(5,2) DEFAULT NULL::numeric,
    top_failure_reason text,
    recovery_count integer DEFAULT 0 NOT NULL,
    concurrent_peak integer DEFAULT 0 NOT NULL,
    stage_durations jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: organization_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organization_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role public.org_role DEFAULT 'member'::public.org_role NOT NULL,
    invited_by uuid,
    invited_at timestamp with time zone DEFAULT now(),
    joined_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: organizations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organizations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    logo_url text,
    primary_color text DEFAULT '#000000'::text,
    owner_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    skip_approval boolean DEFAULT false,
    approver_roles text[] DEFAULT ARRAY['owner'::text, 'admin'::text],
    use_specific_approvers boolean DEFAULT false,
    auto_submit_review boolean DEFAULT false,
    last_used_industry_pack_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    default_autonomy_level text DEFAULT 'full_auto'::text NOT NULL,
    CONSTRAINT organizations_default_autonomy_level_check CHECK ((default_autonomy_level = ANY (ARRAY['human_in_loop'::text, 'human_on_loop'::text, 'full_auto'::text])))
);


--
-- Name: COLUMN organizations.auto_submit_review; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.organizations.auto_submit_review IS 'When true, newly created content will automatically be set to review status';


--
-- Name: payment_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    user_id uuid NOT NULL,
    plan_type text NOT NULL,
    billing_cycle text DEFAULT 'monthly'::text NOT NULL,
    amount bigint NOT NULL,
    currency text DEFAULT 'VND'::text NOT NULL,
    vnpay_txn_ref text,
    status text DEFAULT 'pending'::text NOT NULL,
    vnpay_response jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    metadata jsonb,
    payment_provider text DEFAULT 'vnpay'::text NOT NULL
);


--
-- Name: pinterest_boards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pinterest_boards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    connection_id uuid NOT NULL,
    organization_id uuid,
    board_id text NOT NULL,
    name text NOT NULL,
    description text,
    privacy text,
    pin_count integer DEFAULT 0,
    follower_count integer DEFAULT 0,
    cover_image_url text,
    is_default boolean DEFAULT false,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: pinterest_oauth_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pinterest_oauth_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    organization_id uuid,
    brand_template_id uuid,
    state text NOT NULL,
    code_verifier text NOT NULL,
    frontend_origin text,
    expires_at timestamp with time zone DEFAULT (now() + '00:10:00'::interval) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: plan_limits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plan_limits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_type public.plan_type NOT NULL,
    monthly_scripts integer DEFAULT 10 NOT NULL,
    monthly_carousels integer DEFAULT 10 NOT NULL,
    monthly_multichannel integer DEFAULT 10 NOT NULL,
    monthly_images integer DEFAULT 50 NOT NULL,
    monthly_ai_edits integer DEFAULT 20 NOT NULL,
    price_monthly numeric(10,2) DEFAULT 0 NOT NULL,
    price_yearly numeric(10,2) DEFAULT 0 NOT NULL,
    features jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    monthly_brands integer DEFAULT 1 NOT NULL,
    monthly_content_units integer DEFAULT 0 NOT NULL,
    monthly_image_units integer DEFAULT 0 NOT NULL,
    monthly_video_units integer DEFAULT 0 NOT NULL
);


--
-- Name: plan_unit_costs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plan_unit_costs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    unit_type text NOT NULL,
    cost_usd numeric(10,4) DEFAULT 0 NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT plan_unit_costs_unit_type_check CHECK ((unit_type = ANY (ARRAY['content'::text, 'image'::text, 'video'::text])))
);


--
-- Name: planned_content_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.planned_content_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    topic text NOT NULL,
    format text NOT NULL,
    channels text[] DEFAULT ARRAY[]::text[],
    scheduled_date date,
    scheduled_time time without time zone,
    priority text DEFAULT 'medium'::text,
    reasoning text,
    category text,
    pillar text,
    ai_confidence real,
    status text DEFAULT 'planned'::text,
    content_id uuid,
    content_type text,
    is_user_modified boolean DEFAULT false,
    original_suggestion jsonb,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: planning_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.planning_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    organization_id uuid,
    brand_template_id uuid,
    conversation_id uuid,
    session_type text DEFAULT 'weekly'::text NOT NULL,
    title text,
    goal text,
    timeframe_start date,
    timeframe_end date,
    target_channels text[] DEFAULT ARRAY[]::text[],
    constraints jsonb DEFAULT '{}'::jsonb,
    status text DEFAULT 'draft'::text NOT NULL,
    current_plan jsonb DEFAULT '{}'::jsonb,
    plan_versions jsonb DEFAULT '[]'::jsonb,
    total_topics integer DEFAULT 0,
    total_content_pieces integer DEFAULT 0,
    ai_suggestions jsonb DEFAULT '{}'::jsonb,
    user_feedback_history jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    finalized_at timestamp with time zone
);


--
-- Name: product_persona_mappings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_persona_mappings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    persona_id uuid NOT NULL,
    brand_template_id uuid NOT NULL,
    relevance_score integer DEFAULT 80,
    is_primary_product boolean DEFAULT false,
    custom_pitch text,
    key_benefits text[] DEFAULT '{}'::text[],
    objection_handlers text[] DEFAULT '{}'::text[],
    preferred_content_angles text[] DEFAULT '{}'::text[],
    avoid_topics text[] DEFAULT '{}'::text[],
    organization_id uuid,
    user_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text NOT NULL,
    full_name text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: prompt_analytics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prompt_analytics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    function_name text NOT NULL,
    content_id uuid,
    brand_template_id uuid,
    organization_id uuid,
    context_richness_score integer,
    learning_data_score integer,
    execution_time_ms integer,
    token_count integer,
    model_used text DEFAULT 'google/gemini-2.5-flash'::text,
    output_accepted boolean DEFAULT true,
    user_edited boolean DEFAULT false,
    edit_percentage real,
    performance_score integer,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT prompt_analytics_context_richness_score_check CHECK (((context_richness_score >= 0) AND (context_richness_score <= 100))),
    CONSTRAINT prompt_analytics_edit_percentage_check CHECK (((edit_percentage >= (0)::double precision) AND (edit_percentage <= (100)::double precision))),
    CONSTRAINT prompt_analytics_learning_data_score_check CHECK (((learning_data_score >= 0) AND (learning_data_score <= 100))),
    CONSTRAINT prompt_analytics_performance_score_check CHECK (((performance_score >= 0) AND (performance_score <= 100)))
);


--
-- Name: TABLE prompt_analytics; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.prompt_analytics IS 'Tracks AI prompt performance for continuous improvement';


--
-- Name: publish_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.publish_attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    schedule_id uuid,
    content_id uuid,
    connection_id uuid,
    organization_id uuid,
    platform text NOT NULL,
    channel text NOT NULL,
    status text DEFAULT 'pending'::text,
    external_post_id text,
    external_post_url text,
    error_code text,
    error_message text,
    retry_count integer DEFAULT 0,
    request_payload jsonb,
    response_payload jsonb,
    attempted_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT publish_attempts_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'success'::text, 'failed'::text, 'rate_limited'::text, 'cancelled'::text])))
);


--
-- Name: regulation_crawl_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.regulation_crawl_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_id uuid,
    crawl_started_at timestamp with time zone DEFAULT now(),
    crawl_completed_at timestamp with time zone,
    status text DEFAULT 'running'::text,
    results_count integer DEFAULT 0,
    changes_detected integer DEFAULT 0,
    new_regulations integer DEFAULT 0,
    updated_regulations integer DEFAULT 0,
    error_message text,
    crawl_data jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT regulation_crawl_history_status_check CHECK ((status = ANY (ARRAY['running'::text, 'completed'::text, 'failed'::text, 'cancelled'::text])))
);


--
-- Name: regulation_propagation_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.regulation_propagation_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_node_id uuid,
    affected_pack_id uuid,
    change_type text NOT NULL,
    change_summary text,
    impact_analysis jsonb DEFAULT '{}'::jsonb,
    affected_rules jsonb DEFAULT '[]'::jsonb,
    propagation_status text DEFAULT 'pending'::text,
    priority text DEFAULT 'medium'::text,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    review_notes text,
    propagated_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    review_status text DEFAULT 'pending'::text,
    document_diff jsonb,
    ai_confidence_score numeric(3,2),
    CONSTRAINT regulation_propagation_log_change_type_check CHECK ((change_type = ANY (ARRAY['new'::text, 'updated'::text, 'deprecated'::text, 'enforcement_change'::text]))),
    CONSTRAINT regulation_propagation_log_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text]))),
    CONSTRAINT regulation_propagation_log_propagation_status_check CHECK ((propagation_status = ANY (ARRAY['pending'::text, 'analyzing'::text, 'ready'::text, 'applied'::text, 'reviewed'::text, 'rejected'::text]))),
    CONSTRAINT regulation_propagation_log_review_status_check CHECK ((review_status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'needs_revision'::text])))
);


--
-- Name: COLUMN regulation_propagation_log.reviewed_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.regulation_propagation_log.reviewed_by IS 'UUID of admin who reviewed this propagation';


--
-- Name: COLUMN regulation_propagation_log.reviewed_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.regulation_propagation_log.reviewed_at IS 'Timestamp when review was completed';


--
-- Name: COLUMN regulation_propagation_log.review_notes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.regulation_propagation_log.review_notes IS 'Notes from admin during review process';


--
-- Name: COLUMN regulation_propagation_log.review_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.regulation_propagation_log.review_status IS 'Admin review status: pending, approved, rejected, needs_revision';


--
-- Name: COLUMN regulation_propagation_log.document_diff; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.regulation_propagation_log.document_diff IS 'JSON diff between old and new document content';


--
-- Name: COLUMN regulation_propagation_log.ai_confidence_score; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.regulation_propagation_log.ai_confidence_score IS 'AI confidence score for extracted data (0.00-1.00)';


--
-- Name: regulation_sources; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.regulation_sources (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_name text NOT NULL,
    source_url text NOT NULL,
    jurisdiction text NOT NULL,
    category text NOT NULL,
    search_query text,
    crawl_frequency text DEFAULT 'weekly'::text,
    last_crawled_at timestamp with time zone,
    next_crawl_at timestamp with time zone,
    is_active boolean DEFAULT true,
    properties jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    target_industry_category_ids uuid[] DEFAULT '{}'::uuid[],
    target_industry_pack_ids uuid[] DEFAULT '{}'::uuid[],
    CONSTRAINT regulation_sources_crawl_frequency_check CHECK ((crawl_frequency = ANY (ARRAY['daily'::text, 'weekly'::text, 'monthly'::text])))
);


--
-- Name: COLUMN regulation_sources.target_industry_category_ids; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.regulation_sources.target_industry_category_ids IS 'Array of industry_categories IDs that regulations from this source should be linked to';


--
-- Name: COLUMN regulation_sources.target_industry_pack_ids; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.regulation_sources.target_industry_pack_ids IS 'Array of specific industry_global_packs IDs for fine-grained targeting (optional)';


--
-- Name: regulation_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.regulation_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    node_id uuid NOT NULL,
    version_number integer DEFAULT 1 NOT NULL,
    full_text text NOT NULL,
    content_hash text NOT NULL,
    effective_date date,
    previous_version_id uuid,
    diff_summary text,
    changed_articles text[],
    content_quality_score smallint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT regulation_versions_content_quality_score_check CHECK (((content_quality_score >= 0) AND (content_quality_score <= 100)))
);


--
-- Name: report_sync_state; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_sync_state (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    connection_id uuid,
    platform text NOT NULL,
    last_synced_at timestamp with time zone,
    last_status text DEFAULT 'pending'::text NOT NULL,
    error_message text,
    posts_synced integer DEFAULT 0 NOT NULL,
    consecutive_failures integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT report_sync_state_status_check CHECK ((last_status = ANY (ARRAY['pending'::text, 'success'::text, 'failed'::text, 'skipped'::text, 'partial'::text])))
);


--
-- Name: sales_chat_analytics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales_chat_analytics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id text NOT NULL,
    visitor_id text,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    ended_at timestamp with time zone,
    message_count integer DEFAULT 0,
    user_message_count integer DEFAULT 0,
    assistant_message_count integer DEFAULT 0,
    detected_intent text,
    intent_confidence numeric(3,2),
    cta_clicked text[],
    converted boolean DEFAULT false,
    conversion_action text,
    overall_sentiment text,
    sentiment_score numeric(3,2),
    questions_asked text[],
    topics_discussed text[],
    objections text[],
    objections_handled boolean DEFAULT false,
    thumbs_up_count integer DEFAULT 0,
    thumbs_down_count integer DEFAULT 0,
    user_agent text,
    referrer text,
    page_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sales_chat_leads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales_chat_leads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id text NOT NULL,
    visitor_id text NOT NULL,
    name text,
    email text,
    phone text,
    interest_level text DEFAULT 'medium'::text,
    interested_features text[],
    notes text,
    conversation_summary text,
    source_url text,
    handoff_requested boolean DEFAULT false,
    handoff_platform text,
    status text DEFAULT 'new'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: sales_chat_messages_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales_chat_messages_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id text NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    intent_category text,
    topic text,
    sentiment text,
    reactions text[],
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: saved_audiences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.saved_audiences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    brand_template_id uuid,
    name text NOT NULL,
    description text,
    age_min integer,
    age_max integer,
    genders text[] DEFAULT '{}'::text[],
    locations text[] DEFAULT '{}'::text[],
    languages text[] DEFAULT ARRAY['vi'::text],
    interests text[] DEFAULT '{}'::text[],
    behaviors text[] DEFAULT '{}'::text[],
    life_events text[] DEFAULT '{}'::text[],
    income_levels text[] DEFAULT '{}'::text[],
    education_levels text[] DEFAULT '{}'::text[],
    relationship_statuses text[] DEFAULT '{}'::text[],
    device_types text[] DEFAULT '{}'::text[],
    exclude_interests text[] DEFAULT '{}'::text[],
    exclude_behaviors text[] DEFAULT '{}'::text[],
    lookalike_source text,
    lookalike_percentage integer,
    source_persona_id uuid,
    estimated_reach_min integer,
    estimated_reach_max integer,
    last_reach_check timestamp with time zone,
    usage_count integer DEFAULT 0,
    is_favorite boolean DEFAULT false,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT saved_audiences_age_max_check CHECK (((age_max >= 13) AND (age_max <= 100))),
    CONSTRAINT saved_audiences_age_min_check CHECK (((age_min >= 13) AND (age_min <= 65))),
    CONSTRAINT saved_audiences_lookalike_percentage_check CHECK (((lookalike_percentage >= 1) AND (lookalike_percentage <= 10)))
);


--
-- Name: script_approvals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.script_approvals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    script_id uuid NOT NULL,
    requested_by uuid NOT NULL,
    requested_at timestamp with time zone DEFAULT now() NOT NULL,
    reviewer_id uuid,
    reviewed_at timestamp with time zone,
    status public.script_status DEFAULT 'pending_approval'::public.script_status,
    notes text,
    version_at_request integer NOT NULL,
    organization_id uuid
);


--
-- Name: script_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.script_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    script_id uuid NOT NULL,
    version integer NOT NULL,
    content text NOT NULL,
    topic text,
    duration integer,
    video_type text,
    character_type text,
    storyboard jsonb,
    analysis_cache jsonb,
    change_summary text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: scripts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scripts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    topic text NOT NULL,
    duration integer DEFAULT 60 NOT NULL,
    video_type text DEFAULT 'expert_share'::text NOT NULL,
    character_type text DEFAULT 'male_expert'::text NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    user_id uuid,
    organization_id uuid,
    status text DEFAULT 'draft'::text,
    industry_template_id uuid,
    industry_template_version text,
    script_purpose text DEFAULT 'ai_video_veo3'::text NOT NULL,
    voice_region text DEFAULT 'northern'::text,
    dialogue_style text DEFAULT 'monologue'::text,
    brand_template_id uuid,
    brand_voice_variant_id uuid,
    critique_score integer,
    critique_details jsonb,
    was_refined boolean DEFAULT false,
    refinement_count integer DEFAULT 0,
    needs_manual_review boolean DEFAULT false,
    campaign_id uuid,
    analysis_cache jsonb,
    analyzed_at timestamp with time zone,
    version integer DEFAULT 1,
    shared_with_org boolean DEFAULT false,
    approved_by uuid,
    approved_at timestamp with time zone,
    rejection_reason text
);


--
-- Name: COLUMN scripts.script_purpose; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.scripts.script_purpose IS 'Purpose of the script: ai_video_veo3, ai_video_minimax, teleprompter, voiceover, production';


--
-- Name: COLUMN scripts.voice_region; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.scripts.voice_region IS 'Voice region: northern, central, southern';


--
-- Name: COLUMN scripts.dialogue_style; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.scripts.dialogue_style IS 'Dialogue style: monologue, conversational, internal, narrative';


--
-- Name: COLUMN scripts.brand_template_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.scripts.brand_template_id IS 'Reference to the brand template used for this script';


--
-- Name: COLUMN scripts.critique_score; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.scripts.critique_score IS 'Self-critique quality score 0-100';


--
-- Name: COLUMN scripts.critique_details; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.scripts.critique_details IS 'Full critique result including scores, issues, suggestions';


--
-- Name: COLUMN scripts.was_refined; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.scripts.was_refined IS 'Whether content was auto-refined after initial generation';


--
-- Name: COLUMN scripts.refinement_count; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.scripts.refinement_count IS 'Number of refinement iterations performed';


--
-- Name: COLUMN scripts.analysis_cache; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.scripts.analysis_cache IS 'Cached script analysis results from analyze-script function (hookScore, clarityScore, viralPotential, etc.)';


--
-- Name: COLUMN scripts.analyzed_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.scripts.analyzed_at IS 'Timestamp when the script was last analyzed';


--
-- Name: security_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.security_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    organization_id uuid,
    event_type text DEFAULT 'prompt_injection_attempt'::text NOT NULL,
    risk_level text DEFAULT 'low'::text NOT NULL,
    flagged_patterns text[] DEFAULT '{}'::text[],
    original_length integer,
    was_truncated boolean DEFAULT false,
    details jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: seo_clusters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seo_clusters (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    pillar_keyword_id uuid,
    pillar_content_id uuid,
    color text DEFAULT '#6B7280'::text,
    status text DEFAULT 'planning'::text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT seo_clusters_status_check CHECK ((status = ANY (ARRAY['planning'::text, 'active'::text, 'completed'::text, 'archived'::text])))
);


--
-- Name: seo_keywords; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seo_keywords (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    keyword text NOT NULL,
    locale text DEFAULT 'vi'::text NOT NULL,
    search_volume integer DEFAULT 0,
    difficulty integer DEFAULT 50,
    cpc_vnd numeric(12,2) DEFAULT 0,
    intent text DEFAULT 'informational'::text NOT NULL,
    funnel_stage text DEFAULT 'TOFU'::text NOT NULL,
    serp_features jsonb DEFAULT '[]'::jsonb,
    top_competitors jsonb DEFAULT '[]'::jsonb,
    content_gap_score integer DEFAULT 0,
    priority_score integer DEFAULT 0,
    cluster_id uuid,
    status text DEFAULT 'new'::text NOT NULL,
    assigned_landing_page_id uuid,
    current_rank integer,
    last_checked_at timestamp with time zone,
    source text DEFAULT 'manual'::text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    previous_rank integer,
    rank_change integer,
    tracking_url text,
    CONSTRAINT seo_keywords_content_gap_score_check CHECK (((content_gap_score >= 0) AND (content_gap_score <= 100))),
    CONSTRAINT seo_keywords_difficulty_check CHECK (((difficulty >= 0) AND (difficulty <= 100))),
    CONSTRAINT seo_keywords_funnel_stage_check CHECK ((funnel_stage = ANY (ARRAY['TOFU'::text, 'MOFU'::text, 'BOFU'::text]))),
    CONSTRAINT seo_keywords_intent_check CHECK ((intent = ANY (ARRAY['informational'::text, 'commercial'::text, 'transactional'::text, 'navigational'::text]))),
    CONSTRAINT seo_keywords_priority_score_check CHECK (((priority_score >= 0) AND (priority_score <= 100))),
    CONSTRAINT seo_keywords_source_check CHECK ((source = ANY (ARRAY['manual'::text, 'ai_suggested'::text, 'gsc_import'::text, 'competitor_scrape'::text, 'csv_import'::text]))),
    CONSTRAINT seo_keywords_status_check CHECK ((status = ANY (ARRAY['new'::text, 'researching'::text, 'planned'::text, 'assigned'::text, 'published'::text, 'tracking'::text, 'archived'::text])))
);


--
-- Name: seo_landing_pages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seo_landing_pages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    page_type text NOT NULL,
    locale text DEFAULT 'vi'::text NOT NULL,
    title text NOT NULL,
    meta_description text NOT NULL,
    h1 text NOT NULL,
    keywords text[],
    intro_html text,
    tldr jsonb,
    sections jsonb DEFAULT '[]'::jsonb,
    faqs jsonb DEFAULT '[]'::jsonb,
    key_stats jsonb DEFAULT '[]'::jsonb,
    comparison_table jsonb,
    cta_label text DEFAULT 'Dùng thử miễn phí'::text,
    cta_url text DEFAULT '/auth?mode=signup'::text,
    related_slugs text[] DEFAULT ARRAY[]::text[],
    industry_id uuid,
    competitor_name text,
    feature_key text,
    hero_image text,
    og_image text,
    is_published boolean DEFAULT false NOT NULL,
    published_at timestamp with time zone,
    last_seo_score integer,
    ai_generated boolean DEFAULT false,
    generation_prompt_version text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    CONSTRAINT seo_landing_pages_page_type_check CHECK ((page_type = ANY (ARRAY['industry'::text, 'comparison'::text, 'use_case'::text, 'feature'::text, 'tool'::text])))
);


--
-- Name: seo_rank_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seo_rank_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    keyword_id uuid NOT NULL,
    rank integer,
    serp_url text,
    serp_features jsonb DEFAULT '[]'::jsonb,
    checked_at timestamp with time zone DEFAULT now() NOT NULL,
    source text DEFAULT 'serper'::text
);


--
-- Name: seo_rank_tracker_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seo_rank_tracker_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    triggered_by text DEFAULT 'cron'::text NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    finished_at timestamp with time zone,
    checked integer DEFAULT 0 NOT NULL,
    found integer DEFAULT 0 NOT NULL,
    errors jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: seo_serp_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seo_serp_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    keyword_id uuid NOT NULL,
    snapshot_at timestamp with time zone DEFAULT now() NOT NULL,
    top_results jsonb NOT NULL,
    median_word_count integer,
    common_h2s text[],
    schema_types text[],
    source text DEFAULT 'firecrawl'::text NOT NULL,
    raw jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: social_connections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.social_connections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    user_id uuid NOT NULL,
    platform text NOT NULL,
    platform_user_id text,
    platform_username text,
    platform_display_name text,
    platform_avatar_url text,
    access_token text NOT NULL,
    refresh_token text,
    token_expires_at timestamp with time zone,
    scopes text[] DEFAULT '{}'::text[],
    page_id text,
    page_name text,
    is_active boolean DEFAULT true,
    connected_at timestamp with time zone DEFAULT now(),
    last_used_at timestamp with time zone,
    last_error text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    brand_template_id uuid,
    last_verified_at timestamp with time zone,
    ad_account_id text,
    ad_account_name text,
    business_id text,
    app_id text,
    connection_type text DEFAULT 'social'::text,
    consumer_key text,
    consumer_secret text,
    is_sandbox boolean DEFAULT false NOT NULL,
    CONSTRAINT social_connections_platform_check CHECK ((platform = ANY (ARRAY['twitter'::text, 'facebook'::text, 'instagram'::text, 'linkedin'::text, 'tiktok'::text, 'threads'::text, 'youtube'::text, 'zalo_oa'::text, 'google_business'::text, 'website'::text, 'blogger'::text, 'wordpress'::text, 'wordpress_com'::text, 'pinterest'::text, 'bluesky'::text])))
);


--
-- Name: social_platform_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.social_platform_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    platform text NOT NULL,
    app_name text,
    consumer_key text,
    consumer_secret text,
    is_active boolean DEFAULT true,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: social_post_engagements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.social_post_engagements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    brand_template_id uuid,
    connection_id uuid,
    platform text DEFAULT 'facebook'::text NOT NULL,
    post_id text NOT NULL,
    event_type text NOT NULL,
    event_data jsonb DEFAULT '{}'::jsonb,
    sender_id text,
    sender_name text,
    facebook_event_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: social_post_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.social_post_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    brand_template_id uuid,
    connection_id uuid,
    content_id uuid,
    platform text NOT NULL,
    post_id text NOT NULL,
    snapshot_at timestamp with time zone DEFAULT now() NOT NULL,
    reach integer DEFAULT 0 NOT NULL,
    impressions integer DEFAULT 0 NOT NULL,
    likes integer DEFAULT 0 NOT NULL,
    comments integer DEFAULT 0 NOT NULL,
    shares integer DEFAULT 0 NOT NULL,
    saves integer DEFAULT 0 NOT NULL,
    video_views integer DEFAULT 0 NOT NULL,
    link_clicks integer DEFAULT 0 NOT NULL,
    raw jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: storyboards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.storyboards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    script_id uuid,
    title text NOT NULL,
    scenes jsonb DEFAULT '[]'::jsonb NOT NULL,
    total_duration integer DEFAULT 0 NOT NULL,
    style_notes text,
    user_id uuid,
    organization_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    plan_type public.plan_type DEFAULT 'free'::public.plan_type NOT NULL,
    status public.subscription_status DEFAULT 'active'::public.subscription_status NOT NULL,
    payment_provider text,
    payment_reference text,
    current_period_start timestamp with time zone DEFAULT now() NOT NULL,
    current_period_end timestamp with time zone DEFAULT (now() + '30 days'::interval) NOT NULL,
    trial_end timestamp with time zone,
    cancelled_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    organization_id uuid NOT NULL,
    previous_plan_type public.plan_type
);


--
-- Name: COLUMN subscriptions.previous_plan_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.subscriptions.previous_plan_type IS 'Tracks the previous plan before mid-cycle upgrade';


--
-- Name: telegram_bot_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.telegram_bot_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    bot_username text NOT NULL,
    bot_token_encrypted text NOT NULL,
    webhook_secret text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    group_chat_id bigint,
    default_autonomy_level text DEFAULT 'human_in_loop'::text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    CONSTRAINT telegram_bot_configs_default_autonomy_level_check CHECK ((default_autonomy_level = ANY (ARRAY['human_in_loop'::text, 'human_on_loop'::text, 'full_auto'::text])))
);


--
-- Name: telegram_chat_bindings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.telegram_chat_bindings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    user_id uuid,
    telegram_chat_id bigint NOT NULL,
    telegram_user_id bigint,
    chat_type text NOT NULL,
    telegram_username text,
    is_active boolean DEFAULT true NOT NULL,
    linked_at timestamp with time zone DEFAULT now() NOT NULL,
    last_command_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    active_brand_template_id uuid,
    last_quota_alert_at timestamp with time zone,
    last_quota_alert_threshold smallint,
    first_chat_hint_shown_at timestamp with time zone,
    onboarded_at timestamp with time zone,
    tutorial_step smallint DEFAULT 0 NOT NULL,
    tutorial_completed_at timestamp with time zone,
    last_group_fallback_at timestamp with time zone,
    group_fallback_count integer DEFAULT 0 NOT NULL,
    CONSTRAINT telegram_chat_bindings_chat_type_check CHECK ((chat_type = ANY (ARRAY['private'::text, 'group'::text, 'supergroup'::text])))
);


--
-- Name: COLUMN telegram_chat_bindings.last_quota_alert_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.telegram_chat_bindings.last_quota_alert_at IS 'Last time we pushed a quota threshold alert (80% or 100%) to this Telegram chat. Used to throttle to 1/month per threshold.';


--
-- Name: COLUMN telegram_chat_bindings.last_quota_alert_threshold; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.telegram_chat_bindings.last_quota_alert_threshold IS 'Last threshold (80 or 100) we alerted on. Reset implicitly when last_quota_alert_at < current_period_start.';


--
-- Name: COLUMN telegram_chat_bindings.last_group_fallback_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.telegram_chat_bindings.last_group_fallback_at IS 'Last time we sent a "no admin DM bound" approval reminder to this group binding. Used to rate-limit group fallback notifications.';


--
-- Name: COLUMN telegram_chat_bindings.group_fallback_count; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.telegram_chat_bindings.group_fallback_count IS 'Total approval reminders sent to this group binding via fallback path (lifetime count, for observability).';


--
-- Name: telegram_chat_state; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.telegram_chat_state (
    chat_id bigint NOT NULL,
    user_id uuid NOT NULL,
    flow text NOT NULL,
    step text NOT NULL,
    draft jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: telegram_default_bot_public; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.telegram_default_bot_public WITH (security_invoker='on') AS
 SELECT bot_username,
    is_active
   FROM public.telegram_bot_configs
  WHERE ((organization_id IS NULL) AND (is_default = true) AND (is_active = true));


--
-- Name: telegram_example_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.telegram_example_cache (
    chat_id bigint NOT NULL,
    idx smallint NOT NULL,
    prompt text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '01:00:00'::interval) NOT NULL
);


--
-- Name: telegram_example_prompts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.telegram_example_prompts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    prompt_text text NOT NULL,
    category text DEFAULT 'general'::text NOT NULL,
    language text DEFAULT 'vi'::text NOT NULL,
    sort_order smallint DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: telegram_messages_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.telegram_messages_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    chat_id bigint NOT NULL,
    user_id uuid,
    role text NOT NULL,
    content text NOT NULL,
    intent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT telegram_messages_log_role_check CHECK ((role = ANY (ARRAY['user'::text, 'assistant'::text])))
);


--
-- Name: telegram_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.telegram_notifications (
    goal_id uuid NOT NULL,
    event text NOT NULL,
    chat_id bigint NOT NULL,
    sent_at timestamp with time zone DEFAULT now() NOT NULL,
    payload jsonb
);


--
-- Name: telegram_pending_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.telegram_pending_links (
    telegram_chat_id bigint NOT NULL,
    telegram_user_id bigint,
    telegram_username text,
    token text NOT NULL,
    payload_uid uuid NOT NULL,
    payload_org uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL
);


--
-- Name: telegram_processed_updates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.telegram_processed_updates (
    update_id bigint NOT NULL,
    bot_config_id uuid,
    chat_id bigint,
    processed_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: telegram_user_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.telegram_user_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    daily_digest boolean DEFAULT true NOT NULL,
    weekly_digest boolean DEFAULT false NOT NULL,
    language text DEFAULT 'vi'::text NOT NULL,
    default_brand_id uuid,
    verbose_mode boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: topic_content_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.topic_content_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    topic_history_id uuid NOT NULL,
    content_id uuid NOT NULL,
    content_type text NOT NULL,
    content_title text,
    content_status text DEFAULT 'draft'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    organization_id uuid,
    user_id uuid,
    CONSTRAINT topic_content_links_content_type_check CHECK ((content_type = ANY (ARRAY['multichannel'::text, 'script'::text, 'carousel'::text])))
);


--
-- Name: topic_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.topic_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    topic text NOT NULL,
    category text NOT NULL,
    content_goal text NOT NULL,
    format text NOT NULL,
    pillar text,
    content_id uuid,
    content_type text,
    scores jsonb DEFAULT '{}'::jsonb,
    related_keywords text[] DEFAULT '{}'::text[],
    reasoning text,
    was_used boolean DEFAULT false,
    usage_status text DEFAULT 'suggested'::text,
    performance_score integer,
    actual_engagement jsonb DEFAULT '{}'::jsonb,
    is_favorite boolean DEFAULT false,
    feedback text,
    feedback_note text,
    user_id uuid,
    organization_id uuid,
    brand_template_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    used_at timestamp with time zone,
    published_at timestamp with time zone,
    feedback_details jsonb,
    campaign_id uuid,
    is_pinned boolean DEFAULT false,
    cluster_id uuid,
    CONSTRAINT topic_history_category_check CHECK ((category = ANY (ARRAY['evergreen'::text, 'trending'::text, 'seasonal'::text, 'reactive'::text]))),
    CONSTRAINT topic_history_content_type_check CHECK ((content_type = ANY (ARRAY['carousel'::text, 'script'::text, 'multichannel'::text]))),
    CONSTRAINT topic_history_feedback_check CHECK ((feedback = ANY (ARRAY['positive'::text, 'negative'::text, 'neutral'::text]))),
    CONSTRAINT topic_history_format_check CHECK ((format = ANY (ARRAY['carousel'::text, 'script'::text, 'multichannel'::text]))),
    CONSTRAINT topic_history_performance_score_check CHECK (((performance_score >= 0) AND (performance_score <= 100))),
    CONSTRAINT topic_history_usage_status_check CHECK ((usage_status = ANY (ARRAY['suggested'::text, 'selected'::text, 'created'::text, 'published'::text, 'saved'::text, 'draft'::text])))
);


--
-- Name: trending_topics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trending_topics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    brand_template_id uuid,
    topic text NOT NULL,
    category text,
    velocity_score integer DEFAULT 50,
    peak_status text DEFAULT 'rising'::text,
    peak_prediction text,
    source text DEFAULT 'ai'::text,
    related_keywords text[] DEFAULT '{}'::text[],
    engagement_potential integer DEFAULT 50,
    competition_level text DEFAULT 'medium'::text,
    suggested_angles text[] DEFAULT '{}'::text[],
    expires_at timestamp with time zone DEFAULT (now() + '24:00:00'::interval),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    source_url text
);


--
-- Name: usage_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usage_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    usage_type public.usage_type NOT NULL,
    reference_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    organization_id uuid
);


--
-- Name: user_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    organization_id uuid,
    preferred_tone text DEFAULT 'balanced'::text,
    emoji_frequency text DEFAULT 'medium'::text,
    content_length_preference text DEFAULT 'balanced'::text,
    explanation_depth text DEFAULT 'standard'::text,
    suggestion_count_preference integer DEFAULT 5,
    auto_save_drafts boolean DEFAULT true,
    skill_level text DEFAULT 'beginner'::text,
    concepts_mastered text[] DEFAULT ARRAY[]::text[],
    topics_generated_count integer DEFAULT 0,
    topics_used_count integer DEFAULT 0,
    avg_edit_percentage real DEFAULT 0,
    preferred_categories text[] DEFAULT ARRAY[]::text[],
    disliked_categories text[] DEFAULT ARRAY[]::text[],
    preferred_formats text[] DEFAULT ARRAY[]::text[],
    peak_activity_hours integer[] DEFAULT ARRAY[]::integer[],
    inferred_preferences jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_active_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role DEFAULT 'user'::public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_saved_hooks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_saved_hooks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    organization_id uuid,
    hook_template_id uuid,
    brand_template_id uuid,
    framework text NOT NULL,
    original_opening_line text NOT NULL,
    customized_opening_line text,
    visual_direction text,
    text_overlay text,
    collection_name text,
    notes text,
    is_favorite boolean DEFAULT false,
    usage_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: v_admin_audit_with_user; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_admin_audit_with_user WITH (security_invoker='true') AS
 SELECT l.id,
    l.created_at,
    l.action,
    l.details,
    l.target_user_id,
    l.admin_id,
    COALESCE(p.full_name, p.email, 'Unknown'::text) AS admin_name,
    p.email AS admin_email
   FROM (public.admin_audit_logs l
     LEFT JOIN public.profiles p ON ((p.id = l.admin_id)));


--
-- Name: v_cache_and_revision; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_cache_and_revision WITH (security_invoker='true') AS
 SELECT date(created_at) AS day,
    avg(
        CASE
            WHEN cache_hit THEN 1.0
            ELSE 0.0
        END) AS cache_hit_rate,
    count(*) FILTER (WHERE (cache_hit = true)) AS cache_hits,
    count(*) FILTER (WHERE ((cache_hit = false) OR (cache_hit IS NULL))) AS cache_misses,
    avg(
        CASE
            WHEN ((exit_reason ~~ 'revised_%'::text) OR (exit_reason = 'quality_warning'::text)) THEN 1.0
            ELSE 0.0
        END) AS revision_rate,
    count(*) FILTER (WHERE ((exit_reason ~~ 'revised_%'::text) OR (exit_reason = 'quality_warning'::text))) AS revision_count,
    count(*) FILTER (WHERE (used_fallback = true)) AS circuit_breaker_trips,
    avg(
        CASE
            WHEN used_fallback THEN 1.0
            ELSE 0.0
        END) AS fallback_rate
   FROM public.ai_metrics
  GROUP BY (date(created_at));


--
-- Name: v_daily_metrics; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_daily_metrics WITH (security_invoker='true') AS
 SELECT date(created_at) AS day,
    count(*) AS total_requests,
    percentile_cont((0.5)::double precision) WITHIN GROUP (ORDER BY ((total_duration_ms)::double precision)) AS p50_ms,
    percentile_cont((0.95)::double precision) WITHIN GROUP (ORDER BY ((total_duration_ms)::double precision)) AS p95_ms,
    percentile_cont((0.99)::double precision) WITHIN GROUP (ORDER BY ((total_duration_ms)::double precision)) AS p99_ms,
    avg(
        CASE
            WHEN had_error THEN 1.0
            ELSE 0.0
        END) AS error_rate,
    avg(estimated_cost_usd) AS avg_cost_usd,
    sum(estimated_cost_usd) AS total_cost_usd,
    count(*) FILTER (WHERE (had_error = true)) AS error_count
   FROM public.ai_metrics
  GROUP BY (date(created_at));


--
-- Name: v_node_performance; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_node_performance WITH (security_invoker='true') AS
 SELECT function_name,
    count(*) AS total_calls,
    round(avg(total_duration_ms), 2) AS avg_duration_ms,
    percentile_cont((0.95)::double precision) WITHIN GROUP (ORDER BY ((total_duration_ms)::double precision)) AS p95_duration_ms,
    avg(
        CASE
            WHEN ((exit_reason = 'fast_path'::text) OR (quality_mode = 'fast'::text)) THEN 1.0
            ELSE 0.0
        END) AS fast_path_ratio,
    avg(
        CASE
            WHEN had_error THEN 1.0
            ELSE 0.0
        END) AS error_rate,
    avg(estimated_cost_usd) AS avg_cost_usd
   FROM public.ai_metrics
  GROUP BY function_name;


--
-- Name: v_social_platform_settings_safe; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_social_platform_settings_safe WITH (security_invoker='true') AS
 SELECT id,
    platform,
    app_name,
    is_active,
    created_by,
    created_at,
    updated_at,
    ((consumer_key IS NOT NULL) AND (consumer_secret IS NOT NULL)) AS has_credentials
   FROM public.social_platform_settings;


--
-- Name: video_generations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.video_generations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    script_id uuid,
    storyboard_id uuid,
    scene_number integer,
    provider public.video_provider DEFAULT 'lovable'::public.video_provider NOT NULL,
    model_used text,
    prompt text NOT NULL,
    starting_frame_url text,
    duration_seconds integer DEFAULT 5,
    aspect_ratio text DEFAULT '16:9'::text,
    resolution text DEFAULT '1080p'::text,
    video_url text,
    thumbnail_url text,
    status public.video_generation_status DEFAULT 'pending'::public.video_generation_status,
    progress integer DEFAULT 0,
    error_message text,
    cost_estimate numeric(10,6),
    generation_time_ms integer,
    user_id uuid NOT NULL,
    organization_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    provider_task_id text,
    poll_attempts integer DEFAULT 0 NOT NULL,
    last_polled_at timestamp with time zone,
    negative_prompt text,
    voiceover_url text,
    bgm_url text,
    subtitle_srt text
);

ALTER TABLE ONLY public.video_generations REPLICA IDENTITY FULL;


--
-- Name: video_render_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.video_render_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    organization_id uuid,
    storyboard_id uuid,
    source_clip_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    voiceover_url text,
    bgm_url text,
    subtitle_srt text,
    burn_subtitles boolean DEFAULT true NOT NULL,
    aspect_ratio text DEFAULT '9:16'::text NOT NULL,
    output_url text,
    thumbnail_url text,
    provider text DEFAULT 'creatomate'::text NOT NULL,
    provider_render_id text,
    status text DEFAULT 'pending'::text NOT NULL,
    progress integer DEFAULT 0 NOT NULL,
    poll_attempts integer DEFAULT 0 NOT NULL,
    last_polled_at timestamp with time zone,
    error_message text,
    cost_estimate numeric(10,6),
    duration_seconds numeric(10,2),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    script_id uuid,
    CONSTRAINT video_render_jobs_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text])))
);


--
-- Name: voucher_usages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.voucher_usages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    voucher_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    user_id uuid NOT NULL,
    payment_order_id uuid,
    discount_amount numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: vouchers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vouchers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    description text,
    discount_type text NOT NULL,
    discount_value numeric NOT NULL,
    max_uses integer,
    used_count integer DEFAULT 0,
    applicable_plans text[],
    min_amount numeric DEFAULT 0,
    starts_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone,
    is_active boolean DEFAULT true,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT vouchers_discount_type_check CHECK ((discount_type = ANY (ARRAY['percentage'::text, 'fixed'::text])))
);


--
-- Name: web_search_analytics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.web_search_analytics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    organization_id uuid,
    query text NOT NULL,
    search_type text DEFAULT 'general'::text NOT NULL,
    industry text,
    source text,
    result_count integer DEFAULT 0,
    latency_ms integer,
    cache_hit boolean DEFAULT false,
    fallback_used boolean DEFAULT false,
    error text,
    results_used integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: web_search_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.web_search_cache (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cache_key text NOT NULL,
    query text NOT NULL,
    search_type text DEFAULT 'general'::text NOT NULL,
    industry text,
    results jsonb DEFAULT '[]'::jsonb NOT NULL,
    citations text[] DEFAULT '{}'::text[],
    source text NOT NULL,
    hit_count integer DEFAULT 0,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: workflow_checkpoints; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workflow_checkpoints (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id text NOT NULL,
    node_name text NOT NULL,
    graph_state jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    CONSTRAINT workflow_checkpoints_status_check CHECK ((status = ANY (ARRAY['active'::text, 'completed'::text, 'failed'::text])))
);


--
-- Name: ad_copies ad_copies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_copies
    ADD CONSTRAINT ad_copies_pkey PRIMARY KEY (id);


--
-- Name: ad_copy_ab_results ad_copy_ab_results_ab_test_id_variation_id_logged_at_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_copy_ab_results
    ADD CONSTRAINT ad_copy_ab_results_ab_test_id_variation_id_logged_at_key UNIQUE (ab_test_id, variation_id, logged_at);


--
-- Name: ad_copy_ab_results ad_copy_ab_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_copy_ab_results
    ADD CONSTRAINT ad_copy_ab_results_pkey PRIMARY KEY (id);


--
-- Name: ad_copy_ab_tests ad_copy_ab_tests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_copy_ab_tests
    ADD CONSTRAINT ad_copy_ab_tests_pkey PRIMARY KEY (id);


--
-- Name: ad_copy_ai_insights ad_copy_ai_insights_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_copy_ai_insights
    ADD CONSTRAINT ad_copy_ai_insights_pkey PRIMARY KEY (id);


--
-- Name: ad_copy_analytics_snapshots ad_copy_analytics_snapshots_organization_id_snapshot_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_copy_analytics_snapshots
    ADD CONSTRAINT ad_copy_analytics_snapshots_organization_id_snapshot_date_key UNIQUE (organization_id, snapshot_date);


--
-- Name: ad_copy_analytics_snapshots ad_copy_analytics_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_copy_analytics_snapshots
    ADD CONSTRAINT ad_copy_analytics_snapshots_pkey PRIMARY KEY (id);


--
-- Name: ad_copy_benchmarks ad_copy_benchmarks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_copy_benchmarks
    ADD CONSTRAINT ad_copy_benchmarks_pkey PRIMARY KEY (id);


--
-- Name: ad_copy_benchmarks ad_copy_benchmarks_platform_industry_objective_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_copy_benchmarks
    ADD CONSTRAINT ad_copy_benchmarks_platform_industry_objective_key UNIQUE (platform, industry, objective);


--
-- Name: ad_copy_creative_scores ad_copy_creative_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_copy_creative_scores
    ADD CONSTRAINT ad_copy_creative_scores_pkey PRIMARY KEY (id);


--
-- Name: ad_copy_optimization_suggestions ad_copy_optimization_suggestions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_copy_optimization_suggestions
    ADD CONSTRAINT ad_copy_optimization_suggestions_pkey PRIMARY KEY (id);


--
-- Name: ad_copy_performance ad_copy_performance_ad_copy_id_variation_id_logged_at_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_copy_performance
    ADD CONSTRAINT ad_copy_performance_ad_copy_id_variation_id_logged_at_key UNIQUE (ad_copy_id, variation_id, logged_at);


--
-- Name: ad_copy_performance ad_copy_performance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_copy_performance
    ADD CONSTRAINT ad_copy_performance_pkey PRIMARY KEY (id);


--
-- Name: ad_copy_prediction_history ad_copy_prediction_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_copy_prediction_history
    ADD CONSTRAINT ad_copy_prediction_history_pkey PRIMARY KEY (id);


--
-- Name: ad_copy_variations ad_copy_variations_ad_copy_id_variation_label_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_copy_variations
    ADD CONSTRAINT ad_copy_variations_ad_copy_id_variation_label_key UNIQUE (ad_copy_id, variation_label);


--
-- Name: ad_copy_variations ad_copy_variations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_copy_variations
    ADD CONSTRAINT ad_copy_variations_pkey PRIMARY KEY (id);


--
-- Name: ad_sequence_stage_copies ad_sequence_stage_copies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_sequence_stage_copies
    ADD CONSTRAINT ad_sequence_stage_copies_pkey PRIMARY KEY (id);


--
-- Name: ad_sequence_stage_copies ad_sequence_stage_copies_stage_id_ad_copy_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_sequence_stage_copies
    ADD CONSTRAINT ad_sequence_stage_copies_stage_id_ad_copy_id_key UNIQUE (stage_id, ad_copy_id);


--
-- Name: ad_sequence_stages ad_sequence_stages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_sequence_stages
    ADD CONSTRAINT ad_sequence_stages_pkey PRIMARY KEY (id);


--
-- Name: ad_sequences ad_sequences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_sequences
    ADD CONSTRAINT ad_sequences_pkey PRIMARY KEY (id);


--
-- Name: ad_swipe_files ad_swipe_files_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_swipe_files
    ADD CONSTRAINT ad_swipe_files_pkey PRIMARY KEY (id);


--
-- Name: ad_sync_configs ad_sync_configs_ad_copy_id_external_ad_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_sync_configs
    ADD CONSTRAINT ad_sync_configs_ad_copy_id_external_ad_id_key UNIQUE (ad_copy_id, external_ad_id);


--
-- Name: ad_sync_configs ad_sync_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_sync_configs
    ADD CONSTRAINT ad_sync_configs_pkey PRIMARY KEY (id);


--
-- Name: addon_purchases addon_purchases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.addon_purchases
    ADD CONSTRAINT addon_purchases_pkey PRIMARY KEY (id);


--
-- Name: admin_audit_logs admin_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_audit_logs
    ADD CONSTRAINT admin_audit_logs_pkey PRIMARY KEY (id);


--
-- Name: agent_approvals agent_approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_approvals
    ADD CONSTRAINT agent_approvals_pkey PRIMARY KEY (id);


--
-- Name: agent_blackboard agent_blackboard_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_blackboard
    ADD CONSTRAINT agent_blackboard_pkey PRIMARY KEY (id);


--
-- Name: agent_execution_logs agent_execution_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_execution_logs
    ADD CONSTRAINT agent_execution_logs_pkey PRIMARY KEY (id);


--
-- Name: agent_goals agent_goals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_goals
    ADD CONSTRAINT agent_goals_pkey PRIMARY KEY (id);


--
-- Name: agent_pipeline_logs agent_pipeline_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_pipeline_logs
    ADD CONSTRAINT agent_pipeline_logs_pkey PRIMARY KEY (id);


--
-- Name: agent_pipelines agent_pipelines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_pipelines
    ADD CONSTRAINT agent_pipelines_pkey PRIMARY KEY (id);


--
-- Name: agent_team_permissions agent_team_permissions_organization_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_team_permissions
    ADD CONSTRAINT agent_team_permissions_organization_id_user_id_key UNIQUE (organization_id, user_id);


--
-- Name: agent_team_permissions agent_team_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_team_permissions
    ADD CONSTRAINT agent_team_permissions_pkey PRIMARY KEY (id);


--
-- Name: ai_agent_model_configs ai_agent_model_configs_organization_id_agent_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_agent_model_configs
    ADD CONSTRAINT ai_agent_model_configs_organization_id_agent_name_key UNIQUE (organization_id, agent_name);


--
-- Name: ai_agent_model_configs ai_agent_model_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_agent_model_configs
    ADD CONSTRAINT ai_agent_model_configs_pkey PRIMARY KEY (id);


--
-- Name: ai_channel_model_configs ai_channel_model_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_channel_model_configs
    ADD CONSTRAINT ai_channel_model_configs_pkey PRIMARY KEY (id);


--
-- Name: ai_function_categories ai_function_categories_organization_id_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_function_categories
    ADD CONSTRAINT ai_function_categories_organization_id_slug_key UNIQUE (organization_id, slug);


--
-- Name: ai_function_categories ai_function_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_function_categories
    ADD CONSTRAINT ai_function_categories_pkey PRIMARY KEY (id);


--
-- Name: ai_function_configs ai_function_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_function_configs
    ADD CONSTRAINT ai_function_configs_pkey PRIMARY KEY (id);


--
-- Name: ai_function_group_configs ai_function_group_configs_organization_id_function_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_function_group_configs
    ADD CONSTRAINT ai_function_group_configs_organization_id_function_type_key UNIQUE (organization_id, function_type);


--
-- Name: ai_function_group_configs ai_function_group_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_function_group_configs
    ADD CONSTRAINT ai_function_group_configs_pkey PRIMARY KEY (id);


--
-- Name: ai_metrics ai_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_metrics
    ADD CONSTRAINT ai_metrics_pkey PRIMARY KEY (id);


--
-- Name: ai_prompt_ab_tests ai_prompt_ab_tests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_prompt_ab_tests
    ADD CONSTRAINT ai_prompt_ab_tests_pkey PRIMARY KEY (id);


--
-- Name: ai_prompt_history ai_prompt_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_prompt_history
    ADD CONSTRAINT ai_prompt_history_pkey PRIMARY KEY (id);


--
-- Name: ai_prompts ai_prompts_function_name_prompt_key_version_organization_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_prompts
    ADD CONSTRAINT ai_prompts_function_name_prompt_key_version_organization_id_key UNIQUE (function_name, prompt_key, version, organization_id);


--
-- Name: ai_prompts ai_prompts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_prompts
    ADD CONSTRAINT ai_prompts_pkey PRIMARY KEY (id);


--
-- Name: ai_provider_configs ai_provider_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_provider_configs
    ADD CONSTRAINT ai_provider_configs_pkey PRIMARY KEY (id);


--
-- Name: ai_response_cache ai_response_cache_cache_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_response_cache
    ADD CONSTRAINT ai_response_cache_cache_key_key UNIQUE (cache_key);


--
-- Name: ai_response_cache ai_response_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_response_cache
    ADD CONSTRAINT ai_response_cache_pkey PRIMARY KEY (id);


--
-- Name: approval_assignments approval_assignments_organization_id_approver_id_creator_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_assignments
    ADD CONSTRAINT approval_assignments_organization_id_approver_id_creator_id_key UNIQUE (organization_id, approver_id, creator_id);


--
-- Name: approval_assignments approval_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_assignments
    ADD CONSTRAINT approval_assignments_pkey PRIMARY KEY (id);


--
-- Name: approval_logs approval_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_logs
    ADD CONSTRAINT approval_logs_pkey PRIMARY KEY (id);


--
-- Name: audio_assets audio_assets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audio_assets
    ADD CONSTRAINT audio_assets_pkey PRIMARY KEY (id);


--
-- Name: batch_processing_jobs batch_processing_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batch_processing_jobs
    ADD CONSTRAINT batch_processing_jobs_pkey PRIMARY KEY (id);


--
-- Name: blog_comments blog_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_comments
    ADD CONSTRAINT blog_comments_pkey PRIMARY KEY (id);


--
-- Name: blog_posts blog_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_posts
    ADD CONSTRAINT blog_posts_pkey PRIMARY KEY (id);


--
-- Name: blog_posts blog_posts_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_posts
    ADD CONSTRAINT blog_posts_slug_key UNIQUE (slug);


--
-- Name: blog_reactions blog_reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_reactions
    ADD CONSTRAINT blog_reactions_pkey PRIMARY KEY (id);


--
-- Name: blog_reactions blog_reactions_post_slug_visitor_id_reaction_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_reactions
    ADD CONSTRAINT blog_reactions_post_slug_visitor_id_reaction_type_key UNIQUE (post_slug, visitor_id, reaction_type);


--
-- Name: brand_channel_optimizations brand_channel_optimizations_brand_template_id_channel_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brand_channel_optimizations
    ADD CONSTRAINT brand_channel_optimizations_brand_template_id_channel_key UNIQUE (brand_template_id, channel);


--
-- Name: brand_channel_optimizations brand_channel_optimizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brand_channel_optimizations
    ADD CONSTRAINT brand_channel_optimizations_pkey PRIMARY KEY (id);


--
-- Name: brand_memory brand_memory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brand_memory
    ADD CONSTRAINT brand_memory_pkey PRIMARY KEY (id);


--
-- Name: brand_preferences_learned brand_preferences_learned_brand_template_id_channel_prefere_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brand_preferences_learned
    ADD CONSTRAINT brand_preferences_learned_brand_template_id_channel_prefere_key UNIQUE (brand_template_id, channel, preference_key);


--
-- Name: brand_preferences_learned brand_preferences_learned_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brand_preferences_learned
    ADD CONSTRAINT brand_preferences_learned_pkey PRIMARY KEY (id);


--
-- Name: brand_products brand_products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brand_products
    ADD CONSTRAINT brand_products_pkey PRIMARY KEY (id);


--
-- Name: brand_templates brand_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brand_templates
    ADD CONSTRAINT brand_templates_pkey PRIMARY KEY (id);


--
-- Name: brand_voice_variants brand_voice_variants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brand_voice_variants
    ADD CONSTRAINT brand_voice_variants_pkey PRIMARY KEY (id);


--
-- Name: calendar_notes calendar_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_notes
    ADD CONSTRAINT calendar_notes_pkey PRIMARY KEY (id);


--
-- Name: campaign_content_plans campaign_content_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_content_plans
    ADD CONSTRAINT campaign_content_plans_pkey PRIMARY KEY (id);


--
-- Name: campaign_contents campaign_contents_campaign_id_content_type_content_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_contents
    ADD CONSTRAINT campaign_contents_campaign_id_content_type_content_id_key UNIQUE (campaign_id, content_type, content_id);


--
-- Name: campaign_contents campaign_contents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_contents
    ADD CONSTRAINT campaign_contents_pkey PRIMARY KEY (id);


--
-- Name: campaign_kpi_logs campaign_kpi_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_kpi_logs
    ADD CONSTRAINT campaign_kpi_logs_pkey PRIMARY KEY (id);


--
-- Name: campaign_milestones campaign_milestones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_milestones
    ADD CONSTRAINT campaign_milestones_pkey PRIMARY KEY (id);


--
-- Name: campaign_notification_logs campaign_notification_logs_notification_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_notification_logs
    ADD CONSTRAINT campaign_notification_logs_notification_key_key UNIQUE (notification_key);


--
-- Name: campaign_notification_logs campaign_notification_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_notification_logs
    ADD CONSTRAINT campaign_notification_logs_pkey PRIMARY KEY (id);


--
-- Name: campaigns campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_pkey PRIMARY KEY (id);


--
-- Name: carousel_images carousel_images_carousel_id_slide_number_version_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carousel_images
    ADD CONSTRAINT carousel_images_carousel_id_slide_number_version_key UNIQUE (carousel_id, slide_number, version);


--
-- Name: carousel_images carousel_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carousel_images
    ADD CONSTRAINT carousel_images_pkey PRIMARY KEY (id);


--
-- Name: carousel_style_presets carousel_style_presets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carousel_style_presets
    ADD CONSTRAINT carousel_style_presets_pkey PRIMARY KEY (id);


--
-- Name: carousel_style_presets carousel_style_presets_preset_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carousel_style_presets
    ADD CONSTRAINT carousel_style_presets_preset_key_key UNIQUE (preset_key);


--
-- Name: carousels carousels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carousels
    ADD CONSTRAINT carousels_pkey PRIMARY KEY (id);


--
-- Name: channel_image_history channel_image_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_image_history
    ADD CONSTRAINT channel_image_history_pkey PRIMARY KEY (id);


--
-- Name: character_profiles character_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_profiles
    ADD CONSTRAINT character_profiles_pkey PRIMARY KEY (id);


--
-- Name: chat_conversation_messages chat_conversation_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_conversation_messages
    ADD CONSTRAINT chat_conversation_messages_pkey PRIMARY KEY (id);


--
-- Name: chat_conversations chat_conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_conversations
    ADD CONSTRAINT chat_conversations_pkey PRIMARY KEY (id);


--
-- Name: chat_feedback chat_feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_feedback
    ADD CONSTRAINT chat_feedback_pkey PRIMARY KEY (id);


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: circuit_breaker_events circuit_breaker_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.circuit_breaker_events
    ADD CONSTRAINT circuit_breaker_events_pkey PRIMARY KEY (id);


--
-- Name: competitor_profiles competitor_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competitor_profiles
    ADD CONSTRAINT competitor_profiles_pkey PRIMARY KEY (id);


--
-- Name: content_assignments content_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_assignments
    ADD CONSTRAINT content_assignments_pkey PRIMARY KEY (id);


--
-- Name: content_embeddings content_embeddings_content_type_content_id_chunk_index_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_embeddings
    ADD CONSTRAINT content_embeddings_content_type_content_id_chunk_index_key UNIQUE (content_type, content_id, chunk_index);


--
-- Name: content_embeddings content_embeddings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_embeddings
    ADD CONSTRAINT content_embeddings_pkey PRIMARY KEY (id);


--
-- Name: content_feedback content_feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_feedback
    ADD CONSTRAINT content_feedback_pkey PRIMARY KEY (id);


--
-- Name: content_learnings content_learnings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_learnings
    ADD CONSTRAINT content_learnings_pkey PRIMARY KEY (id);


--
-- Name: content_publishing_logs content_publishing_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_publishing_logs
    ADD CONSTRAINT content_publishing_logs_pkey PRIMARY KEY (id);


--
-- Name: content_schedules content_schedules_content_id_channel_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_schedules
    ADD CONSTRAINT content_schedules_content_id_channel_key UNIQUE (content_id, channel);


--
-- Name: content_schedules content_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_schedules
    ADD CONSTRAINT content_schedules_pkey PRIMARY KEY (id);


--
-- Name: content_style_patterns content_style_patterns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_style_patterns
    ADD CONSTRAINT content_style_patterns_pkey PRIMARY KEY (id);


--
-- Name: conversation_embeddings conversation_embeddings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_embeddings
    ADD CONSTRAINT conversation_embeddings_pkey PRIMARY KEY (id);


--
-- Name: core_contents core_contents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.core_contents
    ADD CONSTRAINT core_contents_pkey PRIMARY KEY (id);


--
-- Name: countries countries_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.countries
    ADD CONSTRAINT countries_code_key UNIQUE (code);


--
-- Name: countries countries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.countries
    ADD CONSTRAINT countries_pkey PRIMARY KEY (id);


--
-- Name: cron_run_logs cron_run_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cron_run_logs
    ADD CONSTRAINT cron_run_logs_pkey PRIMARY KEY (id);


--
-- Name: curated_events curated_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.curated_events
    ADD CONSTRAINT curated_events_pkey PRIMARY KEY (id);


--
-- Name: curated_news curated_news_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.curated_news
    ADD CONSTRAINT curated_news_pkey PRIMARY KEY (id);


--
-- Name: customer_personas customer_personas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_personas
    ADD CONSTRAINT customer_personas_pkey PRIMARY KEY (id);


--
-- Name: duplicate_ignore_list duplicate_ignore_list_node_id_1_node_id_2_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.duplicate_ignore_list
    ADD CONSTRAINT duplicate_ignore_list_node_id_1_node_id_2_key UNIQUE (node_id_1, node_id_2);


--
-- Name: duplicate_ignore_list duplicate_ignore_list_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.duplicate_ignore_list
    ADD CONSTRAINT duplicate_ignore_list_pkey PRIMARY KEY (id);


--
-- Name: edge_function_daily_stats edge_function_daily_stats_function_name_stat_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.edge_function_daily_stats
    ADD CONSTRAINT edge_function_daily_stats_function_name_stat_date_key UNIQUE (function_name, stat_date);


--
-- Name: edge_function_daily_stats edge_function_daily_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.edge_function_daily_stats
    ADD CONSTRAINT edge_function_daily_stats_pkey PRIMARY KEY (id);


--
-- Name: edge_function_metrics edge_function_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.edge_function_metrics
    ADD CONSTRAINT edge_function_metrics_pkey PRIMARY KEY (id);


--
-- Name: external_link_sources external_link_sources_organization_id_url_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_link_sources
    ADD CONSTRAINT external_link_sources_organization_id_url_key UNIQUE (organization_id, url);


--
-- Name: external_link_sources external_link_sources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_link_sources
    ADD CONSTRAINT external_link_sources_pkey PRIMARY KEY (id);


--
-- Name: facebook_oauth_sessions facebook_oauth_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facebook_oauth_sessions
    ADD CONSTRAINT facebook_oauth_sessions_pkey PRIMARY KEY (id);


--
-- Name: firecrawl_serp_cache firecrawl_serp_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.firecrawl_serp_cache
    ADD CONSTRAINT firecrawl_serp_cache_pkey PRIMARY KEY (id);


--
-- Name: generation_signals generation_signals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generation_signals
    ADD CONSTRAINT generation_signals_pkey PRIMARY KEY (id);


--
-- Name: generation_tasks generation_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generation_tasks
    ADD CONSTRAINT generation_tasks_pkey PRIMARY KEY (id);


--
-- Name: geo_action_tasks geo_action_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geo_action_tasks
    ADD CONSTRAINT geo_action_tasks_pkey PRIMARY KEY (id);


--
-- Name: geo_alert_history geo_alert_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geo_alert_history
    ADD CONSTRAINT geo_alert_history_pkey PRIMARY KEY (id);


--
-- Name: geo_brand_monitors geo_brand_monitors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geo_brand_monitors
    ADD CONSTRAINT geo_brand_monitors_pkey PRIMARY KEY (id);


--
-- Name: geo_content_scores geo_content_scores_content_id_content_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geo_content_scores
    ADD CONSTRAINT geo_content_scores_content_id_content_type_key UNIQUE (content_id, content_type);


--
-- Name: geo_content_scores geo_content_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geo_content_scores
    ADD CONSTRAINT geo_content_scores_pkey PRIMARY KEY (id);


--
-- Name: geo_monitoring_results geo_monitoring_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geo_monitoring_results
    ADD CONSTRAINT geo_monitoring_results_pkey PRIMARY KEY (id);


--
-- Name: geo_prompts geo_prompts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geo_prompts
    ADD CONSTRAINT geo_prompts_pkey PRIMARY KEY (id);


--
-- Name: geo_scan_jobs geo_scan_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geo_scan_jobs
    ADD CONSTRAINT geo_scan_jobs_pkey PRIMARY KEY (id);


--
-- Name: geo_schema_outputs geo_schema_outputs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geo_schema_outputs
    ADD CONSTRAINT geo_schema_outputs_pkey PRIMARY KEY (id);


--
-- Name: geo_visibility_snapshots geo_visibility_snapshots_brand_monitor_id_snapshot_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geo_visibility_snapshots
    ADD CONSTRAINT geo_visibility_snapshots_brand_monitor_id_snapshot_date_key UNIQUE (brand_monitor_id, snapshot_date);


--
-- Name: geo_visibility_snapshots geo_visibility_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geo_visibility_snapshots
    ADD CONSTRAINT geo_visibility_snapshots_pkey PRIMARY KEY (id);


--
-- Name: gsc_connections gsc_connections_organization_id_site_url_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gsc_connections
    ADD CONSTRAINT gsc_connections_organization_id_site_url_key UNIQUE (organization_id, site_url);


--
-- Name: gsc_connections gsc_connections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gsc_connections
    ADD CONSTRAINT gsc_connections_pkey PRIMARY KEY (id);


--
-- Name: gsc_metrics_daily gsc_metrics_daily_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gsc_metrics_daily
    ADD CONSTRAINT gsc_metrics_daily_pkey PRIMARY KEY (id);


--
-- Name: gsc_sync_runs gsc_sync_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gsc_sync_runs
    ADD CONSTRAINT gsc_sync_runs_pkey PRIMARY KEY (id);


--
-- Name: help_articles help_articles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.help_articles
    ADD CONSTRAINT help_articles_pkey PRIMARY KEY (id);


--
-- Name: hook_templates hook_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hook_templates
    ADD CONSTRAINT hook_templates_pkey PRIMARY KEY (id);


--
-- Name: industry_categories industry_categories_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_categories
    ADD CONSTRAINT industry_categories_code_key UNIQUE (code);


--
-- Name: industry_categories industry_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_categories
    ADD CONSTRAINT industry_categories_pkey PRIMARY KEY (id);


--
-- Name: industry_category_translations industry_category_translations_category_id_language_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_category_translations
    ADD CONSTRAINT industry_category_translations_category_id_language_code_key UNIQUE (category_id, language_code);


--
-- Name: industry_category_translations industry_category_translations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_category_translations
    ADD CONSTRAINT industry_category_translations_pkey PRIMARY KEY (id);


--
-- Name: industry_global_packs industry_global_packs_industry_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_global_packs
    ADD CONSTRAINT industry_global_packs_industry_code_key UNIQUE (industry_code);


--
-- Name: industry_global_packs industry_global_packs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_global_packs
    ADD CONSTRAINT industry_global_packs_pkey PRIMARY KEY (id);


--
-- Name: industry_glossary industry_glossary_industry_template_id_term_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_glossary
    ADD CONSTRAINT industry_glossary_industry_template_id_term_key UNIQUE (industry_template_id, term);


--
-- Name: industry_glossary industry_glossary_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_glossary
    ADD CONSTRAINT industry_glossary_pkey PRIMARY KEY (id);


--
-- Name: industry_glossary_translations industry_glossary_translations_glossary_id_language_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_glossary_translations
    ADD CONSTRAINT industry_glossary_translations_glossary_id_language_code_key UNIQUE (glossary_id, language_code);


--
-- Name: industry_glossary_translations industry_glossary_translations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_glossary_translations
    ADD CONSTRAINT industry_glossary_translations_pkey PRIMARY KEY (id);


--
-- Name: industry_jurisdiction_profiles industry_jurisdiction_profile_global_pack_id_jurisdiction_c_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_jurisdiction_profiles
    ADD CONSTRAINT industry_jurisdiction_profile_global_pack_id_jurisdiction_c_key UNIQUE (global_pack_id, jurisdiction_code);


--
-- Name: industry_jurisdiction_profiles industry_jurisdiction_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_jurisdiction_profiles
    ADD CONSTRAINT industry_jurisdiction_profiles_pkey PRIMARY KEY (id);


--
-- Name: industry_knowledge_edges industry_knowledge_edges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_knowledge_edges
    ADD CONSTRAINT industry_knowledge_edges_pkey PRIMARY KEY (id);


--
-- Name: industry_knowledge_edges industry_knowledge_edges_source_node_id_target_node_id_edge_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_knowledge_edges
    ADD CONSTRAINT industry_knowledge_edges_source_node_id_target_node_id_edge_key UNIQUE (source_node_id, target_node_id, edge_type);


--
-- Name: industry_knowledge_nodes industry_knowledge_nodes_node_type_node_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_knowledge_nodes
    ADD CONSTRAINT industry_knowledge_nodes_node_type_node_key_key UNIQUE (node_type, node_key);


--
-- Name: industry_knowledge_nodes industry_knowledge_nodes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_knowledge_nodes
    ADD CONSTRAINT industry_knowledge_nodes_pkey PRIMARY KEY (id);


--
-- Name: industry_memory_versions industry_memory_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_memory_versions
    ADD CONSTRAINT industry_memory_versions_pkey PRIMARY KEY (id);


--
-- Name: industry_pack_translations industry_pack_translations_global_pack_id_language_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_pack_translations
    ADD CONSTRAINT industry_pack_translations_global_pack_id_language_code_key UNIQUE (global_pack_id, language_code);


--
-- Name: industry_pack_translations industry_pack_translations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_pack_translations
    ADD CONSTRAINT industry_pack_translations_pkey PRIMARY KEY (id);


--
-- Name: industry_persona_translations industry_persona_translations_industry_persona_id_language__key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_persona_translations
    ADD CONSTRAINT industry_persona_translations_industry_persona_id_language__key UNIQUE (industry_persona_id, language_code);


--
-- Name: industry_persona_translations industry_persona_translations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_persona_translations
    ADD CONSTRAINT industry_persona_translations_pkey PRIMARY KEY (id);


--
-- Name: industry_persona_translations_v2 industry_persona_translations_v2_persona_id_language_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_persona_translations_v2
    ADD CONSTRAINT industry_persona_translations_v2_persona_id_language_code_key UNIQUE (persona_id, language_code);


--
-- Name: industry_persona_translations_v2 industry_persona_translations_v2_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_persona_translations_v2
    ADD CONSTRAINT industry_persona_translations_v2_pkey PRIMARY KEY (id);


--
-- Name: industry_personas industry_personas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_personas
    ADD CONSTRAINT industry_personas_pkey PRIMARY KEY (id);


--
-- Name: industry_personas_v2 industry_personas_v2_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_personas_v2
    ADD CONSTRAINT industry_personas_v2_pkey PRIMARY KEY (id);


--
-- Name: industry_search_aliases industry_search_aliases_pack_id_alias_language_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_search_aliases
    ADD CONSTRAINT industry_search_aliases_pack_id_alias_language_code_key UNIQUE (pack_id, alias, language_code);


--
-- Name: industry_search_aliases industry_search_aliases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_search_aliases
    ADD CONSTRAINT industry_search_aliases_pkey PRIMARY KEY (id);


--
-- Name: industry_template_translations industry_template_translation_industry_template_id_language_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_template_translations
    ADD CONSTRAINT industry_template_translation_industry_template_id_language_key UNIQUE (industry_template_id, language_code);


--
-- Name: industry_template_translations industry_template_translations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_template_translations
    ADD CONSTRAINT industry_template_translations_pkey PRIMARY KEY (id);


--
-- Name: industry_templates industry_templates_country_id_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_templates
    ADD CONSTRAINT industry_templates_country_id_code_key UNIQUE (country_id, code);


--
-- Name: industry_templates industry_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_templates
    ADD CONSTRAINT industry_templates_pkey PRIMARY KEY (id);


--
-- Name: insight_analytics insight_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.insight_analytics
    ADD CONSTRAINT insight_analytics_pkey PRIMARY KEY (id);


--
-- Name: internal_links internal_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.internal_links
    ADD CONSTRAINT internal_links_pkey PRIMARY KEY (id);


--
-- Name: internal_links internal_links_source_content_id_target_content_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.internal_links
    ADD CONSTRAINT internal_links_source_content_id_target_content_id_key UNIQUE (source_content_id, target_content_id);


--
-- Name: journey_stage_messaging journey_stage_messaging_mapping_id_journey_stage_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journey_stage_messaging
    ADD CONSTRAINT journey_stage_messaging_mapping_id_journey_stage_key UNIQUE (mapping_id, journey_stage);


--
-- Name: journey_stage_messaging journey_stage_messaging_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journey_stage_messaging
    ADD CONSTRAINT journey_stage_messaging_pkey PRIMARY KEY (id);


--
-- Name: keyword_enrichment_jobs keyword_enrichment_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.keyword_enrichment_jobs
    ADD CONSTRAINT keyword_enrichment_jobs_pkey PRIMARY KEY (id);


--
-- Name: keyword_research_jobs keyword_research_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.keyword_research_jobs
    ADD CONSTRAINT keyword_research_jobs_pkey PRIMARY KEY (id);


--
-- Name: knowledge_graph_analytics knowledge_graph_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_graph_analytics
    ADD CONSTRAINT knowledge_graph_analytics_pkey PRIMARY KEY (id);


--
-- Name: knowledge_graph_cache knowledge_graph_cache_cache_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_graph_cache
    ADD CONSTRAINT knowledge_graph_cache_cache_key_key UNIQUE (cache_key);


--
-- Name: knowledge_graph_cache knowledge_graph_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_graph_cache
    ADD CONSTRAINT knowledge_graph_cache_pkey PRIMARY KEY (id);


--
-- Name: kpi_adjustment_dismissals kpi_adjustment_dismissals_campaign_id_metric_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kpi_adjustment_dismissals
    ADD CONSTRAINT kpi_adjustment_dismissals_campaign_id_metric_key UNIQUE (campaign_id, metric);


--
-- Name: kpi_adjustment_dismissals kpi_adjustment_dismissals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kpi_adjustment_dismissals
    ADD CONSTRAINT kpi_adjustment_dismissals_pkey PRIMARY KEY (id);


--
-- Name: marketing_calendar marketing_calendar_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_calendar
    ADD CONSTRAINT marketing_calendar_pkey PRIMARY KEY (id);


--
-- Name: multi_channel_contents multi_channel_contents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.multi_channel_contents
    ADD CONSTRAINT multi_channel_contents_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: oauth_pending_states oauth_pending_states_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oauth_pending_states
    ADD CONSTRAINT oauth_pending_states_pkey PRIMARY KEY (state);


--
-- Name: orchestrator_daily_stats orchestrator_daily_stats_date_organization_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orchestrator_daily_stats
    ADD CONSTRAINT orchestrator_daily_stats_date_organization_id_key UNIQUE (date, organization_id);


--
-- Name: orchestrator_daily_stats orchestrator_daily_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orchestrator_daily_stats
    ADD CONSTRAINT orchestrator_daily_stats_pkey PRIMARY KEY (id);


--
-- Name: organization_members organization_members_organization_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_organization_id_user_id_key UNIQUE (organization_id, user_id);


--
-- Name: organization_members organization_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_slug_key UNIQUE (slug);


--
-- Name: payment_orders payment_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_orders
    ADD CONSTRAINT payment_orders_pkey PRIMARY KEY (id);


--
-- Name: payment_orders payment_orders_vnpay_txn_ref_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_orders
    ADD CONSTRAINT payment_orders_vnpay_txn_ref_key UNIQUE (vnpay_txn_ref);


--
-- Name: pinterest_boards pinterest_boards_connection_id_board_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pinterest_boards
    ADD CONSTRAINT pinterest_boards_connection_id_board_id_key UNIQUE (connection_id, board_id);


--
-- Name: pinterest_boards pinterest_boards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pinterest_boards
    ADD CONSTRAINT pinterest_boards_pkey PRIMARY KEY (id);


--
-- Name: pinterest_oauth_sessions pinterest_oauth_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pinterest_oauth_sessions
    ADD CONSTRAINT pinterest_oauth_sessions_pkey PRIMARY KEY (id);


--
-- Name: pinterest_oauth_sessions pinterest_oauth_sessions_state_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pinterest_oauth_sessions
    ADD CONSTRAINT pinterest_oauth_sessions_state_key UNIQUE (state);


--
-- Name: plan_limits plan_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_limits
    ADD CONSTRAINT plan_limits_pkey PRIMARY KEY (id);


--
-- Name: plan_limits plan_limits_plan_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_limits
    ADD CONSTRAINT plan_limits_plan_type_key UNIQUE (plan_type);


--
-- Name: plan_unit_costs plan_unit_costs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_unit_costs
    ADD CONSTRAINT plan_unit_costs_pkey PRIMARY KEY (id);


--
-- Name: plan_unit_costs plan_unit_costs_unit_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_unit_costs
    ADD CONSTRAINT plan_unit_costs_unit_type_key UNIQUE (unit_type);


--
-- Name: planned_content_items planned_content_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planned_content_items
    ADD CONSTRAINT planned_content_items_pkey PRIMARY KEY (id);


--
-- Name: planning_sessions planning_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planning_sessions
    ADD CONSTRAINT planning_sessions_pkey PRIMARY KEY (id);


--
-- Name: product_persona_mappings product_persona_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_persona_mappings
    ADD CONSTRAINT product_persona_mappings_pkey PRIMARY KEY (id);


--
-- Name: product_persona_mappings product_persona_mappings_product_id_persona_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_persona_mappings
    ADD CONSTRAINT product_persona_mappings_product_id_persona_id_key UNIQUE (product_id, persona_id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: prompt_analytics prompt_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompt_analytics
    ADD CONSTRAINT prompt_analytics_pkey PRIMARY KEY (id);


--
-- Name: publish_attempts publish_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publish_attempts
    ADD CONSTRAINT publish_attempts_pkey PRIMARY KEY (id);


--
-- Name: regulation_crawl_history regulation_crawl_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regulation_crawl_history
    ADD CONSTRAINT regulation_crawl_history_pkey PRIMARY KEY (id);


--
-- Name: regulation_propagation_log regulation_propagation_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regulation_propagation_log
    ADD CONSTRAINT regulation_propagation_log_pkey PRIMARY KEY (id);


--
-- Name: regulation_sources regulation_sources_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regulation_sources
    ADD CONSTRAINT regulation_sources_pkey PRIMARY KEY (id);


--
-- Name: regulation_versions regulation_versions_node_id_version_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regulation_versions
    ADD CONSTRAINT regulation_versions_node_id_version_number_key UNIQUE (node_id, version_number);


--
-- Name: regulation_versions regulation_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regulation_versions
    ADD CONSTRAINT regulation_versions_pkey PRIMARY KEY (id);


--
-- Name: report_sync_state report_sync_state_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_sync_state
    ADD CONSTRAINT report_sync_state_pkey PRIMARY KEY (id);


--
-- Name: sales_chat_analytics sales_chat_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_chat_analytics
    ADD CONSTRAINT sales_chat_analytics_pkey PRIMARY KEY (id);


--
-- Name: sales_chat_leads sales_chat_leads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_chat_leads
    ADD CONSTRAINT sales_chat_leads_pkey PRIMARY KEY (id);


--
-- Name: sales_chat_messages_log sales_chat_messages_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_chat_messages_log
    ADD CONSTRAINT sales_chat_messages_log_pkey PRIMARY KEY (id);


--
-- Name: saved_audiences saved_audiences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_audiences
    ADD CONSTRAINT saved_audiences_pkey PRIMARY KEY (id);


--
-- Name: script_approvals script_approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.script_approvals
    ADD CONSTRAINT script_approvals_pkey PRIMARY KEY (id);


--
-- Name: script_versions script_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.script_versions
    ADD CONSTRAINT script_versions_pkey PRIMARY KEY (id);


--
-- Name: script_versions script_versions_script_id_version_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.script_versions
    ADD CONSTRAINT script_versions_script_id_version_key UNIQUE (script_id, version);


--
-- Name: scripts scripts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scripts
    ADD CONSTRAINT scripts_pkey PRIMARY KEY (id);


--
-- Name: security_events security_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_events
    ADD CONSTRAINT security_events_pkey PRIMARY KEY (id);


--
-- Name: seo_clusters seo_clusters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seo_clusters
    ADD CONSTRAINT seo_clusters_pkey PRIMARY KEY (id);


--
-- Name: seo_keywords seo_keywords_organization_id_keyword_locale_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seo_keywords
    ADD CONSTRAINT seo_keywords_organization_id_keyword_locale_key UNIQUE (organization_id, keyword, locale);


--
-- Name: seo_keywords seo_keywords_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seo_keywords
    ADD CONSTRAINT seo_keywords_pkey PRIMARY KEY (id);


--
-- Name: seo_landing_pages seo_landing_pages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seo_landing_pages
    ADD CONSTRAINT seo_landing_pages_pkey PRIMARY KEY (id);


--
-- Name: seo_landing_pages seo_landing_pages_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seo_landing_pages
    ADD CONSTRAINT seo_landing_pages_slug_key UNIQUE (slug);


--
-- Name: seo_rank_history seo_rank_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seo_rank_history
    ADD CONSTRAINT seo_rank_history_pkey PRIMARY KEY (id);


--
-- Name: seo_rank_tracker_runs seo_rank_tracker_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seo_rank_tracker_runs
    ADD CONSTRAINT seo_rank_tracker_runs_pkey PRIMARY KEY (id);


--
-- Name: seo_serp_snapshots seo_serp_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seo_serp_snapshots
    ADD CONSTRAINT seo_serp_snapshots_pkey PRIMARY KEY (id);


--
-- Name: social_connections social_connections_organization_id_platform_platform_user_i_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_connections
    ADD CONSTRAINT social_connections_organization_id_platform_platform_user_i_key UNIQUE (organization_id, platform, platform_user_id);


--
-- Name: social_connections social_connections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_connections
    ADD CONSTRAINT social_connections_pkey PRIMARY KEY (id);


--
-- Name: social_platform_settings social_platform_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_platform_settings
    ADD CONSTRAINT social_platform_settings_pkey PRIMARY KEY (id);


--
-- Name: social_platform_settings social_platform_settings_platform_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_platform_settings
    ADD CONSTRAINT social_platform_settings_platform_key UNIQUE (platform);


--
-- Name: social_post_engagements social_post_engagements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_post_engagements
    ADD CONSTRAINT social_post_engagements_pkey PRIMARY KEY (id);


--
-- Name: social_post_metrics social_post_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_post_metrics
    ADD CONSTRAINT social_post_metrics_pkey PRIMARY KEY (id);


--
-- Name: storyboards storyboards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.storyboards
    ADD CONSTRAINT storyboards_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_organization_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_organization_id_key UNIQUE (organization_id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: telegram_bot_configs telegram_bot_configs_organization_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_bot_configs
    ADD CONSTRAINT telegram_bot_configs_organization_id_key UNIQUE (organization_id);


--
-- Name: telegram_bot_configs telegram_bot_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_bot_configs
    ADD CONSTRAINT telegram_bot_configs_pkey PRIMARY KEY (id);


--
-- Name: telegram_bot_configs telegram_bot_configs_webhook_secret_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_bot_configs
    ADD CONSTRAINT telegram_bot_configs_webhook_secret_key UNIQUE (webhook_secret);


--
-- Name: telegram_chat_bindings telegram_chat_bindings_organization_id_telegram_chat_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_chat_bindings
    ADD CONSTRAINT telegram_chat_bindings_organization_id_telegram_chat_id_key UNIQUE (organization_id, telegram_chat_id);


--
-- Name: telegram_chat_bindings telegram_chat_bindings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_chat_bindings
    ADD CONSTRAINT telegram_chat_bindings_pkey PRIMARY KEY (id);


--
-- Name: telegram_chat_state telegram_chat_state_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_chat_state
    ADD CONSTRAINT telegram_chat_state_pkey PRIMARY KEY (chat_id, user_id);


--
-- Name: telegram_example_cache telegram_example_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_example_cache
    ADD CONSTRAINT telegram_example_cache_pkey PRIMARY KEY (chat_id, idx);


--
-- Name: telegram_example_prompts telegram_example_prompts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_example_prompts
    ADD CONSTRAINT telegram_example_prompts_pkey PRIMARY KEY (id);


--
-- Name: telegram_messages_log telegram_messages_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_messages_log
    ADD CONSTRAINT telegram_messages_log_pkey PRIMARY KEY (id);


--
-- Name: telegram_notifications telegram_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_notifications
    ADD CONSTRAINT telegram_notifications_pkey PRIMARY KEY (goal_id, event);


--
-- Name: telegram_pending_links telegram_pending_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_pending_links
    ADD CONSTRAINT telegram_pending_links_pkey PRIMARY KEY (telegram_chat_id);


--
-- Name: telegram_processed_updates telegram_processed_updates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_processed_updates
    ADD CONSTRAINT telegram_processed_updates_pkey PRIMARY KEY (update_id);


--
-- Name: telegram_user_preferences telegram_user_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_user_preferences
    ADD CONSTRAINT telegram_user_preferences_pkey PRIMARY KEY (id);


--
-- Name: telegram_user_preferences telegram_user_preferences_user_id_organization_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_user_preferences
    ADD CONSTRAINT telegram_user_preferences_user_id_organization_id_key UNIQUE (user_id, organization_id);


--
-- Name: topic_content_links topic_content_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.topic_content_links
    ADD CONSTRAINT topic_content_links_pkey PRIMARY KEY (id);


--
-- Name: topic_history topic_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.topic_history
    ADD CONSTRAINT topic_history_pkey PRIMARY KEY (id);


--
-- Name: trending_topics trending_topics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trending_topics
    ADD CONSTRAINT trending_topics_pkey PRIMARY KEY (id);


--
-- Name: usage_logs usage_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_logs
    ADD CONSTRAINT usage_logs_pkey PRIMARY KEY (id);


--
-- Name: user_preferences user_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_pkey PRIMARY KEY (id);


--
-- Name: user_preferences user_preferences_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_user_id_key UNIQUE (user_id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: user_saved_hooks user_saved_hooks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_saved_hooks
    ADD CONSTRAINT user_saved_hooks_pkey PRIMARY KEY (id);


--
-- Name: video_generations video_generations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_generations
    ADD CONSTRAINT video_generations_pkey PRIMARY KEY (id);


--
-- Name: video_render_jobs video_render_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_render_jobs
    ADD CONSTRAINT video_render_jobs_pkey PRIMARY KEY (id);


--
-- Name: voucher_usages voucher_usages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voucher_usages
    ADD CONSTRAINT voucher_usages_pkey PRIMARY KEY (id);


--
-- Name: vouchers vouchers_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vouchers
    ADD CONSTRAINT vouchers_code_key UNIQUE (code);


--
-- Name: vouchers vouchers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vouchers
    ADD CONSTRAINT vouchers_pkey PRIMARY KEY (id);


--
-- Name: web_search_analytics web_search_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.web_search_analytics
    ADD CONSTRAINT web_search_analytics_pkey PRIMARY KEY (id);


--
-- Name: web_search_cache web_search_cache_cache_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.web_search_cache
    ADD CONSTRAINT web_search_cache_cache_key_key UNIQUE (cache_key);


--
-- Name: web_search_cache web_search_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.web_search_cache
    ADD CONSTRAINT web_search_cache_pkey PRIMARY KEY (id);


--
-- Name: workflow_checkpoints workflow_checkpoints_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_checkpoints
    ADD CONSTRAINT workflow_checkpoints_pkey PRIMARY KEY (id);


--
-- Name: ai_channel_model_configs_global_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ai_channel_model_configs_global_unique ON public.ai_channel_model_configs USING btree (channel) WHERE (organization_id IS NULL);


--
-- Name: ai_channel_model_configs_org_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ai_channel_model_configs_org_unique ON public.ai_channel_model_configs USING btree (organization_id, channel) WHERE (organization_id IS NOT NULL);


--
-- Name: ai_function_categories_system_slug_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ai_function_categories_system_slug_idx ON public.ai_function_categories USING btree (slug) WHERE (organization_id IS NULL);


--
-- Name: ai_function_configs_global_function_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ai_function_configs_global_function_unique ON public.ai_function_configs USING btree (function_name) WHERE (organization_id IS NULL);


--
-- Name: ai_function_configs_org_function_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ai_function_configs_org_function_unique ON public.ai_function_configs USING btree (organization_id, function_name) WHERE (organization_id IS NOT NULL);


--
-- Name: ai_metrics_trace_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_metrics_trace_id_idx ON public.ai_metrics USING btree (trace_id) WHERE (trace_id IS NOT NULL);


--
-- Name: content_embeddings_brand_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX content_embeddings_brand_idx ON public.content_embeddings USING btree (brand_template_id);


--
-- Name: content_embeddings_content_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX content_embeddings_content_idx ON public.content_embeddings USING btree (content_type, content_id);


--
-- Name: content_embeddings_embedding_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX content_embeddings_embedding_idx ON public.content_embeddings USING hnsw (embedding extensions.vector_cosine_ops) WITH (m='16', ef_construction='64');


--
-- Name: content_embeddings_org_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX content_embeddings_org_idx ON public.content_embeddings USING btree (organization_id);


--
-- Name: content_embeddings_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX content_embeddings_type_idx ON public.content_embeddings USING btree (content_type);


--
-- Name: firecrawl_serp_cache_expires_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX firecrawl_serp_cache_expires_idx ON public.firecrawl_serp_cache USING btree (expires_at);


--
-- Name: firecrawl_serp_cache_key_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX firecrawl_serp_cache_key_idx ON public.firecrawl_serp_cache USING btree (keyword_normalized, lang, country);


--
-- Name: help_articles_category_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX help_articles_category_idx ON public.help_articles USING btree (category);


--
-- Name: help_articles_embedding_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX help_articles_embedding_idx ON public.help_articles USING hnsw (embedding extensions.vector_cosine_ops);


--
-- Name: help_articles_org_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX help_articles_org_idx ON public.help_articles USING btree (organization_id);


--
-- Name: help_articles_published_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX help_articles_published_idx ON public.help_articles USING btree (is_published);


--
-- Name: idx_ab_results_test; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ab_results_test ON public.ad_copy_ab_results USING btree (ab_test_id);


--
-- Name: idx_ab_results_variation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ab_results_variation ON public.ad_copy_ab_results USING btree (variation_id);


--
-- Name: idx_ab_tests_ad_copy; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ab_tests_ad_copy ON public.ad_copy_ab_tests USING btree (ad_copy_id);


--
-- Name: idx_ab_tests_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ab_tests_org ON public.ad_copy_ab_tests USING btree (organization_id);


--
-- Name: idx_ad_copies_campaign; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ad_copies_campaign ON public.ad_copies USING btree (campaign_id);


--
-- Name: idx_ad_copies_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ad_copies_org ON public.ad_copies USING btree (organization_id);


--
-- Name: idx_ad_copies_platform; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ad_copies_platform ON public.ad_copies USING btree (platform);


--
-- Name: idx_ad_copies_saved_audience; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ad_copies_saved_audience ON public.ad_copies USING btree (saved_audience_id);


--
-- Name: idx_ad_copies_sequence_stage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ad_copies_sequence_stage ON public.ad_copies USING btree (sequence_stage_id);


--
-- Name: idx_ad_copies_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ad_copies_status ON public.ad_copies USING btree (status);


--
-- Name: idx_ad_copies_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ad_copies_user ON public.ad_copies USING btree (user_id);


--
-- Name: idx_ad_copy_performance_ad_copy; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ad_copy_performance_ad_copy ON public.ad_copy_performance USING btree (ad_copy_id);


--
-- Name: idx_ad_copy_performance_logged_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ad_copy_performance_logged_at ON public.ad_copy_performance USING btree (logged_at);


--
-- Name: idx_ad_copy_performance_sync_config; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ad_copy_performance_sync_config ON public.ad_copy_performance USING btree (sync_config_id);


--
-- Name: idx_ad_copy_performance_variation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ad_copy_performance_variation ON public.ad_copy_performance USING btree (variation_id);


--
-- Name: idx_ad_copy_variations_ad; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ad_copy_variations_ad ON public.ad_copy_variations USING btree (ad_copy_id);


--
-- Name: idx_ad_sequence_stage_copies_adcopy; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ad_sequence_stage_copies_adcopy ON public.ad_sequence_stage_copies USING btree (ad_copy_id);


--
-- Name: idx_ad_sequence_stage_copies_stage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ad_sequence_stage_copies_stage ON public.ad_sequence_stage_copies USING btree (stage_id);


--
-- Name: idx_ad_sequence_stages_sequence; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ad_sequence_stages_sequence ON public.ad_sequence_stages USING btree (sequence_id);


--
-- Name: idx_ad_sequences_campaign; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ad_sequences_campaign ON public.ad_sequences USING btree (campaign_id);


--
-- Name: idx_ad_sequences_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ad_sequences_org ON public.ad_sequences USING btree (organization_id);


--
-- Name: idx_ad_sequences_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ad_sequences_status ON public.ad_sequences USING btree (status);


--
-- Name: idx_ad_sync_configs_ad_copy; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ad_sync_configs_ad_copy ON public.ad_sync_configs USING btree (ad_copy_id);


--
-- Name: idx_ad_sync_configs_enabled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ad_sync_configs_enabled ON public.ad_sync_configs USING btree (sync_enabled, sync_status);


--
-- Name: idx_ad_sync_configs_next_sync; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ad_sync_configs_next_sync ON public.ad_sync_configs USING btree (next_sync_at) WHERE (sync_enabled = true);


--
-- Name: idx_ad_sync_configs_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ad_sync_configs_org ON public.ad_sync_configs USING btree (organization_id);


--
-- Name: idx_addon_purchases_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_addon_purchases_expires ON public.addon_purchases USING btree (expires_at);


--
-- Name: idx_addon_purchases_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_addon_purchases_org_id ON public.addon_purchases USING btree (organization_id);


--
-- Name: idx_addon_purchases_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_addon_purchases_status ON public.addon_purchases USING btree (status);


--
-- Name: idx_admin_audit_logs_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_audit_logs_action ON public.admin_audit_logs USING btree (action);


--
-- Name: idx_admin_audit_logs_admin_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_audit_logs_admin_id ON public.admin_audit_logs USING btree (admin_id);


--
-- Name: idx_admin_audit_logs_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_audit_logs_created ON public.admin_audit_logs USING btree (created_at DESC);


--
-- Name: idx_admin_audit_logs_target; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_audit_logs_target ON public.admin_audit_logs USING btree (target_user_id);


--
-- Name: idx_agent_approvals_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_approvals_org ON public.agent_approvals USING btree (organization_id);


--
-- Name: idx_agent_approvals_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_approvals_pending ON public.agent_approvals USING btree (organization_id, status) WHERE (status = 'pending'::public.agent_approval_status);


--
-- Name: idx_agent_approvals_pending_expiry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_approvals_pending_expiry ON public.agent_approvals USING btree (expires_at) WHERE (status = 'pending'::public.agent_approval_status);


--
-- Name: idx_agent_goals_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_goals_active ON public.agent_goals USING btree (organization_id, is_active) WHERE (is_active = true);


--
-- Name: idx_agent_goals_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_goals_org ON public.agent_goals USING btree (organization_id);


--
-- Name: idx_agent_goals_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_goals_parent ON public.agent_goals USING btree (parent_goal_id);


--
-- Name: idx_agent_goals_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_goals_period ON public.agent_goals USING btree (organization_id, period_type) WHERE (period_type <> 'custom'::text);


--
-- Name: idx_agent_logs_agent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_logs_agent ON public.agent_execution_logs USING btree (agent_name, created_at DESC);


--
-- Name: idx_agent_logs_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_logs_session ON public.agent_execution_logs USING btree (session_id);


--
-- Name: idx_agent_pipeline_logs_pipeline; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_pipeline_logs_pipeline ON public.agent_pipeline_logs USING btree (pipeline_id);


--
-- Name: idx_agent_pipelines_content_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_pipelines_content_type ON public.agent_pipelines USING btree (content_type);


--
-- Name: idx_agent_pipelines_goal; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_pipelines_goal ON public.agent_pipelines USING btree (goal_id);


--
-- Name: idx_agent_pipelines_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_pipelines_org ON public.agent_pipelines USING btree (organization_id);


--
-- Name: idx_agent_pipelines_quality; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_pipelines_quality ON public.agent_pipelines USING btree (overall_quality_score);


--
-- Name: idx_agent_pipelines_stage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_pipelines_stage ON public.agent_pipelines USING btree (current_stage);


--
-- Name: idx_agent_pipelines_stage_claim; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_pipelines_stage_claim ON public.agent_pipelines USING btree (stage_claim_at) WHERE (stage_claim_token IS NOT NULL);


--
-- Name: idx_ai_function_configs_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_function_configs_lookup ON public.ai_function_configs USING btree (function_name, organization_id, is_enabled);


--
-- Name: idx_ai_insights_ad_copy; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_insights_ad_copy ON public.ad_copy_ai_insights USING btree (ad_copy_id);


--
-- Name: idx_ai_insights_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_insights_org ON public.ad_copy_ai_insights USING btree (organization_id, is_dismissed, valid_until);


--
-- Name: idx_ai_metrics_ab_test; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_metrics_ab_test ON public.ai_metrics USING btree (ab_test_id);


--
-- Name: idx_ai_metrics_compliance_risk_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_metrics_compliance_risk_level ON public.ai_metrics USING btree (compliance_risk_level) WHERE (compliance_risk_level IS NOT NULL);


--
-- Name: idx_ai_metrics_content; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_metrics_content ON public.ai_metrics USING btree (content_id) WHERE (content_id IS NOT NULL);


--
-- Name: idx_ai_metrics_cost; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_metrics_cost ON public.ai_metrics USING btree (estimated_cost_usd) WHERE (estimated_cost_usd IS NOT NULL);


--
-- Name: idx_ai_metrics_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_metrics_created ON public.ai_metrics USING btree (created_at DESC);


--
-- Name: idx_ai_metrics_errors; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_metrics_errors ON public.ai_metrics USING btree (had_error) WHERE (had_error = true);


--
-- Name: idx_ai_metrics_function; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_metrics_function ON public.ai_metrics USING btree (function_name);


--
-- Name: idx_ai_metrics_function_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_metrics_function_date ON public.ai_metrics USING btree (function_name, created_at);


--
-- Name: idx_ai_metrics_org_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_metrics_org_date ON public.ai_metrics USING btree (organization_id, created_at);


--
-- Name: idx_ai_metrics_org_func_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_metrics_org_func_date ON public.ai_metrics USING btree (organization_id, function_name, created_at DESC) WHERE (organization_id IS NOT NULL);


--
-- Name: idx_ai_metrics_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_metrics_org_id ON public.ai_metrics USING btree (organization_id);


--
-- Name: idx_ai_metrics_prompt; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_metrics_prompt ON public.ai_metrics USING btree (prompt_id);


--
-- Name: idx_ai_metrics_trace; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_metrics_trace ON public.ai_metrics USING btree (trace_id);


--
-- Name: idx_ai_prompt_ab_tests_function; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_prompt_ab_tests_function ON public.ai_prompt_ab_tests USING btree (function_name, prompt_key);


--
-- Name: idx_ai_prompt_ab_tests_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_prompt_ab_tests_org ON public.ai_prompt_ab_tests USING btree (organization_id);


--
-- Name: idx_ai_prompt_ab_tests_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_prompt_ab_tests_status ON public.ai_prompt_ab_tests USING btree (status) WHERE (status = 'running'::text);


--
-- Name: idx_ai_prompt_history_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_prompt_history_created ON public.ai_prompt_history USING btree (created_at DESC);


--
-- Name: idx_ai_prompt_history_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_prompt_history_org ON public.ai_prompt_history USING btree (organization_id);


--
-- Name: idx_ai_prompt_history_prompt; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_prompt_history_prompt ON public.ai_prompt_history USING btree (prompt_id);


--
-- Name: idx_ai_prompts_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_prompts_active ON public.ai_prompts USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_ai_prompts_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_prompts_category ON public.ai_prompts USING btree (category_id);


--
-- Name: idx_ai_prompts_default; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_prompts_default ON public.ai_prompts USING btree (is_default) WHERE (is_default = true);


--
-- Name: idx_ai_prompts_function_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_prompts_function_key ON public.ai_prompts USING btree (function_name, prompt_key);


--
-- Name: idx_ai_prompts_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_prompts_org ON public.ai_prompts USING btree (organization_id);


--
-- Name: idx_ai_prompts_unique_default; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_ai_prompts_unique_default ON public.ai_prompts USING btree (function_name, prompt_key) WHERE (organization_id IS NULL);


--
-- Name: idx_ai_prompts_unique_org; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_ai_prompts_unique_org ON public.ai_prompts USING btree (function_name, prompt_key, organization_id) WHERE (organization_id IS NOT NULL);


--
-- Name: idx_ai_response_cache_embedding; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_response_cache_embedding ON public.ai_response_cache USING ivfflat (embedding extensions.vector_cosine_ops) WITH (lists='50');


--
-- Name: idx_ai_response_cache_func_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_response_cache_func_org ON public.ai_response_cache USING btree (function_name, organization_id);


--
-- Name: idx_analytics_snapshots_org_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_analytics_snapshots_org_date ON public.ad_copy_analytics_snapshots USING btree (organization_id, snapshot_date DESC);


--
-- Name: idx_approval_logs_content_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_approval_logs_content_id ON public.approval_logs USING btree (content_id);


--
-- Name: idx_approval_logs_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_approval_logs_organization_id ON public.approval_logs USING btree (organization_id);


--
-- Name: idx_approval_logs_performed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_approval_logs_performed_by ON public.approval_logs USING btree (performed_by);


--
-- Name: idx_audio_assets_script_type_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audio_assets_script_type_created ON public.audio_assets USING btree (script_id, asset_type, created_at DESC);


--
-- Name: idx_audio_assets_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audio_assets_type ON public.audio_assets USING btree (asset_type);


--
-- Name: idx_audio_assets_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audio_assets_user ON public.audio_assets USING btree (user_id);


--
-- Name: idx_blackboard_agent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blackboard_agent ON public.agent_blackboard USING btree (session_id, agent_name);


--
-- Name: idx_blackboard_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blackboard_session ON public.agent_blackboard USING btree (session_id, data_key);


--
-- Name: idx_blog_comments_post_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blog_comments_post_slug ON public.blog_comments USING btree (post_slug);


--
-- Name: idx_blog_posts_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blog_posts_org ON public.blog_posts USING btree (organization_id);


--
-- Name: idx_blog_posts_published_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blog_posts_published_at ON public.blog_posts USING btree (published_at DESC);


--
-- Name: idx_blog_posts_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blog_posts_slug ON public.blog_posts USING btree (slug);


--
-- Name: idx_blog_posts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blog_posts_status ON public.blog_posts USING btree (status);


--
-- Name: idx_blog_reactions_post_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blog_reactions_post_slug ON public.blog_reactions USING btree (post_slug);


--
-- Name: idx_brand_channel_opt_brand; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_brand_channel_opt_brand ON public.brand_channel_optimizations USING btree (brand_template_id);


--
-- Name: idx_brand_channel_opt_channel; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_brand_channel_opt_channel ON public.brand_channel_optimizations USING btree (channel);


--
-- Name: idx_brand_memory_brand; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_brand_memory_brand ON public.brand_memory USING btree (brand_template_id, memory_type);


--
-- Name: idx_brand_memory_embedding; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_brand_memory_embedding ON public.brand_memory USING ivfflat (embedding extensions.vector_cosine_ops) WITH (lists='50');


--
-- Name: idx_brand_memory_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_brand_memory_org ON public.brand_memory USING btree (organization_id);


--
-- Name: idx_brand_preferences_brand_channel; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_brand_preferences_brand_channel ON public.brand_preferences_learned USING btree (brand_template_id, channel);


--
-- Name: idx_brand_products_brand_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_brand_products_brand_active ON public.brand_products USING btree (brand_template_id, is_active, is_featured DESC) WHERE (brand_template_id IS NOT NULL);


--
-- Name: idx_brand_products_brand_template_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_brand_products_brand_template_id ON public.brand_products USING btree (brand_template_id);


--
-- Name: idx_brand_products_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_brand_products_organization_id ON public.brand_products USING btree (organization_id);


--
-- Name: idx_brand_templates_content_pillars; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_brand_templates_content_pillars ON public.brand_templates USING gin (content_pillars);


--
-- Name: idx_brand_templates_country; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_brand_templates_country ON public.brand_templates USING btree (country_code);


--
-- Name: idx_brand_templates_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_brand_templates_deleted_at ON public.brand_templates USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);


--
-- Name: idx_brand_templates_global_pack; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_brand_templates_global_pack ON public.brand_templates USING btree (global_pack_id);


--
-- Name: idx_brand_templates_industry_template; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_brand_templates_industry_template ON public.brand_templates USING btree (industry_template_id);


--
-- Name: idx_brand_templates_industry_template_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_brand_templates_industry_template_id ON public.brand_templates USING btree (industry_template_id);


--
-- Name: idx_brand_templates_jurisdiction; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_brand_templates_jurisdiction ON public.brand_templates USING btree (jurisdiction_code);


--
-- Name: idx_brand_templates_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_brand_templates_org ON public.brand_templates USING btree (organization_id);


--
-- Name: idx_brand_templates_org_industry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_brand_templates_org_industry ON public.brand_templates USING btree (organization_id, industry_template_id) WHERE (organization_id IS NOT NULL);


--
-- Name: idx_cache_brand_template; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_brand_template ON public.ai_response_cache USING btree (brand_template_id) WHERE (brand_template_id IS NOT NULL);


--
-- Name: idx_cache_cleanup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_cleanup ON public.ai_response_cache USING btree (expires_at);


--
-- Name: idx_cache_input_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_input_hash ON public.ai_response_cache USING btree (input_hash);


--
-- Name: idx_cache_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_lookup ON public.ai_response_cache USING btree (cache_key, expires_at);


--
-- Name: idx_cache_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_org ON public.ai_response_cache USING btree (organization_id) WHERE (organization_id IS NOT NULL);


--
-- Name: idx_cache_scope_function; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cache_scope_function ON public.ai_response_cache USING btree (cache_scope, function_name);


--
-- Name: idx_calendar_notes_org_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calendar_notes_org_date ON public.calendar_notes USING btree (organization_id, note_date);


--
-- Name: idx_campaign_contents_campaign; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_contents_campaign ON public.campaign_contents USING btree (campaign_id);


--
-- Name: idx_campaign_contents_content; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_contents_content ON public.campaign_contents USING btree (content_type, content_id);


--
-- Name: idx_campaign_kpi_logs_campaign; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_kpi_logs_campaign ON public.campaign_kpi_logs USING btree (campaign_id);


--
-- Name: idx_campaign_kpi_logs_logged_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_kpi_logs_logged_at ON public.campaign_kpi_logs USING btree (logged_at);


--
-- Name: idx_campaign_milestones_campaign; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_milestones_campaign ON public.campaign_milestones USING btree (campaign_id);


--
-- Name: idx_campaign_milestones_due_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_milestones_due_date ON public.campaign_milestones USING btree (due_date);


--
-- Name: idx_campaign_notification_logs_campaign; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_notification_logs_campaign ON public.campaign_notification_logs USING btree (campaign_id);


--
-- Name: idx_campaign_notification_logs_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_notification_logs_key ON public.campaign_notification_logs USING btree (notification_key);


--
-- Name: idx_campaigns_brand; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaigns_brand ON public.campaigns USING btree (brand_template_id);


--
-- Name: idx_campaigns_dates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaigns_dates ON public.campaigns USING btree (start_date, end_date);


--
-- Name: idx_campaigns_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaigns_org ON public.campaigns USING btree (organization_id);


--
-- Name: idx_campaigns_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaigns_status ON public.campaigns USING btree (status);


--
-- Name: idx_carousel_images_carousel_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_carousel_images_carousel_id ON public.carousel_images USING btree (carousel_id);


--
-- Name: idx_carousel_images_selected; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_carousel_images_selected ON public.carousel_images USING btree (carousel_id, slide_number) WHERE (is_selected = true);


--
-- Name: idx_carousels_brand_template_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_carousels_brand_template_id ON public.carousels USING btree (brand_template_id);


--
-- Name: idx_carousels_campaign; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_carousels_campaign ON public.carousels USING btree (campaign_id);


--
-- Name: idx_carousels_critique_score; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_carousels_critique_score ON public.carousels USING btree (critique_score) WHERE (critique_score IS NOT NULL);


--
-- Name: idx_carousels_industry_template_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_carousels_industry_template_id ON public.carousels USING btree (industry_template_id) WHERE (industry_template_id IS NOT NULL);


--
-- Name: idx_carousels_needs_review; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_carousels_needs_review ON public.carousels USING btree (needs_manual_review) WHERE (needs_manual_review = true);


--
-- Name: idx_carousels_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_carousels_org ON public.carousels USING btree (organization_id);


--
-- Name: idx_carousels_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_carousels_status ON public.carousels USING btree (status);


--
-- Name: idx_category_translations_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_category_translations_lookup ON public.industry_category_translations USING btree (category_id, language_code);


--
-- Name: idx_ce_node_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ce_node_name ON public.content_embeddings USING btree (node_name);


--
-- Name: idx_ce_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ce_session ON public.content_embeddings USING btree (session_id);


--
-- Name: idx_channel_image_history_version; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_channel_image_history_version ON public.channel_image_history USING btree (content_id, channel, version DESC);


--
-- Name: idx_character_profiles_brand; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_character_profiles_brand ON public.character_profiles USING btree (brand_template_id);


--
-- Name: idx_character_profiles_default_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_character_profiles_default_role ON public.character_profiles USING btree (organization_id, brand_template_id, default_role);


--
-- Name: idx_character_profiles_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_character_profiles_org ON public.character_profiles USING btree (organization_id);


--
-- Name: idx_chat_conversation_messages_conv; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_conversation_messages_conv ON public.chat_conversation_messages USING btree (conversation_id);


--
-- Name: idx_chat_conversation_messages_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_conversation_messages_created ON public.chat_conversation_messages USING btree (created_at);


--
-- Name: idx_chat_conversations_brand; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_conversations_brand ON public.chat_conversations USING btree (brand_template_id);


--
-- Name: idx_chat_conversations_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_conversations_org ON public.chat_conversations USING btree (organization_id);


--
-- Name: idx_chat_conversations_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_conversations_updated ON public.chat_conversations USING btree (updated_at DESC);


--
-- Name: idx_chat_conversations_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_conversations_user ON public.chat_conversations USING btree (user_id);


--
-- Name: idx_chat_conversations_user_brand; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_conversations_user_brand ON public.chat_conversations USING btree (user_id, brand_template_id, updated_at DESC) WHERE (user_id IS NOT NULL);


--
-- Name: idx_chat_feedback_brand_template; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_feedback_brand_template ON public.chat_feedback USING btree (brand_template_id);


--
-- Name: idx_chat_feedback_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_feedback_created_at ON public.chat_feedback USING btree (created_at DESC);


--
-- Name: idx_chat_feedback_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_feedback_user_id ON public.chat_feedback USING btree (user_id);


--
-- Name: idx_circuit_breaker_events_model; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_circuit_breaker_events_model ON public.circuit_breaker_events USING btree (model, tripped_at DESC);


--
-- Name: idx_competitor_profiles_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_competitor_profiles_org ON public.competitor_profiles USING btree (organization_id);


--
-- Name: idx_content_embeddings_org_brand_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_content_embeddings_org_brand_type ON public.content_embeddings USING btree (organization_id, brand_template_id, content_type) WHERE (organization_id IS NOT NULL);


--
-- Name: idx_content_feedback_trace_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_content_feedback_trace_id ON public.content_feedback USING btree (trace_id);


--
-- Name: idx_content_feedback_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_content_feedback_user_id ON public.content_feedback USING btree (user_id);


--
-- Name: idx_content_learnings_brand; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_content_learnings_brand ON public.content_learnings USING btree (brand_template_id);


--
-- Name: idx_content_learnings_channel; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_content_learnings_channel ON public.content_learnings USING btree (channel);


--
-- Name: idx_content_learnings_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_content_learnings_created ON public.content_learnings USING btree (created_at DESC);


--
-- Name: idx_content_learnings_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_content_learnings_org ON public.content_learnings USING btree (organization_id);


--
-- Name: idx_content_publishing_logs_content_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_content_publishing_logs_content_id ON public.content_publishing_logs USING btree (content_id);


--
-- Name: idx_content_publishing_logs_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_content_publishing_logs_org_id ON public.content_publishing_logs USING btree (organization_id);


--
-- Name: idx_content_schedules_content_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_content_schedules_content_id ON public.content_schedules USING btree (content_id);


--
-- Name: idx_content_schedules_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_content_schedules_org_id ON public.content_schedules USING btree (organization_id);


--
-- Name: idx_content_schedules_scheduled_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_content_schedules_scheduled_at ON public.content_schedules USING btree (scheduled_at);


--
-- Name: idx_conversation_embeddings_brand; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversation_embeddings_brand ON public.conversation_embeddings USING btree (brand_template_id) WHERE (brand_template_id IS NOT NULL);


--
-- Name: idx_conversation_embeddings_conversation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversation_embeddings_conversation ON public.conversation_embeddings USING btree (conversation_id);


--
-- Name: idx_conversation_embeddings_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversation_embeddings_created ON public.conversation_embeddings USING btree (created_at DESC);


--
-- Name: idx_conversation_embeddings_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversation_embeddings_org ON public.conversation_embeddings USING btree (organization_id) WHERE (organization_id IS NOT NULL);


--
-- Name: idx_conversation_embeddings_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversation_embeddings_type ON public.conversation_embeddings USING btree (embedding_type);


--
-- Name: idx_conversation_embeddings_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversation_embeddings_user ON public.conversation_embeddings USING btree (user_id);


--
-- Name: idx_conversation_embeddings_vector; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversation_embeddings_vector ON public.conversation_embeddings USING hnsw (embedding extensions.vector_cosine_ops) WITH (m='16', ef_construction='64');


--
-- Name: idx_core_contents_brand; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_core_contents_brand ON public.core_contents USING btree (brand_template_id);


--
-- Name: idx_core_contents_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_core_contents_created ON public.core_contents USING btree (created_at DESC);


--
-- Name: idx_core_contents_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_core_contents_org ON public.core_contents USING btree (organization_id);


--
-- Name: idx_core_contents_quality_mode; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_core_contents_quality_mode ON public.core_contents USING btree (((generation_metadata ->> 'qualityMode'::text)));


--
-- Name: idx_core_contents_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_core_contents_status ON public.core_contents USING btree (status);


--
-- Name: idx_core_contents_topic; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_core_contents_topic ON public.core_contents USING btree (topic);


--
-- Name: idx_countries_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_countries_active ON public.countries USING btree (is_active, sort_order);


--
-- Name: idx_crawl_history_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_crawl_history_source ON public.regulation_crawl_history USING btree (source_id);


--
-- Name: idx_crawl_history_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_crawl_history_status ON public.regulation_crawl_history USING btree (status);


--
-- Name: idx_creative_scores_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_creative_scores_org ON public.ad_copy_creative_scores USING btree (organization_id);


--
-- Name: idx_creative_scores_variation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_creative_scores_variation ON public.ad_copy_creative_scores USING btree (variation_id);


--
-- Name: idx_cron_run_logs_job_started; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cron_run_logs_job_started ON public.cron_run_logs USING btree (job_name, started_at DESC);


--
-- Name: idx_cron_run_logs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cron_run_logs_status ON public.cron_run_logs USING btree (status);


--
-- Name: idx_curated_events_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_curated_events_date ON public.curated_events USING btree (event_date);


--
-- Name: idx_curated_events_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_curated_events_org ON public.curated_events USING btree (organization_id);


--
-- Name: idx_curated_news_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_curated_news_expires ON public.curated_news USING btree (expires_at);


--
-- Name: idx_curated_news_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_curated_news_org ON public.curated_news USING btree (organization_id);


--
-- Name: idx_customer_personas_brand_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_personas_brand_priority ON public.customer_personas USING btree (brand_template_id, priority_score DESC) WHERE (brand_template_id IS NOT NULL);


--
-- Name: idx_customer_personas_brand_template; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_personas_brand_template ON public.customer_personas USING btree (brand_template_id);


--
-- Name: idx_customer_personas_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_personas_org ON public.customer_personas USING btree (organization_id);


--
-- Name: idx_customer_personas_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_personas_source ON public.customer_personas USING btree (source_industry_persona_id) WHERE (source_industry_persona_id IS NOT NULL);


--
-- Name: idx_duplicate_ignore_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_duplicate_ignore_lookup ON public.duplicate_ignore_list USING btree (node_id_1, node_id_2);


--
-- Name: idx_efds_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_efds_date ON public.edge_function_daily_stats USING btree (stat_date DESC);


--
-- Name: idx_efds_function; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_efds_function ON public.edge_function_daily_stats USING btree (function_name, stat_date DESC);


--
-- Name: idx_efm_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_efm_created ON public.edge_function_metrics USING btree (created_at DESC);


--
-- Name: idx_efm_function_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_efm_function_created ON public.edge_function_metrics USING btree (function_name, created_at DESC);


--
-- Name: idx_els_brand; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_els_brand ON public.external_link_sources USING btree (brand_template_id);


--
-- Name: idx_els_keywords; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_els_keywords ON public.external_link_sources USING gin (keywords);


--
-- Name: idx_els_org_domain; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_els_org_domain ON public.external_link_sources USING btree (organization_id, domain);


--
-- Name: idx_els_org_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_els_org_source ON public.external_link_sources USING btree (organization_id, source_type);


--
-- Name: idx_els_title_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_els_title_trgm ON public.external_link_sources USING gin (title public.gin_trgm_ops);


--
-- Name: idx_fb_oauth_sessions_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fb_oauth_sessions_expires_at ON public.facebook_oauth_sessions USING btree (expires_at);


--
-- Name: idx_fb_oauth_sessions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fb_oauth_sessions_user_id ON public.facebook_oauth_sessions USING btree (user_id);


--
-- Name: idx_generation_tasks_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_generation_tasks_expires ON public.generation_tasks USING btree (expires_at);


--
-- Name: idx_generation_tasks_user_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_generation_tasks_user_status ON public.generation_tasks USING btree (user_id, status);


--
-- Name: idx_geo_action_tasks_org_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_geo_action_tasks_org_status ON public.geo_action_tasks USING btree (organization_id, status);


--
-- Name: idx_geo_alert_history_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_geo_alert_history_org ON public.geo_alert_history USING btree (organization_id, is_read, created_at DESC);


--
-- Name: idx_geo_content_scores_content; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_geo_content_scores_content ON public.geo_content_scores USING btree (content_id, content_type);


--
-- Name: idx_geo_monitoring_results_composite; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_geo_monitoring_results_composite ON public.geo_monitoring_results USING btree (brand_monitor_id, ai_engine, scanned_at DESC);


--
-- Name: idx_geo_monitoring_results_monitor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_geo_monitoring_results_monitor ON public.geo_monitoring_results USING btree (brand_monitor_id, scanned_at DESC);


--
-- Name: idx_geo_monitoring_results_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_geo_monitoring_results_org ON public.geo_monitoring_results USING btree (organization_id);


--
-- Name: idx_geo_prompts_monitor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_geo_prompts_monitor ON public.geo_prompts USING btree (brand_monitor_id, is_active);


--
-- Name: idx_geo_scan_jobs_monitor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_geo_scan_jobs_monitor ON public.geo_scan_jobs USING btree (brand_monitor_id, status);


--
-- Name: idx_geo_scan_jobs_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_geo_scan_jobs_org ON public.geo_scan_jobs USING btree (organization_id, created_at DESC);


--
-- Name: idx_geo_visibility_snapshots_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_geo_visibility_snapshots_lookup ON public.geo_visibility_snapshots USING btree (brand_monitor_id, snapshot_date DESC);


--
-- Name: idx_global_packs_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_global_packs_active ON public.industry_global_packs USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_global_packs_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_global_packs_category ON public.industry_global_packs USING btree (category_id);


--
-- Name: idx_global_packs_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_global_packs_code ON public.industry_global_packs USING btree (industry_code);


--
-- Name: idx_glossary_translations_glossary; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_glossary_translations_glossary ON public.industry_glossary_translations USING btree (glossary_id);


--
-- Name: idx_glossary_translations_language; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_glossary_translations_language ON public.industry_glossary_translations USING btree (language_code);


--
-- Name: idx_gsc_conn_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gsc_conn_active ON public.gsc_connections USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_gsc_conn_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gsc_conn_org ON public.gsc_connections USING btree (organization_id);


--
-- Name: idx_gsc_metrics_conn_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gsc_metrics_conn_date ON public.gsc_metrics_daily USING btree (connection_id, date DESC);


--
-- Name: idx_gsc_metrics_org_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gsc_metrics_org_date ON public.gsc_metrics_daily USING btree (organization_id, date DESC);


--
-- Name: idx_gsc_metrics_query; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gsc_metrics_query ON public.gsc_metrics_daily USING btree (query) WHERE (query IS NOT NULL);


--
-- Name: idx_gsc_runs_conn; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gsc_runs_conn ON public.gsc_sync_runs USING btree (connection_id, started_at DESC);


--
-- Name: idx_image_history_content_channel; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_image_history_content_channel ON public.channel_image_history USING btree (content_id, channel);


--
-- Name: idx_image_history_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_image_history_org ON public.channel_image_history USING btree (organization_id);


--
-- Name: idx_industry_categories_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_industry_categories_active ON public.industry_categories USING btree (is_active, sort_order);


--
-- Name: idx_industry_glossary_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_industry_glossary_active ON public.industry_glossary USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_industry_glossary_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_industry_glossary_category ON public.industry_glossary USING btree (category);


--
-- Name: idx_industry_glossary_template; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_industry_glossary_template ON public.industry_glossary USING btree (industry_template_id);


--
-- Name: idx_industry_glossary_term; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_industry_glossary_term ON public.industry_glossary USING btree (term);


--
-- Name: idx_industry_memory_versions_template; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_industry_memory_versions_template ON public.industry_memory_versions USING btree (industry_template_id, created_at DESC);


--
-- Name: idx_industry_packs_hierarchy; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_industry_packs_hierarchy ON public.industry_global_packs USING btree (category_id, industry_level, sort_order);


--
-- Name: idx_industry_packs_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_industry_packs_level ON public.industry_global_packs USING btree (industry_level);


--
-- Name: idx_industry_packs_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_industry_packs_parent ON public.industry_global_packs USING btree (parent_pack_id);


--
-- Name: idx_industry_packs_popular; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_industry_packs_popular ON public.industry_global_packs USING btree (is_popular, popular_sort_order) WHERE (is_popular = true);


--
-- Name: idx_industry_persona_translations_persona; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_industry_persona_translations_persona ON public.industry_persona_translations USING btree (industry_persona_id);


--
-- Name: idx_industry_persona_translations_v2_lang; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_industry_persona_translations_v2_lang ON public.industry_persona_translations_v2 USING btree (language_code);


--
-- Name: idx_industry_persona_translations_v2_persona; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_industry_persona_translations_v2_persona ON public.industry_persona_translations_v2 USING btree (persona_id);


--
-- Name: idx_industry_personas_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_industry_personas_active ON public.industry_personas USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_industry_personas_template; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_industry_personas_template ON public.industry_personas USING btree (industry_template_id);


--
-- Name: idx_industry_personas_v2_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_industry_personas_v2_active ON public.industry_personas_v2 USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_industry_personas_v2_global_pack; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_industry_personas_v2_global_pack ON public.industry_personas_v2 USING btree (global_pack_id);


--
-- Name: idx_industry_search_aliases_lang; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_industry_search_aliases_lang ON public.industry_search_aliases USING btree (language_code);


--
-- Name: idx_industry_search_aliases_pack; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_industry_search_aliases_pack ON public.industry_search_aliases USING btree (pack_id);


--
-- Name: idx_industry_templates_argument_patterns; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_industry_templates_argument_patterns ON public.industry_templates USING gin (argument_patterns);


--
-- Name: idx_industry_templates_brand_voice; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_industry_templates_brand_voice ON public.industry_templates USING gin (brand_voice);


--
-- Name: idx_industry_templates_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_industry_templates_category ON public.industry_templates USING btree (category_id);


--
-- Name: idx_industry_templates_claim_restrictions; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_industry_templates_claim_restrictions ON public.industry_templates USING gin (claim_restrictions);


--
-- Name: idx_industry_templates_compliance_rules; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_industry_templates_compliance_rules ON public.industry_templates USING gin (compliance_rules);


--
-- Name: idx_industry_templates_country; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_industry_templates_country ON public.industry_templates USING btree (country_id, is_active);


--
-- Name: idx_industry_templates_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_industry_templates_deleted_at ON public.industry_templates USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);


--
-- Name: idx_industry_templates_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_industry_templates_lookup ON public.industry_templates USING btree (country_id, code);


--
-- Name: idx_industry_templates_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_industry_templates_status ON public.industry_templates USING btree (status);


--
-- Name: idx_industry_templates_system_rules; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_industry_templates_system_rules ON public.industry_templates USING gin (system_rules);


--
-- Name: idx_insight_analytics_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_insight_analytics_type ON public.insight_analytics USING btree (insight_type, action_type);


--
-- Name: idx_insight_analytics_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_insight_analytics_user ON public.insight_analytics USING btree (user_id, created_at);


--
-- Name: idx_internal_links_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_internal_links_org ON public.internal_links USING btree (organization_id);


--
-- Name: idx_internal_links_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_internal_links_source ON public.internal_links USING btree (source_content_id);


--
-- Name: idx_journey_stage_messaging_mapping_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_journey_stage_messaging_mapping_id ON public.journey_stage_messaging USING btree (mapping_id);


--
-- Name: idx_journey_stage_messaging_mapping_stage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_journey_stage_messaging_mapping_stage ON public.journey_stage_messaging USING btree (mapping_id, journey_stage);


--
-- Name: idx_journey_stage_messaging_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_journey_stage_messaging_org_id ON public.journey_stage_messaging USING btree (organization_id) WHERE (organization_id IS NOT NULL);


--
-- Name: idx_jurisdiction_profiles_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jurisdiction_profiles_code ON public.industry_jurisdiction_profiles USING btree (jurisdiction_code);


--
-- Name: idx_jurisdiction_profiles_global_pack; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jurisdiction_profiles_global_pack ON public.industry_jurisdiction_profiles USING btree (global_pack_id);


--
-- Name: idx_jurisdiction_profiles_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jurisdiction_profiles_status ON public.industry_jurisdiction_profiles USING btree (validity_status);


--
-- Name: idx_keyword_enrichment_jobs_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_keyword_enrichment_jobs_org ON public.keyword_enrichment_jobs USING btree (organization_id, created_at DESC);


--
-- Name: idx_keyword_jobs_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_keyword_jobs_org ON public.keyword_research_jobs USING btree (organization_id);


--
-- Name: idx_keyword_jobs_org_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_keyword_jobs_org_created ON public.keyword_research_jobs USING btree (organization_id, created_at DESC);


--
-- Name: idx_keyword_jobs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_keyword_jobs_status ON public.keyword_research_jobs USING btree (status);


--
-- Name: idx_kg_analytics_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kg_analytics_created_at ON public.knowledge_graph_analytics USING btree (created_at DESC);


--
-- Name: idx_kg_analytics_query_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kg_analytics_query_type ON public.knowledge_graph_analytics USING btree (query_type);


--
-- Name: idx_kg_cache_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kg_cache_expires ON public.knowledge_graph_cache USING btree (expires_at);


--
-- Name: idx_knowledge_edges_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledge_edges_source ON public.industry_knowledge_edges USING btree (source_node_id);


--
-- Name: idx_knowledge_edges_target; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledge_edges_target ON public.industry_knowledge_edges USING btree (target_node_id);


--
-- Name: idx_knowledge_edges_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledge_edges_type ON public.industry_knowledge_edges USING btree (edge_type);


--
-- Name: idx_knowledge_edges_weight; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledge_edges_weight ON public.industry_knowledge_edges USING btree (weight DESC);


--
-- Name: idx_knowledge_nodes_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledge_nodes_active ON public.industry_knowledge_nodes USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_knowledge_nodes_doc_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledge_nodes_doc_type ON public.industry_knowledge_nodes USING btree (((parsed_structure ->> 'document_type'::text)));


--
-- Name: idx_knowledge_nodes_document_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledge_nodes_document_type ON public.industry_knowledge_nodes USING btree (document_type) WHERE (document_type IS NOT NULL);


--
-- Name: idx_knowledge_nodes_effective_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledge_nodes_effective_date ON public.industry_knowledge_nodes USING btree (effective_date) WHERE (effective_date IS NOT NULL);


--
-- Name: idx_knowledge_nodes_embedding; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledge_nodes_embedding ON public.industry_knowledge_nodes USING ivfflat (embedding extensions.vector_cosine_ops) WITH (lists='100');


--
-- Name: idx_knowledge_nodes_embedding_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledge_nodes_embedding_active ON public.industry_knowledge_nodes USING ivfflat (embedding extensions.vector_cosine_ops) WHERE ((is_active = true) AND (embedding IS NOT NULL));


--
-- Name: idx_knowledge_nodes_embedding_not_null; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledge_nodes_embedding_not_null ON public.industry_knowledge_nodes USING btree (id) WHERE (embedding IS NOT NULL);


--
-- Name: idx_knowledge_nodes_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledge_nodes_key ON public.industry_knowledge_nodes USING btree (node_key);


--
-- Name: idx_knowledge_nodes_pack; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledge_nodes_pack ON public.industry_knowledge_nodes USING btree (global_pack_id);


--
-- Name: idx_knowledge_nodes_parse_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledge_nodes_parse_status ON public.industry_knowledge_nodes USING btree (parse_status) WHERE (parse_status <> 'parsed'::text);


--
-- Name: idx_knowledge_nodes_quality_score; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledge_nodes_quality_score ON public.industry_knowledge_nodes USING btree (content_quality_score) WHERE (content_quality_score IS NOT NULL);


--
-- Name: idx_knowledge_nodes_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledge_nodes_type ON public.industry_knowledge_nodes USING btree (node_type);


--
-- Name: idx_knowledge_nodes_type_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledge_nodes_type_active ON public.industry_knowledge_nodes USING btree (node_type, is_active);


--
-- Name: idx_kpi_adjustment_dismissals_campaign; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kpi_adjustment_dismissals_campaign ON public.kpi_adjustment_dismissals USING btree (campaign_id);


--
-- Name: idx_kpi_adjustment_dismissals_until; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kpi_adjustment_dismissals_until ON public.kpi_adjustment_dismissals USING btree (dismissed_until);


--
-- Name: idx_mcc_cluster_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mcc_cluster_id ON public.multi_channel_contents USING btree (cluster_id);


--
-- Name: idx_mcc_core_content; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mcc_core_content ON public.multi_channel_contents USING btree (core_content_id);


--
-- Name: idx_mcc_embedding; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mcc_embedding ON public.multi_channel_contents USING ivfflat (content_embedding extensions.vector_cosine_ops) WITH (lists='100');


--
-- Name: idx_mcc_has_published_url; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mcc_has_published_url ON public.multi_channel_contents USING btree (organization_id) WHERE ((website_post_url IS NOT NULL) OR (blogger_post_url IS NOT NULL) OR (wordpress_post_url IS NOT NULL) OR (flowa_blog_post_url IS NOT NULL));


--
-- Name: idx_mcc_pinterest_post_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mcc_pinterest_post_id ON public.multi_channel_contents USING btree (pinterest_post_id) WHERE (pinterest_post_id IS NOT NULL);


--
-- Name: idx_mcc_target_keywords; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mcc_target_keywords ON public.multi_channel_contents USING gin (target_keyword_ids);


--
-- Name: idx_multi_channel_contents_content_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_multi_channel_contents_content_role ON public.multi_channel_contents USING btree (content_role);


--
-- Name: idx_multi_channel_contents_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_multi_channel_contents_status ON public.multi_channel_contents USING btree (status);


--
-- Name: idx_multi_channel_contents_tags; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_multi_channel_contents_tags ON public.multi_channel_contents USING gin (tags);


--
-- Name: idx_multi_channel_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_multi_channel_org ON public.multi_channel_contents USING btree (organization_id);


--
-- Name: idx_multichannel_critique_score; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_multichannel_critique_score ON public.multi_channel_contents USING btree (critique_score) WHERE (critique_score IS NOT NULL);


--
-- Name: idx_multichannel_needs_review; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_multichannel_needs_review ON public.multi_channel_contents USING btree (needs_manual_review) WHERE (needs_manual_review = true);


--
-- Name: idx_mv_compliance_industry_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mv_compliance_industry_code ON public.mv_resolved_compliance_rules USING btree (industry_code);


--
-- Name: idx_mv_compliance_jurisdiction; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mv_compliance_jurisdiction ON public.mv_resolved_compliance_rules USING btree (jurisdiction_code);


--
-- Name: idx_mv_compliance_pack_jurisdiction; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mv_compliance_pack_jurisdiction ON public.mv_resolved_compliance_rules USING btree (global_pack_id, jurisdiction_code);


--
-- Name: idx_mv_compliance_rules_pk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_mv_compliance_rules_pk ON public.mv_resolved_compliance_rules USING btree (jurisdiction_profile_id);


--
-- Name: idx_nodes_content_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nodes_content_hash ON public.industry_knowledge_nodes USING btree (content_hash) WHERE (content_hash IS NOT NULL);


--
-- Name: idx_nodes_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nodes_source ON public.industry_knowledge_nodes USING btree (source_id) WHERE (source_id IS NOT NULL);


--
-- Name: idx_oauth_pending_states_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_oauth_pending_states_expires ON public.oauth_pending_states USING btree (expires_at);


--
-- Name: idx_oauth_pending_states_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_oauth_pending_states_user ON public.oauth_pending_states USING btree (user_id);


--
-- Name: idx_optimization_suggestions_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_optimization_suggestions_org ON public.ad_copy_optimization_suggestions USING btree (organization_id);


--
-- Name: idx_optimization_suggestions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_optimization_suggestions_status ON public.ad_copy_optimization_suggestions USING btree (status);


--
-- Name: idx_optimization_suggestions_variation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_optimization_suggestions_variation ON public.ad_copy_optimization_suggestions USING btree (variation_id);


--
-- Name: idx_orchestrator_daily_stats_org_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orchestrator_daily_stats_org_date ON public.orchestrator_daily_stats USING btree (organization_id, date DESC);


--
-- Name: idx_org_members_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_org_members_org ON public.organization_members USING btree (organization_id);


--
-- Name: idx_org_members_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_org_members_user ON public.organization_members USING btree (user_id);


--
-- Name: idx_organizations_owner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_organizations_owner ON public.organizations USING btree (owner_id);


--
-- Name: idx_organizations_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_organizations_slug ON public.organizations USING btree (slug);


--
-- Name: idx_pack_translations_global_pack; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pack_translations_global_pack ON public.industry_pack_translations USING btree (global_pack_id);


--
-- Name: idx_pack_translations_lang; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pack_translations_lang ON public.industry_pack_translations USING btree (language_code);


--
-- Name: idx_payment_orders_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_orders_org ON public.payment_orders USING btree (organization_id);


--
-- Name: idx_payment_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_orders_status ON public.payment_orders USING btree (status);


--
-- Name: idx_payment_orders_txn_ref; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_orders_txn_ref ON public.payment_orders USING btree (vnpay_txn_ref);


--
-- Name: idx_pinterest_boards_connection; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pinterest_boards_connection ON public.pinterest_boards USING btree (connection_id);


--
-- Name: idx_pinterest_boards_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pinterest_boards_org ON public.pinterest_boards USING btree (organization_id);


--
-- Name: idx_prediction_history_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prediction_history_org ON public.ad_copy_prediction_history USING btree (organization_id);


--
-- Name: idx_prediction_history_variation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prediction_history_variation ON public.ad_copy_prediction_history USING btree (variation_id);


--
-- Name: idx_product_persona_mappings_brand; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_persona_mappings_brand ON public.product_persona_mappings USING btree (brand_template_id);


--
-- Name: idx_product_persona_mappings_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_persona_mappings_org ON public.product_persona_mappings USING btree (organization_id);


--
-- Name: idx_product_persona_mappings_persona; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_persona_mappings_persona ON public.product_persona_mappings USING btree (persona_id);


--
-- Name: idx_product_persona_mappings_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_persona_mappings_product ON public.product_persona_mappings USING btree (product_id);


--
-- Name: idx_prompt_analytics_brand; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prompt_analytics_brand ON public.prompt_analytics USING btree (brand_template_id);


--
-- Name: idx_prompt_analytics_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prompt_analytics_created ON public.prompt_analytics USING btree (created_at DESC);


--
-- Name: idx_prompt_analytics_function; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prompt_analytics_function ON public.prompt_analytics USING btree (function_name);


--
-- Name: idx_prompt_analytics_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prompt_analytics_org ON public.prompt_analytics USING btree (organization_id);


--
-- Name: idx_propagation_pack; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_propagation_pack ON public.regulation_propagation_log USING btree (affected_pack_id);


--
-- Name: idx_propagation_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_propagation_priority ON public.regulation_propagation_log USING btree (priority);


--
-- Name: idx_propagation_review_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_propagation_review_status ON public.regulation_propagation_log USING btree (review_status) WHERE (review_status = 'pending'::text);


--
-- Name: idx_propagation_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_propagation_status ON public.regulation_propagation_log USING btree (propagation_status);


--
-- Name: idx_publish_attempts_content; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_publish_attempts_content ON public.publish_attempts USING btree (content_id);


--
-- Name: idx_publish_attempts_schedule; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_publish_attempts_schedule ON public.publish_attempts USING btree (schedule_id);


--
-- Name: idx_publish_attempts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_publish_attempts_status ON public.publish_attempts USING btree (status, attempted_at);


--
-- Name: idx_rank_history_keyword; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rank_history_keyword ON public.seo_rank_history USING btree (keyword_id, checked_at DESC);


--
-- Name: idx_rank_history_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rank_history_org ON public.seo_rank_history USING btree (organization_id, checked_at DESC);


--
-- Name: idx_rank_runs_org_started; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rank_runs_org_started ON public.seo_rank_tracker_runs USING btree (organization_id, started_at DESC);


--
-- Name: idx_regulation_sources_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_regulation_sources_active ON public.regulation_sources USING btree (is_active);


--
-- Name: idx_regulation_sources_jurisdiction; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_regulation_sources_jurisdiction ON public.regulation_sources USING btree (jurisdiction);


--
-- Name: idx_regulation_sources_next_crawl; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_regulation_sources_next_crawl ON public.regulation_sources USING btree (next_crawl_at) WHERE (is_active = true);


--
-- Name: idx_regulation_versions_node_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_regulation_versions_node_id ON public.regulation_versions USING btree (node_id);


--
-- Name: idx_render_jobs_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_render_jobs_pending ON public.video_render_jobs USING btree (last_polled_at NULLS FIRST) WHERE (status = 'processing'::text);


--
-- Name: idx_render_jobs_script; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_render_jobs_script ON public.video_render_jobs USING btree (script_id, created_at DESC) WHERE (script_id IS NOT NULL);


--
-- Name: idx_render_jobs_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_render_jobs_user ON public.video_render_jobs USING btree (user_id);


--
-- Name: idx_resolved_rules_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_resolved_rules_gin ON public.industry_jurisdiction_profiles USING gin (resolved_rules);


--
-- Name: idx_rss_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rss_org_id ON public.report_sync_state USING btree (organization_id);


--
-- Name: idx_rss_platform; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rss_platform ON public.report_sync_state USING btree (platform);


--
-- Name: idx_rss_unique_connection; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_rss_unique_connection ON public.report_sync_state USING btree (connection_id) WHERE (connection_id IS NOT NULL);


--
-- Name: idx_sales_chat_analytics_converted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_chat_analytics_converted ON public.sales_chat_analytics USING btree (converted);


--
-- Name: idx_sales_chat_analytics_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_chat_analytics_created ON public.sales_chat_analytics USING btree (created_at DESC);


--
-- Name: idx_sales_chat_analytics_intent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_chat_analytics_intent ON public.sales_chat_analytics USING btree (detected_intent);


--
-- Name: idx_sales_chat_analytics_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_chat_analytics_session ON public.sales_chat_analytics USING btree (session_id);


--
-- Name: idx_sales_chat_leads_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_chat_leads_created ON public.sales_chat_leads USING btree (created_at DESC);


--
-- Name: idx_sales_chat_leads_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_chat_leads_session ON public.sales_chat_leads USING btree (session_id);


--
-- Name: idx_sales_chat_leads_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_chat_leads_status ON public.sales_chat_leads USING btree (status);


--
-- Name: idx_sales_chat_leads_visitor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_chat_leads_visitor ON public.sales_chat_leads USING btree (visitor_id);


--
-- Name: idx_sales_chat_messages_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_chat_messages_created ON public.sales_chat_messages_log USING btree (created_at DESC);


--
-- Name: idx_sales_chat_messages_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_chat_messages_session ON public.sales_chat_messages_log USING btree (session_id);


--
-- Name: idx_sales_chat_messages_topic; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_chat_messages_topic ON public.sales_chat_messages_log USING btree (topic);


--
-- Name: idx_saved_audiences_brand; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_saved_audiences_brand ON public.saved_audiences USING btree (brand_template_id);


--
-- Name: idx_saved_audiences_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_saved_audiences_org ON public.saved_audiences USING btree (organization_id);


--
-- Name: idx_saved_audiences_persona; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_saved_audiences_persona ON public.saved_audiences USING btree (source_persona_id);


--
-- Name: idx_script_approvals_script_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_script_approvals_script_id ON public.script_approvals USING btree (script_id);


--
-- Name: idx_script_approvals_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_script_approvals_status ON public.script_approvals USING btree (status);


--
-- Name: idx_script_versions_script_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_script_versions_script_id ON public.script_versions USING btree (script_id);


--
-- Name: idx_script_versions_version; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_script_versions_version ON public.script_versions USING btree (script_id, version DESC);


--
-- Name: idx_scripts_analyzed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scripts_analyzed_at ON public.scripts USING btree (analyzed_at) WHERE (analyzed_at IS NOT NULL);


--
-- Name: idx_scripts_brand_template_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scripts_brand_template_id ON public.scripts USING btree (brand_template_id);


--
-- Name: idx_scripts_campaign; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scripts_campaign ON public.scripts USING btree (campaign_id);


--
-- Name: idx_scripts_critique_score; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scripts_critique_score ON public.scripts USING btree (critique_score) WHERE (critique_score IS NOT NULL);


--
-- Name: idx_scripts_industry_template_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scripts_industry_template_id ON public.scripts USING btree (industry_template_id) WHERE (industry_template_id IS NOT NULL);


--
-- Name: idx_scripts_needs_review; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scripts_needs_review ON public.scripts USING btree (needs_manual_review) WHERE (needs_manual_review = true);


--
-- Name: idx_scripts_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scripts_org ON public.scripts USING btree (organization_id);


--
-- Name: idx_scripts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scripts_status ON public.scripts USING btree (status);


--
-- Name: idx_scripts_variant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scripts_variant ON public.scripts USING btree (brand_voice_variant_id) WHERE (brand_voice_variant_id IS NOT NULL);


--
-- Name: idx_security_events_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_security_events_created_at ON public.security_events USING btree (created_at DESC);


--
-- Name: idx_seo_clusters_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_seo_clusters_org ON public.seo_clusters USING btree (organization_id);


--
-- Name: idx_seo_clusters_org_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_seo_clusters_org_status ON public.seo_clusters USING btree (organization_id, status);


--
-- Name: idx_seo_clusters_pillar_kw; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_seo_clusters_pillar_kw ON public.seo_clusters USING btree (pillar_keyword_id);


--
-- Name: idx_seo_keywords_assigned; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_seo_keywords_assigned ON public.seo_keywords USING btree (assigned_landing_page_id);


--
-- Name: idx_seo_keywords_cluster; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_seo_keywords_cluster ON public.seo_keywords USING btree (cluster_id);


--
-- Name: idx_seo_keywords_keyword_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_seo_keywords_keyword_trgm ON public.seo_keywords USING gin (keyword public.gin_trgm_ops);


--
-- Name: idx_seo_keywords_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_seo_keywords_org ON public.seo_keywords USING btree (organization_id);


--
-- Name: idx_seo_keywords_org_status_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_seo_keywords_org_status_priority ON public.seo_keywords USING btree (organization_id, status, priority_score DESC);


--
-- Name: idx_seo_keywords_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_seo_keywords_priority ON public.seo_keywords USING btree (priority_score DESC);


--
-- Name: idx_seo_keywords_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_seo_keywords_status ON public.seo_keywords USING btree (status);


--
-- Name: idx_seo_landing_pages_published; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_seo_landing_pages_published ON public.seo_landing_pages USING btree (is_published, published_at DESC);


--
-- Name: idx_seo_landing_pages_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_seo_landing_pages_slug ON public.seo_landing_pages USING btree (slug);


--
-- Name: idx_seo_landing_pages_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_seo_landing_pages_type ON public.seo_landing_pages USING btree (page_type) WHERE (is_published = true);


--
-- Name: idx_serp_snapshots_keyword_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_serp_snapshots_keyword_at ON public.seo_serp_snapshots USING btree (keyword_id, snapshot_at DESC);


--
-- Name: idx_serp_snapshots_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_serp_snapshots_org ON public.seo_serp_snapshots USING btree (organization_id, snapshot_at DESC);


--
-- Name: idx_social_connections_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_social_connections_active ON public.social_connections USING btree (organization_id, platform, is_active);


--
-- Name: idx_social_connections_brand; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_social_connections_brand ON public.social_connections USING btree (brand_template_id);


--
-- Name: idx_social_connections_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_social_connections_org ON public.social_connections USING btree (organization_id);


--
-- Name: idx_social_connections_org_platform; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_social_connections_org_platform ON public.social_connections USING btree (organization_id, platform) WHERE (organization_id IS NOT NULL);


--
-- Name: idx_social_connections_org_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_social_connections_org_type ON public.social_connections USING btree (organization_id, connection_type);


--
-- Name: idx_social_connections_platform; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_social_connections_platform ON public.social_connections USING btree (platform);


--
-- Name: idx_social_connections_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_social_connections_type ON public.social_connections USING btree (connection_type);


--
-- Name: idx_spe_connection_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_spe_connection_id ON public.social_post_engagements USING btree (connection_id);


--
-- Name: idx_spe_event_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_spe_event_type ON public.social_post_engagements USING btree (event_type);


--
-- Name: idx_spe_facebook_event_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_spe_facebook_event_unique ON public.social_post_engagements USING btree (facebook_event_id) WHERE (facebook_event_id IS NOT NULL);


--
-- Name: idx_spe_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_spe_org_id ON public.social_post_engagements USING btree (organization_id);


--
-- Name: idx_spe_post_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_spe_post_id ON public.social_post_engagements USING btree (post_id);


--
-- Name: idx_spm_brand_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_spm_brand_id ON public.social_post_metrics USING btree (brand_template_id);


--
-- Name: idx_spm_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_spm_org_id ON public.social_post_metrics USING btree (organization_id);


--
-- Name: idx_spm_platform; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_spm_platform ON public.social_post_metrics USING btree (platform);


--
-- Name: idx_spm_post_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_spm_post_id ON public.social_post_metrics USING btree (post_id);


--
-- Name: idx_spm_snapshot_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_spm_snapshot_at ON public.social_post_metrics USING btree (snapshot_at DESC);


--
-- Name: idx_spm_unique_daily; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_spm_unique_daily ON public.social_post_metrics USING btree (connection_id, post_id, (((snapshot_at AT TIME ZONE 'UTC'::text))::date)) WHERE (connection_id IS NOT NULL);


--
-- Name: idx_swipe_files_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_swipe_files_org ON public.ad_swipe_files USING btree (organization_id);


--
-- Name: idx_swipe_files_platform; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_swipe_files_platform ON public.ad_swipe_files USING btree (platform);


--
-- Name: idx_swipe_files_tags; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_swipe_files_tags ON public.ad_swipe_files USING gin (tags);


--
-- Name: idx_telegram_bot_configs_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_telegram_bot_configs_org ON public.telegram_bot_configs USING btree (organization_id);


--
-- Name: idx_telegram_bot_configs_webhook_secret; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_telegram_bot_configs_webhook_secret ON public.telegram_bot_configs USING btree (webhook_secret);


--
-- Name: idx_telegram_chat_bindings_active_brand; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_telegram_chat_bindings_active_brand ON public.telegram_chat_bindings USING btree (active_brand_template_id);


--
-- Name: idx_telegram_chat_bindings_chat; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_telegram_chat_bindings_chat ON public.telegram_chat_bindings USING btree (telegram_chat_id);


--
-- Name: idx_telegram_chat_bindings_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_telegram_chat_bindings_org ON public.telegram_chat_bindings USING btree (organization_id);


--
-- Name: idx_telegram_chat_bindings_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_telegram_chat_bindings_user ON public.telegram_chat_bindings USING btree (user_id);


--
-- Name: idx_telegram_chat_state_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_telegram_chat_state_updated_at ON public.telegram_chat_state USING btree (updated_at);


--
-- Name: idx_telegram_example_cache_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_telegram_example_cache_expires ON public.telegram_example_cache USING btree (expires_at);


--
-- Name: idx_telegram_messages_log_chat; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_telegram_messages_log_chat ON public.telegram_messages_log USING btree (organization_id, chat_id, created_at DESC);


--
-- Name: idx_telegram_notifications_chat; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_telegram_notifications_chat ON public.telegram_notifications USING btree (chat_id, sent_at DESC);


--
-- Name: idx_telegram_pending_links_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_telegram_pending_links_expires ON public.telegram_pending_links USING btree (expires_at);


--
-- Name: idx_telegram_processed_updates_processed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_telegram_processed_updates_processed_at ON public.telegram_processed_updates USING btree (processed_at);


--
-- Name: idx_template_translations_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_template_translations_lookup ON public.industry_template_translations USING btree (industry_template_id, language_code);


--
-- Name: idx_tg_examples_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tg_examples_active ON public.telegram_example_prompts USING btree (is_active, sort_order) WHERE (is_active = true);


--
-- Name: idx_tg_examples_lang; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tg_examples_lang ON public.telegram_example_prompts USING btree (language);


--
-- Name: idx_tg_user_prefs_digest; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tg_user_prefs_digest ON public.telegram_user_preferences USING btree (daily_digest) WHERE (daily_digest = true);


--
-- Name: idx_tg_user_prefs_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tg_user_prefs_org ON public.telegram_user_preferences USING btree (organization_id);


--
-- Name: idx_tg_user_prefs_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tg_user_prefs_user ON public.telegram_user_preferences USING btree (user_id);


--
-- Name: idx_topic_content_links_content; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_topic_content_links_content ON public.topic_content_links USING btree (content_id, content_type);


--
-- Name: idx_topic_content_links_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_topic_content_links_org ON public.topic_content_links USING btree (organization_id);


--
-- Name: idx_topic_content_links_topic; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_topic_content_links_topic ON public.topic_content_links USING btree (topic_history_id);


--
-- Name: idx_topic_content_links_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_topic_content_links_user ON public.topic_content_links USING btree (user_id);


--
-- Name: idx_topic_history_brand; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_topic_history_brand ON public.topic_history USING btree (brand_template_id);


--
-- Name: idx_topic_history_brand_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_topic_history_brand_created ON public.topic_history USING btree (brand_template_id, created_at DESC) WHERE (brand_template_id IS NOT NULL);


--
-- Name: idx_topic_history_campaign; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_topic_history_campaign ON public.topic_history USING btree (campaign_id);


--
-- Name: idx_topic_history_cluster; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_topic_history_cluster ON public.topic_history USING btree (cluster_id);


--
-- Name: idx_topic_history_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_topic_history_created ON public.topic_history USING btree (created_at DESC);


--
-- Name: idx_topic_history_org_goal; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_topic_history_org_goal ON public.topic_history USING btree (organization_id, content_goal);


--
-- Name: idx_topic_history_performance; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_topic_history_performance ON public.topic_history USING btree (performance_score DESC NULLS LAST) WHERE (performance_score IS NOT NULL);


--
-- Name: idx_topic_history_pillar; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_topic_history_pillar ON public.topic_history USING btree (pillar);


--
-- Name: idx_topic_history_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_topic_history_user ON public.topic_history USING btree (user_id);


--
-- Name: idx_trending_topics_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trending_topics_expires ON public.trending_topics USING btree (expires_at);


--
-- Name: idx_trending_topics_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trending_topics_org ON public.trending_topics USING btree (organization_id);


--
-- Name: idx_trending_topics_velocity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trending_topics_velocity ON public.trending_topics USING btree (velocity_score DESC);


--
-- Name: idx_usage_logs_org_type_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usage_logs_org_type_date ON public.usage_logs USING btree (organization_id, usage_type, created_at DESC) WHERE (organization_id IS NOT NULL);


--
-- Name: idx_usage_logs_user_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usage_logs_user_type ON public.usage_logs USING btree (user_id, usage_type, created_at);


--
-- Name: idx_video_generations_pending_poll; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_video_generations_pending_poll ON public.video_generations USING btree (last_polled_at NULLS FIRST) WHERE (status = 'processing'::public.video_generation_status);


--
-- Name: idx_video_generations_script; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_video_generations_script ON public.video_generations USING btree (script_id);


--
-- Name: idx_video_generations_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_video_generations_status ON public.video_generations USING btree (status);


--
-- Name: idx_video_generations_storyboard_scene; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_video_generations_storyboard_scene ON public.video_generations USING btree (storyboard_id, scene_number);


--
-- Name: idx_video_generations_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_video_generations_user ON public.video_generations USING btree (user_id);


--
-- Name: idx_web_search_analytics_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_web_search_analytics_created ON public.web_search_analytics USING btree (created_at DESC);


--
-- Name: idx_web_search_analytics_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_web_search_analytics_org ON public.web_search_analytics USING btree (organization_id);


--
-- Name: idx_web_search_cache_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_web_search_cache_expires ON public.web_search_cache USING btree (expires_at);


--
-- Name: idx_web_search_cache_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_web_search_cache_key ON public.web_search_cache USING btree (cache_key);


--
-- Name: idx_workflow_checkpoints_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflow_checkpoints_session ON public.workflow_checkpoints USING btree (session_id, status, created_at DESC);


--
-- Name: pinterest_oauth_sessions_expires_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pinterest_oauth_sessions_expires_idx ON public.pinterest_oauth_sessions USING btree (expires_at);


--
-- Name: pinterest_oauth_sessions_state_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pinterest_oauth_sessions_state_idx ON public.pinterest_oauth_sessions USING btree (state);


--
-- Name: planned_items_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX planned_items_date_idx ON public.planned_content_items USING btree (scheduled_date);


--
-- Name: planned_items_session_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX planned_items_session_idx ON public.planned_content_items USING btree (session_id);


--
-- Name: planned_items_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX planned_items_status_idx ON public.planned_content_items USING btree (status);


--
-- Name: planning_sessions_conversation_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX planning_sessions_conversation_idx ON public.planning_sessions USING btree (conversation_id);


--
-- Name: planning_sessions_org_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX planning_sessions_org_idx ON public.planning_sessions USING btree (organization_id);


--
-- Name: planning_sessions_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX planning_sessions_status_idx ON public.planning_sessions USING btree (status);


--
-- Name: planning_sessions_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX planning_sessions_user_idx ON public.planning_sessions USING btree (user_id);


--
-- Name: style_patterns_brand_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX style_patterns_brand_idx ON public.content_style_patterns USING btree (brand_template_id);


--
-- Name: style_patterns_category_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX style_patterns_category_idx ON public.content_style_patterns USING btree (pattern_category);


--
-- Name: style_patterns_confidence_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX style_patterns_confidence_idx ON public.content_style_patterns USING btree (confidence_score DESC);


--
-- Name: style_patterns_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX style_patterns_user_idx ON public.content_style_patterns USING btree (user_id);


--
-- Name: telegram_bot_configs_one_default; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX telegram_bot_configs_one_default ON public.telegram_bot_configs USING btree ((true)) WHERE ((organization_id IS NULL) AND (is_default = true));


--
-- Name: uniq_main_character_per_brand; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_main_character_per_brand ON public.character_profiles USING btree (brand_template_id) WHERE ((default_role = 'main'::text) AND (brand_template_id IS NOT NULL));


--
-- Name: uq_tg_bindings_active_private_org_user; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_tg_bindings_active_private_org_user ON public.telegram_chat_bindings USING btree (organization_id, user_id) WHERE ((chat_type = 'private'::text) AND (user_id IS NOT NULL) AND (is_active = true));


--
-- Name: user_preferences_org_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_preferences_org_idx ON public.user_preferences USING btree (organization_id);


--
-- Name: user_preferences_skill_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_preferences_skill_idx ON public.user_preferences USING btree (skill_level);


--
-- Name: user_preferences_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_preferences_user_idx ON public.user_preferences USING btree (user_id);


--
-- Name: cluster_coverage _RETURN; Type: RULE; Schema: public; Owner: -
--

CREATE OR REPLACE VIEW public.cluster_coverage AS
 SELECT c.id AS cluster_id,
    c.organization_id,
    c.name,
    c.status,
    count(DISTINCT k.id) AS keyword_count,
    count(DISTINCT k.id) FILTER (WHERE (k.assigned_landing_page_id IS NOT NULL)) AS keywords_covered,
    count(DISTINCT t.id) AS topic_count,
    count(DISTINCT t.id) FILTER (WHERE (t.was_used = true)) AS topics_used,
        CASE
            WHEN (count(DISTINCT k.id) > 0) THEN round(((100.0 * (count(DISTINCT k.id) FILTER (WHERE (k.assigned_landing_page_id IS NOT NULL)))::numeric) / (count(DISTINCT k.id))::numeric), 1)
            ELSE (0)::numeric
        END AS coverage_pct
   FROM ((public.seo_clusters c
     LEFT JOIN public.seo_keywords k ON ((k.cluster_id = c.id)))
     LEFT JOIN public.topic_history t ON ((t.cluster_id = c.id)))
  GROUP BY c.id;


--
-- Name: campaigns campaigns_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER campaigns_updated_at BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: content_assignments on_assignment_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_assignment_change AFTER INSERT OR UPDATE ON public.content_assignments FOR EACH ROW EXECUTE FUNCTION public.handle_assignment_notification();


--
-- Name: chat_conversation_messages on_conversation_message_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_conversation_message_insert AFTER INSERT ON public.chat_conversation_messages FOR EACH ROW EXECUTE FUNCTION public.update_conversation_on_message();


--
-- Name: industry_templates on_industry_version_upgrade; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_industry_version_upgrade AFTER UPDATE ON public.industry_templates FOR EACH ROW EXECUTE FUNCTION public.notify_industry_upgrade();


--
-- Name: pinterest_boards pinterest_boards_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER pinterest_boards_updated_at BEFORE UPDATE ON public.pinterest_boards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ai_prompts prompt_history_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER prompt_history_trigger AFTER INSERT OR UPDATE ON public.ai_prompts FOR EACH ROW EXECUTE FUNCTION public.log_prompt_change();


--
-- Name: ad_copies set_ad_copies_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_ad_copies_updated_at BEFORE UPDATE ON public.ad_copies FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: brand_channel_optimizations set_brand_channel_optimizations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_brand_channel_optimizations_updated_at BEFORE UPDATE ON public.brand_channel_optimizations FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: brand_memory set_brand_memory_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_brand_memory_updated_at BEFORE UPDATE ON public.brand_memory FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: industry_category_translations set_category_translations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_category_translations_updated_at BEFORE UPDATE ON public.industry_category_translations FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: countries set_countries_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_countries_updated_at BEFORE UPDATE ON public.countries FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: channel_image_history set_image_version; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_image_version BEFORE INSERT ON public.channel_image_history FOR EACH ROW EXECUTE FUNCTION public.auto_increment_image_version();


--
-- Name: industry_categories set_industry_categories_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_industry_categories_updated_at BEFORE UPDATE ON public.industry_categories FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: industry_templates set_industry_templates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_industry_templates_updated_at BEFORE UPDATE ON public.industry_templates FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: journey_stage_messaging set_journey_stage_messaging_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_journey_stage_messaging_updated_at BEFORE UPDATE ON public.journey_stage_messaging FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: payment_orders set_payment_orders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_payment_orders_updated_at BEFORE UPDATE ON public.payment_orders FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: industry_template_translations set_template_translations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_template_translations_updated_at BEFORE UPDATE ON public.industry_template_translations FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: vouchers set_vouchers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_vouchers_updated_at BEFORE UPDATE ON public.vouchers FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: multi_channel_contents trg_auto_assign_landing_page; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_auto_assign_landing_page AFTER UPDATE OF status ON public.multi_channel_contents FOR EACH ROW EXECUTE FUNCTION public.auto_assign_landing_page_to_keywords();


--
-- Name: industry_templates trg_auto_bump_industry_version; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_auto_bump_industry_version BEFORE UPDATE ON public.industry_templates FOR EACH ROW EXECUTE FUNCTION public.auto_bump_industry_version_on_rules_change();


--
-- Name: carousel_images trg_auto_increment_carousel_image_version; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_auto_increment_carousel_image_version BEFORE INSERT ON public.carousel_images FOR EACH ROW EXECUTE FUNCTION public.auto_increment_carousel_image_version();


--
-- Name: ad_copy_performance trg_auto_populate_ad_perf_org; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_auto_populate_ad_perf_org BEFORE INSERT ON public.ad_copy_performance FOR EACH ROW EXECUTE FUNCTION public.auto_populate_ad_perf_org_id();


--
-- Name: brand_templates trg_brand_template_version; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_brand_template_version BEFORE UPDATE ON public.brand_templates FOR EACH ROW EXECUTE FUNCTION public.auto_increment_brand_version();


--
-- Name: industry_global_packs trg_check_parent_is_core; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_check_parent_is_core BEFORE INSERT OR UPDATE ON public.industry_global_packs FOR EACH ROW EXECUTE FUNCTION public.check_parent_is_core();


--
-- Name: external_link_sources trg_els_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_els_updated_at BEFORE UPDATE ON public.external_link_sources FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: internal_links trg_internal_links_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_internal_links_updated_at BEFORE UPDATE ON public.internal_links FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: telegram_bot_configs trg_prevent_byob_default_collision; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_prevent_byob_default_collision BEFORE INSERT OR UPDATE ON public.telegram_bot_configs FOR EACH ROW EXECUTE FUNCTION public.prevent_byob_collision_with_default_bot();


--
-- Name: seo_keywords trg_recompute_cluster_stats; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_recompute_cluster_stats AFTER INSERT OR DELETE OR UPDATE ON public.seo_keywords FOR EACH ROW EXECUTE FUNCTION public.tg_recompute_cluster_stats();


--
-- Name: seo_clusters trg_seo_clusters_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_seo_clusters_updated_at BEFORE UPDATE ON public.seo_clusters FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: seo_keywords trg_seo_keywords_before_write; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_seo_keywords_before_write BEFORE INSERT OR UPDATE ON public.seo_keywords FOR EACH ROW EXECUTE FUNCTION public.tg_seo_keywords_before_write();


--
-- Name: seo_landing_pages trg_seo_landing_pages_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_seo_landing_pages_updated_at BEFORE UPDATE ON public.seo_landing_pages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: telegram_example_prompts trg_tg_examples_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_tg_examples_updated_at BEFORE UPDATE ON public.telegram_example_prompts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: telegram_user_preferences trg_tg_user_prefs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_tg_user_prefs_updated_at BEFORE UPDATE ON public.telegram_user_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: agent_goals trg_validate_agent_goal_parent; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validate_agent_goal_parent BEFORE INSERT OR UPDATE OF parent_goal_id ON public.agent_goals FOR EACH ROW EXECUTE FUNCTION public.validate_agent_goal_parent();


--
-- Name: brand_templates trg_validate_primary_channels; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validate_primary_channels BEFORE INSERT OR UPDATE OF primary_channels ON public.brand_templates FOR EACH ROW EXECUTE FUNCTION public.validate_primary_channels();


--
-- Name: ai_function_configs trigger_ai_function_configs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_ai_function_configs_updated_at BEFORE UPDATE ON public.ai_function_configs FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: ai_provider_configs trigger_ai_provider_configs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_ai_provider_configs_updated_at BEFORE UPDATE ON public.ai_provider_configs FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: campaign_kpi_logs trigger_check_kpi_target; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_check_kpi_target AFTER INSERT ON public.campaign_kpi_logs FOR EACH ROW EXECUTE FUNCTION public.check_kpi_target_on_log();


--
-- Name: industry_global_packs trigger_global_packs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_global_packs_updated_at BEFORE UPDATE ON public.industry_global_packs FOR EACH ROW EXECUTE FUNCTION public.update_industry_v2_updated_at();


--
-- Name: industry_templates trigger_industry_template_version; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_industry_template_version BEFORE UPDATE ON public.industry_templates FOR EACH ROW EXECUTE FUNCTION public.on_industry_template_update();


--
-- Name: brand_templates trigger_invalidate_cache_on_brand_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_invalidate_cache_on_brand_update AFTER UPDATE ON public.brand_templates FOR EACH ROW EXECUTE FUNCTION public.invalidate_cache_on_brand_update();


--
-- Name: industry_templates trigger_invalidate_cache_on_industry_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_invalidate_cache_on_industry_update AFTER UPDATE ON public.industry_templates FOR EACH ROW EXECUTE FUNCTION public.invalidate_cache_on_industry_update();


--
-- Name: industry_jurisdiction_profiles trigger_jurisdiction_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_jurisdiction_profiles_updated_at BEFORE UPDATE ON public.industry_jurisdiction_profiles FOR EACH ROW EXECUTE FUNCTION public.update_industry_v2_updated_at();


--
-- Name: ai_prompts trigger_log_prompt_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_log_prompt_change AFTER UPDATE ON public.ai_prompts FOR EACH ROW EXECUTE FUNCTION public.log_prompt_change();


--
-- Name: industry_pack_translations trigger_pack_translations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_pack_translations_updated_at BEFORE UPDATE ON public.industry_pack_translations FOR EACH ROW EXECUTE FUNCTION public.update_industry_v2_updated_at();


--
-- Name: ad_copy_performance update_ad_copy_performance_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_ad_copy_performance_updated_at BEFORE UPDATE ON public.ad_copy_performance FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: ad_sync_configs update_ad_sync_configs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_ad_sync_configs_updated_at BEFORE UPDATE ON public.ad_sync_configs FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: addon_purchases update_addon_purchases_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_addon_purchases_updated_at BEFORE UPDATE ON public.addon_purchases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: agent_goals update_agent_goals_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_agent_goals_updated_at BEFORE UPDATE ON public.agent_goals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: agent_pipelines update_agent_pipelines_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_agent_pipelines_updated_at BEFORE UPDATE ON public.agent_pipelines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: agent_team_permissions update_agent_team_permissions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_agent_team_permissions_updated_at BEFORE UPDATE ON public.agent_team_permissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ai_agent_model_configs update_ai_agent_model_configs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_ai_agent_model_configs_updated_at BEFORE UPDATE ON public.ai_agent_model_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ai_channel_model_configs update_ai_channel_model_configs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_ai_channel_model_configs_updated_at BEFORE UPDATE ON public.ai_channel_model_configs FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: ai_function_categories update_ai_function_categories_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_ai_function_categories_updated_at BEFORE UPDATE ON public.ai_function_categories FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: ai_function_group_configs update_ai_function_group_configs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_ai_function_group_configs_updated_at BEFORE UPDATE ON public.ai_function_group_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ai_prompt_ab_tests update_ai_prompt_ab_tests_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_ai_prompt_ab_tests_updated_at BEFORE UPDATE ON public.ai_prompt_ab_tests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ai_prompts update_ai_prompts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_ai_prompts_updated_at BEFORE UPDATE ON public.ai_prompts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: audio_assets update_audio_assets_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_audio_assets_updated_at BEFORE UPDATE ON public.audio_assets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: batch_processing_jobs update_batch_processing_jobs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_batch_processing_jobs_updated_at BEFORE UPDATE ON public.batch_processing_jobs FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: blog_posts update_blog_posts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_blog_posts_updated_at BEFORE UPDATE ON public.blog_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: brand_preferences_learned update_brand_preferences_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_brand_preferences_updated_at BEFORE UPDATE ON public.brand_preferences_learned FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: brand_products update_brand_products_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_brand_products_updated_at BEFORE UPDATE ON public.brand_products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: brand_templates update_brand_templates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_brand_templates_updated_at BEFORE UPDATE ON public.brand_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: brand_voice_variants update_brand_voice_variants_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_brand_voice_variants_updated_at BEFORE UPDATE ON public.brand_voice_variants FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: carousel_style_presets update_carousel_style_presets_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_carousel_style_presets_updated_at BEFORE UPDATE ON public.carousel_style_presets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: carousels update_carousels_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_carousels_updated_at BEFORE UPDATE ON public.carousels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: character_profiles update_character_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_character_profiles_updated_at BEFORE UPDATE ON public.character_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: chat_conversations update_chat_conversations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_chat_conversations_updated_at BEFORE UPDATE ON public.chat_conversations FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: chat_messages update_chat_messages_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_chat_messages_updated_at BEFORE UPDATE ON public.chat_messages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: competitor_profiles update_competitor_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_competitor_profiles_updated_at BEFORE UPDATE ON public.competitor_profiles FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: content_assignments update_content_assignments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_content_assignments_updated_at BEFORE UPDATE ON public.content_assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: content_embeddings update_content_embeddings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_content_embeddings_updated_at BEFORE UPDATE ON public.content_embeddings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: content_schedules update_content_schedules_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_content_schedules_updated_at BEFORE UPDATE ON public.content_schedules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: content_style_patterns update_content_style_patterns_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_content_style_patterns_updated_at BEFORE UPDATE ON public.content_style_patterns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: conversation_embeddings update_conversation_embeddings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_conversation_embeddings_updated_at BEFORE UPDATE ON public.conversation_embeddings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: core_contents update_core_contents_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_core_contents_updated_at BEFORE UPDATE ON public.core_contents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: curated_events update_curated_events_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_curated_events_updated_at BEFORE UPDATE ON public.curated_events FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: customer_personas update_customer_personas_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_customer_personas_updated_at BEFORE UPDATE ON public.customer_personas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: generation_tasks update_generation_tasks_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_generation_tasks_updated_at BEFORE UPDATE ON public.generation_tasks FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: geo_action_tasks update_geo_action_tasks_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_geo_action_tasks_updated_at BEFORE UPDATE ON public.geo_action_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: geo_brand_monitors update_geo_brand_monitors_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_geo_brand_monitors_updated_at BEFORE UPDATE ON public.geo_brand_monitors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: geo_content_scores update_geo_content_scores_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_geo_content_scores_updated_at BEFORE UPDATE ON public.geo_content_scores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: geo_schema_outputs update_geo_schema_outputs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_geo_schema_outputs_updated_at BEFORE UPDATE ON public.geo_schema_outputs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: industry_glossary_translations update_glossary_translations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_glossary_translations_updated_at BEFORE UPDATE ON public.industry_glossary_translations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: gsc_connections update_gsc_connections_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_gsc_connections_updated_at BEFORE UPDATE ON public.gsc_connections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: help_articles update_help_articles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_help_articles_updated_at BEFORE UPDATE ON public.help_articles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: hook_templates update_hook_templates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_hook_templates_updated_at BEFORE UPDATE ON public.hook_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: channel_image_history update_image_access; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_image_access BEFORE UPDATE ON public.channel_image_history FOR EACH ROW EXECUTE FUNCTION public.update_image_access_time();


--
-- Name: industry_glossary update_industry_glossary_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_industry_glossary_updated_at BEFORE UPDATE ON public.industry_glossary FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: industry_persona_translations update_industry_persona_translations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_industry_persona_translations_updated_at BEFORE UPDATE ON public.industry_persona_translations FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: industry_persona_translations_v2 update_industry_persona_translations_v2_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_industry_persona_translations_v2_updated_at BEFORE UPDATE ON public.industry_persona_translations_v2 FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: industry_personas update_industry_personas_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_industry_personas_updated_at BEFORE UPDATE ON public.industry_personas FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: industry_personas_v2 update_industry_personas_v2_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_industry_personas_v2_updated_at BEFORE UPDATE ON public.industry_personas_v2 FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: industry_knowledge_nodes update_knowledge_nodes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_knowledge_nodes_updated_at BEFORE UPDATE ON public.industry_knowledge_nodes FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: multi_channel_contents update_multi_channel_contents_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_multi_channel_contents_updated_at BEFORE UPDATE ON public.multi_channel_contents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: multi_channel_contents update_multichannel_variant_count; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_multichannel_variant_count AFTER INSERT OR DELETE OR UPDATE OF brand_voice_variant_id ON public.multi_channel_contents FOR EACH ROW EXECUTE FUNCTION public.update_variant_content_count();


--
-- Name: orchestrator_daily_stats update_orchestrator_daily_stats_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_orchestrator_daily_stats_updated_at BEFORE UPDATE ON public.orchestrator_daily_stats FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: organizations update_organizations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: plan_limits update_plan_limits_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_plan_limits_updated_at BEFORE UPDATE ON public.plan_limits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: plan_unit_costs update_plan_unit_costs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_plan_unit_costs_updated_at BEFORE UPDATE ON public.plan_unit_costs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: planned_content_items update_planned_content_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_planned_content_items_updated_at BEFORE UPDATE ON public.planned_content_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: planning_sessions update_planning_sessions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_planning_sessions_updated_at BEFORE UPDATE ON public.planning_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: product_persona_mappings update_product_persona_mappings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_product_persona_mappings_updated_at BEFORE UPDATE ON public.product_persona_mappings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: regulation_sources update_regulation_sources_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_regulation_sources_timestamp BEFORE UPDATE ON public.regulation_sources FOR EACH ROW EXECUTE FUNCTION public.update_regulation_sources_updated_at();


--
-- Name: video_render_jobs update_render_jobs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_render_jobs_updated_at BEFORE UPDATE ON public.video_render_jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: report_sync_state update_report_sync_state_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_report_sync_state_updated_at BEFORE UPDATE ON public.report_sync_state FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: sales_chat_analytics update_sales_chat_analytics_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_sales_chat_analytics_updated_at BEFORE UPDATE ON public.sales_chat_analytics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: sales_chat_leads update_sales_chat_leads_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_sales_chat_leads_updated_at BEFORE UPDATE ON public.sales_chat_leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: scripts update_scripts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_scripts_updated_at BEFORE UPDATE ON public.scripts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: scripts update_scripts_variant_count; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_scripts_variant_count AFTER INSERT OR DELETE OR UPDATE OF brand_voice_variant_id ON public.scripts FOR EACH ROW EXECUTE FUNCTION public.update_variant_content_count();


--
-- Name: social_connections update_social_connections_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_social_connections_updated_at BEFORE UPDATE ON public.social_connections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: social_platform_settings update_social_platform_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_social_platform_settings_updated_at BEFORE UPDATE ON public.social_platform_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: social_post_metrics update_social_post_metrics_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_social_post_metrics_updated_at BEFORE UPDATE ON public.social_post_metrics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: storyboards update_storyboards_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_storyboards_updated_at BEFORE UPDATE ON public.storyboards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: subscriptions update_subscriptions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ad_swipe_files update_swipe_files_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_swipe_files_updated_at BEFORE UPDATE ON public.ad_swipe_files FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: telegram_bot_configs update_telegram_bot_configs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_telegram_bot_configs_updated_at BEFORE UPDATE ON public.telegram_bot_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: telegram_chat_bindings update_telegram_chat_bindings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_telegram_chat_bindings_updated_at BEFORE UPDATE ON public.telegram_chat_bindings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: telegram_chat_state update_telegram_chat_state_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_telegram_chat_state_updated_at BEFORE UPDATE ON public.telegram_chat_state FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: trending_topics update_trending_topics_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_trending_topics_updated_at BEFORE UPDATE ON public.trending_topics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_preferences update_user_preferences_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON public.user_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_saved_hooks update_user_saved_hooks_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_saved_hooks_updated_at BEFORE UPDATE ON public.user_saved_hooks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: video_generations update_video_generations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_video_generations_updated_at BEFORE UPDATE ON public.video_generations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: web_search_cache update_web_search_cache_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_web_search_cache_updated_at BEFORE UPDATE ON public.web_search_cache FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();


--
-- Name: product_persona_mappings validate_relevance_score_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER validate_relevance_score_trigger BEFORE INSERT OR UPDATE ON public.product_persona_mappings FOR EACH ROW EXECUTE FUNCTION public.validate_relevance_score();


--
-- Name: ad_copies ad_copies_brand_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_copies
    ADD CONSTRAINT ad_copies_brand_template_id_fkey FOREIGN KEY (brand_template_id) REFERENCES public.brand_templates(id) ON DELETE SET NULL;


--
-- Name: ad_copies ad_copies_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_copies
    ADD CONSTRAINT ad_copies_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE SET NULL;


--
-- Name: ad_copies ad_copies_industry_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_copies
    ADD CONSTRAINT ad_copies_industry_template_id_fkey FOREIGN KEY (industry_template_id) REFERENCES public.industry_templates(id) ON DELETE SET NULL;


--
-- Name: ad_copies ad_copies_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_copies
    ADD CONSTRAINT ad_copies_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: ad_copies ad_copies_persona_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_copies
    ADD CONSTRAINT ad_copies_persona_id_fkey FOREIGN KEY (persona_id) REFERENCES public.customer_personas(id) ON DELETE SET NULL;


--
-- Name: ad_copies ad_copies_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_copies
    ADD CONSTRAINT ad_copies_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.brand_products(id) ON DELETE SET NULL;


--
-- Name: ad_copies ad_copies_saved_audience_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_copies
    ADD CONSTRAINT ad_copies_saved_audience_id_fkey FOREIGN KEY (saved_audience_id) REFERENCES public.saved_audiences(id) ON DELETE SET NULL;


--
-- Name: ad_copies ad_copies_sequence_stage_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_copies
    ADD CONSTRAINT ad_copies_sequence_stage_id_fkey FOREIGN KEY (sequence_stage_id) REFERENCES public.ad_sequence_stages(id) ON DELETE SET NULL;


--
-- Name: ad_copy_ab_results ad_copy_ab_results_ab_test_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_copy_ab_results
    ADD CONSTRAINT ad_copy_ab_results_ab_test_id_fkey FOREIGN KEY (ab_test_id) REFERENCES public.ad_copy_ab_tests(id) ON DELETE CASCADE;


--
-- Name: ad_copy_ab_results ad_copy_ab_results_variation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_copy_ab_results
    ADD CONSTRAINT ad_copy_ab_results_variation_id_fkey FOREIGN KEY (variation_id) REFERENCES public.ad_copy_variations(id) ON DELETE CASCADE;


--
-- Name: ad_copy_ab_tests ad_copy_ab_tests_ad_copy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_copy_ab_tests
    ADD CONSTRAINT ad_copy_ab_tests_ad_copy_id_fkey FOREIGN KEY (ad_copy_id) REFERENCES public.ad_copies(id) ON DELETE CASCADE;


--
-- Name: ad_copy_ab_tests ad_copy_ab_tests_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_copy_ab_tests
    ADD CONSTRAINT ad_copy_ab_tests_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: ad_copy_ab_tests ad_copy_ab_tests_winner_variation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_copy_ab_tests
    ADD CONSTRAINT ad_copy_ab_tests_winner_variation_id_fkey FOREIGN KEY (winner_variation_id) REFERENCES public.ad_copy_variations(id) ON DELETE SET NULL;


--
-- Name: ad_copy_ai_insights ad_copy_ai_insights_ad_copy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_copy_ai_insights
    ADD CONSTRAINT ad_copy_ai_insights_ad_copy_id_fkey FOREIGN KEY (ad_copy_id) REFERENCES public.ad_copies(id) ON DELETE CASCADE;


--
-- Name: ad_copy_ai_insights ad_copy_ai_insights_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_copy_ai_insights
    ADD CONSTRAINT ad_copy_ai_insights_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: ad_copy_analytics_snapshots ad_copy_analytics_snapshots_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_copy_analytics_snapshots
    ADD CONSTRAINT ad_copy_analytics_snapshots_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: ad_copy_creative_scores ad_copy_creative_scores_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_copy_creative_scores
    ADD CONSTRAINT ad_copy_creative_scores_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: ad_copy_creative_scores ad_copy_creative_scores_variation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_copy_creative_scores
    ADD CONSTRAINT ad_copy_creative_scores_variation_id_fkey FOREIGN KEY (variation_id) REFERENCES public.ad_copy_variations(id) ON DELETE CASCADE;


--
-- Name: ad_copy_optimization_suggestions ad_copy_optimization_suggestions_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_copy_optimization_suggestions
    ADD CONSTRAINT ad_copy_optimization_suggestions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: ad_copy_optimization_suggestions ad_copy_optimization_suggestions_variation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_copy_optimization_suggestions
    ADD CONSTRAINT ad_copy_optimization_suggestions_variation_id_fkey FOREIGN KEY (variation_id) REFERENCES public.ad_copy_variations(id) ON DELETE CASCADE;


--
-- Name: ad_copy_performance ad_copy_performance_ad_copy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_copy_performance
    ADD CONSTRAINT ad_copy_performance_ad_copy_id_fkey FOREIGN KEY (ad_copy_id) REFERENCES public.ad_copies(id) ON DELETE CASCADE;


--
-- Name: ad_copy_performance ad_copy_performance_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_copy_performance
    ADD CONSTRAINT ad_copy_performance_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: ad_copy_performance ad_copy_performance_sync_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_copy_performance
    ADD CONSTRAINT ad_copy_performance_sync_config_id_fkey FOREIGN KEY (sync_config_id) REFERENCES public.ad_sync_configs(id) ON DELETE SET NULL;


--
-- Name: ad_copy_performance ad_copy_performance_variation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_copy_performance
    ADD CONSTRAINT ad_copy_performance_variation_id_fkey FOREIGN KEY (variation_id) REFERENCES public.ad_copy_variations(id) ON DELETE CASCADE;


--
-- Name: ad_copy_prediction_history ad_copy_prediction_history_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_copy_prediction_history
    ADD CONSTRAINT ad_copy_prediction_history_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: ad_copy_prediction_history ad_copy_prediction_history_variation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_copy_prediction_history
    ADD CONSTRAINT ad_copy_prediction_history_variation_id_fkey FOREIGN KEY (variation_id) REFERENCES public.ad_copy_variations(id) ON DELETE CASCADE;


--
-- Name: ad_copy_variations ad_copy_variations_ad_copy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_copy_variations
    ADD CONSTRAINT ad_copy_variations_ad_copy_id_fkey FOREIGN KEY (ad_copy_id) REFERENCES public.ad_copies(id) ON DELETE CASCADE;


--
-- Name: ad_sequence_stage_copies ad_sequence_stage_copies_ad_copy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_sequence_stage_copies
    ADD CONSTRAINT ad_sequence_stage_copies_ad_copy_id_fkey FOREIGN KEY (ad_copy_id) REFERENCES public.ad_copies(id) ON DELETE CASCADE;


--
-- Name: ad_sequence_stage_copies ad_sequence_stage_copies_stage_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_sequence_stage_copies
    ADD CONSTRAINT ad_sequence_stage_copies_stage_id_fkey FOREIGN KEY (stage_id) REFERENCES public.ad_sequence_stages(id) ON DELETE CASCADE;


--
-- Name: ad_sequence_stages ad_sequence_stages_sequence_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_sequence_stages
    ADD CONSTRAINT ad_sequence_stages_sequence_id_fkey FOREIGN KEY (sequence_id) REFERENCES public.ad_sequences(id) ON DELETE CASCADE;


--
-- Name: ad_sequences ad_sequences_brand_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_sequences
    ADD CONSTRAINT ad_sequences_brand_template_id_fkey FOREIGN KEY (brand_template_id) REFERENCES public.brand_templates(id) ON DELETE SET NULL;


--
-- Name: ad_sequences ad_sequences_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_sequences
    ADD CONSTRAINT ad_sequences_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE SET NULL;


--
-- Name: ad_sequences ad_sequences_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_sequences
    ADD CONSTRAINT ad_sequences_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: ad_swipe_files ad_swipe_files_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_swipe_files
    ADD CONSTRAINT ad_swipe_files_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: ad_swipe_files ad_swipe_files_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_swipe_files
    ADD CONSTRAINT ad_swipe_files_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: ad_sync_configs ad_sync_configs_ad_copy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_sync_configs
    ADD CONSTRAINT ad_sync_configs_ad_copy_id_fkey FOREIGN KEY (ad_copy_id) REFERENCES public.ad_copies(id) ON DELETE CASCADE;


--
-- Name: ad_sync_configs ad_sync_configs_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_sync_configs
    ADD CONSTRAINT ad_sync_configs_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.social_connections(id) ON DELETE SET NULL;


--
-- Name: ad_sync_configs ad_sync_configs_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_sync_configs
    ADD CONSTRAINT ad_sync_configs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: addon_purchases addon_purchases_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.addon_purchases
    ADD CONSTRAINT addon_purchases_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: addon_purchases addon_purchases_payment_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.addon_purchases
    ADD CONSTRAINT addon_purchases_payment_order_id_fkey FOREIGN KEY (payment_order_id) REFERENCES public.payment_orders(id);


--
-- Name: agent_approvals agent_approvals_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_approvals
    ADD CONSTRAINT agent_approvals_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: agent_approvals agent_approvals_pipeline_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_approvals
    ADD CONSTRAINT agent_approvals_pipeline_id_fkey FOREIGN KEY (pipeline_id) REFERENCES public.agent_pipelines(id) ON DELETE CASCADE;


--
-- Name: agent_approvals agent_approvals_reviewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_approvals
    ADD CONSTRAINT agent_approvals_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: agent_goals agent_goals_brand_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_goals
    ADD CONSTRAINT agent_goals_brand_template_id_fkey FOREIGN KEY (brand_template_id) REFERENCES public.brand_templates(id) ON DELETE SET NULL;


--
-- Name: agent_goals agent_goals_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_goals
    ADD CONSTRAINT agent_goals_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE SET NULL;


--
-- Name: agent_goals agent_goals_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_goals
    ADD CONSTRAINT agent_goals_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: agent_goals agent_goals_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_goals
    ADD CONSTRAINT agent_goals_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: agent_goals agent_goals_parent_goal_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_goals
    ADD CONSTRAINT agent_goals_parent_goal_fk FOREIGN KEY (parent_goal_id) REFERENCES public.agent_goals(id) ON DELETE SET NULL;


--
-- Name: agent_pipeline_logs agent_pipeline_logs_pipeline_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_pipeline_logs
    ADD CONSTRAINT agent_pipeline_logs_pipeline_id_fkey FOREIGN KEY (pipeline_id) REFERENCES public.agent_pipelines(id) ON DELETE CASCADE;


--
-- Name: agent_pipelines agent_pipelines_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_pipelines
    ADD CONSTRAINT agent_pipelines_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE SET NULL;


--
-- Name: agent_pipelines agent_pipelines_campaign_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_pipelines
    ADD CONSTRAINT agent_pipelines_campaign_plan_id_fkey FOREIGN KEY (campaign_plan_id) REFERENCES public.campaign_content_plans(id) ON DELETE SET NULL;


--
-- Name: agent_pipelines agent_pipelines_goal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_pipelines
    ADD CONSTRAINT agent_pipelines_goal_id_fkey FOREIGN KEY (goal_id) REFERENCES public.agent_goals(id) ON DELETE SET NULL;


--
-- Name: agent_pipelines agent_pipelines_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_pipelines
    ADD CONSTRAINT agent_pipelines_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: agent_team_permissions agent_team_permissions_granted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_team_permissions
    ADD CONSTRAINT agent_team_permissions_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.profiles(id);


--
-- Name: agent_team_permissions agent_team_permissions_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_team_permissions
    ADD CONSTRAINT agent_team_permissions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: agent_team_permissions agent_team_permissions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_team_permissions
    ADD CONSTRAINT agent_team_permissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: ai_agent_model_configs ai_agent_model_configs_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_agent_model_configs
    ADD CONSTRAINT ai_agent_model_configs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: ai_channel_model_configs ai_channel_model_configs_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_channel_model_configs
    ADD CONSTRAINT ai_channel_model_configs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: ai_function_categories ai_function_categories_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_function_categories
    ADD CONSTRAINT ai_function_categories_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: ai_function_configs ai_function_configs_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_function_configs
    ADD CONSTRAINT ai_function_configs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: ai_function_configs ai_function_configs_provider_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_function_configs
    ADD CONSTRAINT ai_function_configs_provider_config_id_fkey FOREIGN KEY (provider_config_id) REFERENCES public.ai_provider_configs(id) ON DELETE SET NULL;


--
-- Name: ai_function_group_configs ai_function_group_configs_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_function_group_configs
    ADD CONSTRAINT ai_function_group_configs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: ai_metrics ai_metrics_ab_test_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_metrics
    ADD CONSTRAINT ai_metrics_ab_test_id_fkey FOREIGN KEY (ab_test_id) REFERENCES public.ai_prompt_ab_tests(id) ON DELETE SET NULL;


--
-- Name: ai_metrics ai_metrics_brand_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_metrics
    ADD CONSTRAINT ai_metrics_brand_template_id_fkey FOREIGN KEY (brand_template_id) REFERENCES public.brand_templates(id) ON DELETE SET NULL;


--
-- Name: ai_metrics ai_metrics_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_metrics
    ADD CONSTRAINT ai_metrics_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;


--
-- Name: ai_metrics ai_metrics_prompt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_metrics
    ADD CONSTRAINT ai_metrics_prompt_id_fkey FOREIGN KEY (prompt_id) REFERENCES public.ai_prompts(id) ON DELETE SET NULL;


--
-- Name: ai_prompt_ab_tests ai_prompt_ab_tests_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_prompt_ab_tests
    ADD CONSTRAINT ai_prompt_ab_tests_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: ai_prompt_ab_tests ai_prompt_ab_tests_variant_a_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_prompt_ab_tests
    ADD CONSTRAINT ai_prompt_ab_tests_variant_a_id_fkey FOREIGN KEY (variant_a_id) REFERENCES public.ai_prompts(id) ON DELETE CASCADE;


--
-- Name: ai_prompt_ab_tests ai_prompt_ab_tests_variant_b_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_prompt_ab_tests
    ADD CONSTRAINT ai_prompt_ab_tests_variant_b_id_fkey FOREIGN KEY (variant_b_id) REFERENCES public.ai_prompts(id) ON DELETE CASCADE;


--
-- Name: ai_prompt_history ai_prompt_history_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_prompt_history
    ADD CONSTRAINT ai_prompt_history_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: ai_prompt_history ai_prompt_history_prompt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_prompt_history
    ADD CONSTRAINT ai_prompt_history_prompt_id_fkey FOREIGN KEY (prompt_id) REFERENCES public.ai_prompts(id) ON DELETE CASCADE;


--
-- Name: ai_prompts ai_prompts_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_prompts
    ADD CONSTRAINT ai_prompts_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.ai_function_categories(id) ON DELETE SET NULL;


--
-- Name: ai_prompts ai_prompts_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_prompts
    ADD CONSTRAINT ai_prompts_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: ai_provider_configs ai_provider_configs_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_provider_configs
    ADD CONSTRAINT ai_provider_configs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: approval_assignments approval_assignments_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_assignments
    ADD CONSTRAINT approval_assignments_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: approval_logs approval_logs_content_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_logs
    ADD CONSTRAINT approval_logs_content_id_fkey FOREIGN KEY (content_id) REFERENCES public.multi_channel_contents(id) ON DELETE CASCADE;


--
-- Name: approval_logs approval_logs_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_logs
    ADD CONSTRAINT approval_logs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: audio_assets audio_assets_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audio_assets
    ADD CONSTRAINT audio_assets_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;


--
-- Name: audio_assets audio_assets_script_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audio_assets
    ADD CONSTRAINT audio_assets_script_id_fkey FOREIGN KEY (script_id) REFERENCES public.scripts(id) ON DELETE SET NULL;


--
-- Name: audio_assets audio_assets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audio_assets
    ADD CONSTRAINT audio_assets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: batch_processing_jobs batch_processing_jobs_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batch_processing_jobs
    ADD CONSTRAINT batch_processing_jobs_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: batch_processing_jobs batch_processing_jobs_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batch_processing_jobs
    ADD CONSTRAINT batch_processing_jobs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: blog_posts blog_posts_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_posts
    ADD CONSTRAINT blog_posts_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;


--
-- Name: brand_channel_optimizations brand_channel_optimizations_brand_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brand_channel_optimizations
    ADD CONSTRAINT brand_channel_optimizations_brand_template_id_fkey FOREIGN KEY (brand_template_id) REFERENCES public.brand_templates(id) ON DELETE CASCADE;


--
-- Name: brand_memory brand_memory_brand_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brand_memory
    ADD CONSTRAINT brand_memory_brand_template_id_fkey FOREIGN KEY (brand_template_id) REFERENCES public.brand_templates(id) ON DELETE CASCADE;


--
-- Name: brand_memory brand_memory_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brand_memory
    ADD CONSTRAINT brand_memory_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: brand_preferences_learned brand_preferences_learned_brand_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brand_preferences_learned
    ADD CONSTRAINT brand_preferences_learned_brand_template_id_fkey FOREIGN KEY (brand_template_id) REFERENCES public.brand_templates(id) ON DELETE CASCADE;


--
-- Name: brand_products brand_products_brand_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brand_products
    ADD CONSTRAINT brand_products_brand_template_id_fkey FOREIGN KEY (brand_template_id) REFERENCES public.brand_templates(id) ON DELETE CASCADE;


--
-- Name: brand_products brand_products_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brand_products
    ADD CONSTRAINT brand_products_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: brand_templates brand_templates_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brand_templates
    ADD CONSTRAINT brand_templates_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES auth.users(id);


--
-- Name: brand_templates brand_templates_global_pack_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brand_templates
    ADD CONSTRAINT brand_templates_global_pack_id_fkey FOREIGN KEY (global_pack_id) REFERENCES public.industry_global_packs(id);


--
-- Name: brand_templates brand_templates_industry_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brand_templates
    ADD CONSTRAINT brand_templates_industry_template_id_fkey FOREIGN KEY (industry_template_id) REFERENCES public.industry_templates(id) ON DELETE SET NULL;


--
-- Name: brand_templates brand_templates_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brand_templates
    ADD CONSTRAINT brand_templates_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: brand_templates brand_templates_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brand_templates
    ADD CONSTRAINT brand_templates_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: brand_voice_variants brand_voice_variants_brand_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brand_voice_variants
    ADD CONSTRAINT brand_voice_variants_brand_template_id_fkey FOREIGN KEY (brand_template_id) REFERENCES public.brand_templates(id) ON DELETE CASCADE;


--
-- Name: brand_voice_variants brand_voice_variants_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brand_voice_variants
    ADD CONSTRAINT brand_voice_variants_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: calendar_notes calendar_notes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_notes
    ADD CONSTRAINT calendar_notes_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: calendar_notes calendar_notes_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_notes
    ADD CONSTRAINT calendar_notes_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: campaign_content_plans campaign_content_plans_goal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_content_plans
    ADD CONSTRAINT campaign_content_plans_goal_id_fkey FOREIGN KEY (goal_id) REFERENCES public.agent_goals(id) ON DELETE CASCADE;


--
-- Name: campaign_content_plans campaign_content_plans_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_content_plans
    ADD CONSTRAINT campaign_content_plans_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: campaign_contents campaign_contents_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_contents
    ADD CONSTRAINT campaign_contents_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: campaign_kpi_logs campaign_kpi_logs_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_kpi_logs
    ADD CONSTRAINT campaign_kpi_logs_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: campaign_kpi_logs campaign_kpi_logs_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_kpi_logs
    ADD CONSTRAINT campaign_kpi_logs_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: campaign_milestones campaign_milestones_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_milestones
    ADD CONSTRAINT campaign_milestones_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: campaign_notification_logs campaign_notification_logs_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_notification_logs
    ADD CONSTRAINT campaign_notification_logs_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: campaigns campaigns_brand_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_brand_template_id_fkey FOREIGN KEY (brand_template_id) REFERENCES public.brand_templates(id) ON DELETE SET NULL;


--
-- Name: campaigns campaigns_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: campaigns campaigns_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: carousel_images carousel_images_carousel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carousel_images
    ADD CONSTRAINT carousel_images_carousel_id_fkey FOREIGN KEY (carousel_id) REFERENCES public.carousels(id) ON DELETE CASCADE;


--
-- Name: carousel_images carousel_images_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carousel_images
    ADD CONSTRAINT carousel_images_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: carousel_images carousel_images_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carousel_images
    ADD CONSTRAINT carousel_images_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: carousels carousels_brand_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carousels
    ADD CONSTRAINT carousels_brand_template_id_fkey FOREIGN KEY (brand_template_id) REFERENCES public.brand_templates(id) ON DELETE SET NULL;


--
-- Name: carousels carousels_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carousels
    ADD CONSTRAINT carousels_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE SET NULL;


--
-- Name: carousels carousels_industry_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carousels
    ADD CONSTRAINT carousels_industry_template_id_fkey FOREIGN KEY (industry_template_id) REFERENCES public.industry_templates(id);


--
-- Name: carousels carousels_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carousels
    ADD CONSTRAINT carousels_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: carousels carousels_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carousels
    ADD CONSTRAINT carousels_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: channel_image_history channel_image_history_content_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_image_history
    ADD CONSTRAINT channel_image_history_content_id_fkey FOREIGN KEY (content_id) REFERENCES public.multi_channel_contents(id) ON DELETE CASCADE;


--
-- Name: channel_image_history channel_image_history_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_image_history
    ADD CONSTRAINT channel_image_history_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: channel_image_history channel_image_history_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_image_history
    ADD CONSTRAINT channel_image_history_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: character_profiles character_profiles_brand_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_profiles
    ADD CONSTRAINT character_profiles_brand_template_id_fkey FOREIGN KEY (brand_template_id) REFERENCES public.brand_templates(id) ON DELETE SET NULL;


--
-- Name: character_profiles character_profiles_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_profiles
    ADD CONSTRAINT character_profiles_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: character_profiles character_profiles_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_profiles
    ADD CONSTRAINT character_profiles_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: chat_conversation_messages chat_conversation_messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_conversation_messages
    ADD CONSTRAINT chat_conversation_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.chat_conversations(id) ON DELETE CASCADE;


--
-- Name: chat_conversations chat_conversations_brand_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_conversations
    ADD CONSTRAINT chat_conversations_brand_template_id_fkey FOREIGN KEY (brand_template_id) REFERENCES public.brand_templates(id) ON DELETE SET NULL;


--
-- Name: chat_conversations chat_conversations_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_conversations
    ADD CONSTRAINT chat_conversations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: chat_feedback chat_feedback_brand_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_feedback
    ADD CONSTRAINT chat_feedback_brand_template_id_fkey FOREIGN KEY (brand_template_id) REFERENCES public.brand_templates(id) ON DELETE SET NULL;


--
-- Name: chat_feedback chat_feedback_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_feedback
    ADD CONSTRAINT chat_feedback_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: chat_messages chat_messages_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: chat_messages chat_messages_reply_to_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_reply_to_id_fkey FOREIGN KEY (reply_to_id) REFERENCES public.chat_messages(id) ON DELETE SET NULL;


--
-- Name: competitor_profiles competitor_profiles_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competitor_profiles
    ADD CONSTRAINT competitor_profiles_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: competitor_profiles competitor_profiles_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competitor_profiles
    ADD CONSTRAINT competitor_profiles_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: content_embeddings content_embeddings_brand_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_embeddings
    ADD CONSTRAINT content_embeddings_brand_template_id_fkey FOREIGN KEY (brand_template_id) REFERENCES public.brand_templates(id) ON DELETE SET NULL;


--
-- Name: content_embeddings content_embeddings_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_embeddings
    ADD CONSTRAINT content_embeddings_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: content_feedback content_feedback_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_feedback
    ADD CONSTRAINT content_feedback_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: content_learnings content_learnings_brand_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_learnings
    ADD CONSTRAINT content_learnings_brand_template_id_fkey FOREIGN KEY (brand_template_id) REFERENCES public.brand_templates(id) ON DELETE SET NULL;


--
-- Name: content_learnings content_learnings_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_learnings
    ADD CONSTRAINT content_learnings_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: content_publishing_logs content_publishing_logs_content_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_publishing_logs
    ADD CONSTRAINT content_publishing_logs_content_id_fkey FOREIGN KEY (content_id) REFERENCES public.multi_channel_contents(id) ON DELETE CASCADE;


--
-- Name: content_publishing_logs content_publishing_logs_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_publishing_logs
    ADD CONSTRAINT content_publishing_logs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: content_publishing_logs content_publishing_logs_schedule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_publishing_logs
    ADD CONSTRAINT content_publishing_logs_schedule_id_fkey FOREIGN KEY (schedule_id) REFERENCES public.content_schedules(id) ON DELETE SET NULL;


--
-- Name: content_schedules content_schedules_content_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_schedules
    ADD CONSTRAINT content_schedules_content_id_fkey FOREIGN KEY (content_id) REFERENCES public.multi_channel_contents(id) ON DELETE CASCADE;


--
-- Name: content_schedules content_schedules_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_schedules
    ADD CONSTRAINT content_schedules_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: content_style_patterns content_style_patterns_brand_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_style_patterns
    ADD CONSTRAINT content_style_patterns_brand_template_id_fkey FOREIGN KEY (brand_template_id) REFERENCES public.brand_templates(id) ON DELETE CASCADE;


--
-- Name: content_style_patterns content_style_patterns_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_style_patterns
    ADD CONSTRAINT content_style_patterns_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: conversation_embeddings conversation_embeddings_brand_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_embeddings
    ADD CONSTRAINT conversation_embeddings_brand_template_id_fkey FOREIGN KEY (brand_template_id) REFERENCES public.brand_templates(id) ON DELETE SET NULL;


--
-- Name: conversation_embeddings conversation_embeddings_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_embeddings
    ADD CONSTRAINT conversation_embeddings_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.chat_conversations(id) ON DELETE CASCADE;


--
-- Name: conversation_embeddings conversation_embeddings_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_embeddings
    ADD CONSTRAINT conversation_embeddings_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.chat_conversation_messages(id) ON DELETE CASCADE;


--
-- Name: conversation_embeddings conversation_embeddings_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_embeddings
    ADD CONSTRAINT conversation_embeddings_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: core_contents core_contents_brand_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.core_contents
    ADD CONSTRAINT core_contents_brand_template_id_fkey FOREIGN KEY (brand_template_id) REFERENCES public.brand_templates(id) ON DELETE SET NULL;


--
-- Name: core_contents core_contents_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.core_contents
    ADD CONSTRAINT core_contents_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: core_contents core_contents_source_topic_history_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.core_contents
    ADD CONSTRAINT core_contents_source_topic_history_id_fkey FOREIGN KEY (source_topic_history_id) REFERENCES public.topic_history(id) ON DELETE SET NULL;


--
-- Name: curated_events curated_events_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.curated_events
    ADD CONSTRAINT curated_events_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: curated_news curated_news_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.curated_news
    ADD CONSTRAINT curated_news_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: customer_personas customer_personas_brand_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_personas
    ADD CONSTRAINT customer_personas_brand_template_id_fkey FOREIGN KEY (brand_template_id) REFERENCES public.brand_templates(id) ON DELETE CASCADE;


--
-- Name: customer_personas customer_personas_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_personas
    ADD CONSTRAINT customer_personas_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: customer_personas customer_personas_source_industry_persona_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_personas
    ADD CONSTRAINT customer_personas_source_industry_persona_id_fkey FOREIGN KEY (source_industry_persona_id) REFERENCES public.industry_personas(id) ON DELETE SET NULL;


--
-- Name: duplicate_ignore_list duplicate_ignore_list_node_id_1_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.duplicate_ignore_list
    ADD CONSTRAINT duplicate_ignore_list_node_id_1_fkey FOREIGN KEY (node_id_1) REFERENCES public.industry_knowledge_nodes(id) ON DELETE CASCADE;


--
-- Name: duplicate_ignore_list duplicate_ignore_list_node_id_2_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.duplicate_ignore_list
    ADD CONSTRAINT duplicate_ignore_list_node_id_2_fkey FOREIGN KEY (node_id_2) REFERENCES public.industry_knowledge_nodes(id) ON DELETE CASCADE;


--
-- Name: facebook_oauth_sessions facebook_oauth_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facebook_oauth_sessions
    ADD CONSTRAINT facebook_oauth_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: generation_signals generation_signals_brand_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generation_signals
    ADD CONSTRAINT generation_signals_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brand_templates(id) ON DELETE CASCADE;


--
-- Name: generation_tasks generation_tasks_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generation_tasks
    ADD CONSTRAINT generation_tasks_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: geo_action_tasks geo_action_tasks_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geo_action_tasks
    ADD CONSTRAINT geo_action_tasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES auth.users(id);


--
-- Name: geo_action_tasks geo_action_tasks_brand_monitor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geo_action_tasks
    ADD CONSTRAINT geo_action_tasks_brand_monitor_id_fkey FOREIGN KEY (brand_monitor_id) REFERENCES public.geo_brand_monitors(id) ON DELETE SET NULL;


--
-- Name: geo_action_tasks geo_action_tasks_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geo_action_tasks
    ADD CONSTRAINT geo_action_tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: geo_action_tasks geo_action_tasks_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geo_action_tasks
    ADD CONSTRAINT geo_action_tasks_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: geo_alert_history geo_alert_history_brand_monitor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geo_alert_history
    ADD CONSTRAINT geo_alert_history_brand_monitor_id_fkey FOREIGN KEY (brand_monitor_id) REFERENCES public.geo_brand_monitors(id) ON DELETE CASCADE;


--
-- Name: geo_alert_history geo_alert_history_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geo_alert_history
    ADD CONSTRAINT geo_alert_history_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: geo_brand_monitors geo_brand_monitors_brand_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geo_brand_monitors
    ADD CONSTRAINT geo_brand_monitors_brand_template_id_fkey FOREIGN KEY (brand_template_id) REFERENCES public.brand_templates(id) ON DELETE CASCADE;


--
-- Name: geo_brand_monitors geo_brand_monitors_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geo_brand_monitors
    ADD CONSTRAINT geo_brand_monitors_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: geo_brand_monitors geo_brand_monitors_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geo_brand_monitors
    ADD CONSTRAINT geo_brand_monitors_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: geo_content_scores geo_content_scores_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geo_content_scores
    ADD CONSTRAINT geo_content_scores_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: geo_monitoring_results geo_monitoring_results_brand_monitor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geo_monitoring_results
    ADD CONSTRAINT geo_monitoring_results_brand_monitor_id_fkey FOREIGN KEY (brand_monitor_id) REFERENCES public.geo_brand_monitors(id) ON DELETE CASCADE;


--
-- Name: geo_monitoring_results geo_monitoring_results_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geo_monitoring_results
    ADD CONSTRAINT geo_monitoring_results_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: geo_prompts geo_prompts_brand_monitor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geo_prompts
    ADD CONSTRAINT geo_prompts_brand_monitor_id_fkey FOREIGN KEY (brand_monitor_id) REFERENCES public.geo_brand_monitors(id) ON DELETE CASCADE;


--
-- Name: geo_prompts geo_prompts_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geo_prompts
    ADD CONSTRAINT geo_prompts_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: geo_scan_jobs geo_scan_jobs_brand_monitor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geo_scan_jobs
    ADD CONSTRAINT geo_scan_jobs_brand_monitor_id_fkey FOREIGN KEY (brand_monitor_id) REFERENCES public.geo_brand_monitors(id) ON DELETE CASCADE;


--
-- Name: geo_scan_jobs geo_scan_jobs_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geo_scan_jobs
    ADD CONSTRAINT geo_scan_jobs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: geo_schema_outputs geo_schema_outputs_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geo_schema_outputs
    ADD CONSTRAINT geo_schema_outputs_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: geo_schema_outputs geo_schema_outputs_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geo_schema_outputs
    ADD CONSTRAINT geo_schema_outputs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: geo_visibility_snapshots geo_visibility_snapshots_brand_monitor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geo_visibility_snapshots
    ADD CONSTRAINT geo_visibility_snapshots_brand_monitor_id_fkey FOREIGN KEY (brand_monitor_id) REFERENCES public.geo_brand_monitors(id) ON DELETE CASCADE;


--
-- Name: geo_visibility_snapshots geo_visibility_snapshots_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geo_visibility_snapshots
    ADD CONSTRAINT geo_visibility_snapshots_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: gsc_metrics_daily gsc_metrics_daily_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gsc_metrics_daily
    ADD CONSTRAINT gsc_metrics_daily_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.gsc_connections(id) ON DELETE CASCADE;


--
-- Name: gsc_sync_runs gsc_sync_runs_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gsc_sync_runs
    ADD CONSTRAINT gsc_sync_runs_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.gsc_connections(id) ON DELETE CASCADE;


--
-- Name: help_articles help_articles_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.help_articles
    ADD CONSTRAINT help_articles_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: help_articles help_articles_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.help_articles
    ADD CONSTRAINT help_articles_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: industry_category_translations industry_category_translations_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_category_translations
    ADD CONSTRAINT industry_category_translations_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.industry_categories(id) ON DELETE CASCADE;


--
-- Name: industry_global_packs industry_global_packs_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_global_packs
    ADD CONSTRAINT industry_global_packs_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.industry_categories(id);


--
-- Name: industry_global_packs industry_global_packs_parent_pack_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_global_packs
    ADD CONSTRAINT industry_global_packs_parent_pack_id_fkey FOREIGN KEY (parent_pack_id) REFERENCES public.industry_global_packs(id) ON DELETE SET NULL;


--
-- Name: industry_glossary industry_glossary_industry_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_glossary
    ADD CONSTRAINT industry_glossary_industry_template_id_fkey FOREIGN KEY (industry_template_id) REFERENCES public.industry_templates(id) ON DELETE CASCADE;


--
-- Name: industry_glossary_translations industry_glossary_translations_glossary_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_glossary_translations
    ADD CONSTRAINT industry_glossary_translations_glossary_id_fkey FOREIGN KEY (glossary_id) REFERENCES public.industry_glossary(id) ON DELETE CASCADE;


--
-- Name: industry_jurisdiction_profiles industry_jurisdiction_profiles_global_pack_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_jurisdiction_profiles
    ADD CONSTRAINT industry_jurisdiction_profiles_global_pack_id_fkey FOREIGN KEY (global_pack_id) REFERENCES public.industry_global_packs(id) ON DELETE CASCADE;


--
-- Name: industry_knowledge_edges industry_knowledge_edges_source_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_knowledge_edges
    ADD CONSTRAINT industry_knowledge_edges_source_node_id_fkey FOREIGN KEY (source_node_id) REFERENCES public.industry_knowledge_nodes(id) ON DELETE CASCADE;


--
-- Name: industry_knowledge_edges industry_knowledge_edges_target_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_knowledge_edges
    ADD CONSTRAINT industry_knowledge_edges_target_node_id_fkey FOREIGN KEY (target_node_id) REFERENCES public.industry_knowledge_nodes(id) ON DELETE CASCADE;


--
-- Name: industry_knowledge_nodes industry_knowledge_nodes_global_pack_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_knowledge_nodes
    ADD CONSTRAINT industry_knowledge_nodes_global_pack_id_fkey FOREIGN KEY (global_pack_id) REFERENCES public.industry_global_packs(id) ON DELETE CASCADE;


--
-- Name: industry_knowledge_nodes industry_knowledge_nodes_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_knowledge_nodes
    ADD CONSTRAINT industry_knowledge_nodes_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.regulation_sources(id) ON DELETE SET NULL;


--
-- Name: industry_memory_versions industry_memory_versions_industry_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_memory_versions
    ADD CONSTRAINT industry_memory_versions_industry_template_id_fkey FOREIGN KEY (industry_template_id) REFERENCES public.industry_templates(id) ON DELETE CASCADE;


--
-- Name: industry_pack_translations industry_pack_translations_global_pack_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_pack_translations
    ADD CONSTRAINT industry_pack_translations_global_pack_id_fkey FOREIGN KEY (global_pack_id) REFERENCES public.industry_global_packs(id) ON DELETE CASCADE;


--
-- Name: industry_persona_translations industry_persona_translations_industry_persona_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_persona_translations
    ADD CONSTRAINT industry_persona_translations_industry_persona_id_fkey FOREIGN KEY (industry_persona_id) REFERENCES public.industry_personas(id) ON DELETE CASCADE;


--
-- Name: industry_persona_translations_v2 industry_persona_translations_v2_persona_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_persona_translations_v2
    ADD CONSTRAINT industry_persona_translations_v2_persona_id_fkey FOREIGN KEY (persona_id) REFERENCES public.industry_personas_v2(id) ON DELETE CASCADE;


--
-- Name: industry_personas industry_personas_industry_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_personas
    ADD CONSTRAINT industry_personas_industry_template_id_fkey FOREIGN KEY (industry_template_id) REFERENCES public.industry_templates(id) ON DELETE CASCADE;


--
-- Name: industry_personas_v2 industry_personas_v2_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_personas_v2
    ADD CONSTRAINT industry_personas_v2_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: industry_personas_v2 industry_personas_v2_global_pack_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_personas_v2
    ADD CONSTRAINT industry_personas_v2_global_pack_id_fkey FOREIGN KEY (global_pack_id) REFERENCES public.industry_global_packs(id) ON DELETE CASCADE;


--
-- Name: industry_search_aliases industry_search_aliases_pack_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_search_aliases
    ADD CONSTRAINT industry_search_aliases_pack_id_fkey FOREIGN KEY (pack_id) REFERENCES public.industry_global_packs(id) ON DELETE CASCADE;


--
-- Name: industry_template_translations industry_template_translations_industry_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_template_translations
    ADD CONSTRAINT industry_template_translations_industry_template_id_fkey FOREIGN KEY (industry_template_id) REFERENCES public.industry_templates(id) ON DELETE CASCADE;


--
-- Name: industry_templates industry_templates_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_templates
    ADD CONSTRAINT industry_templates_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.industry_categories(id) ON DELETE SET NULL;


--
-- Name: industry_templates industry_templates_country_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_templates
    ADD CONSTRAINT industry_templates_country_id_fkey FOREIGN KEY (country_id) REFERENCES public.countries(id) ON DELETE CASCADE;


--
-- Name: industry_templates industry_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_templates
    ADD CONSTRAINT industry_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: industry_templates industry_templates_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_templates
    ADD CONSTRAINT industry_templates_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES auth.users(id);


--
-- Name: industry_templates industry_templates_published_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_templates
    ADD CONSTRAINT industry_templates_published_by_fkey FOREIGN KEY (published_by) REFERENCES auth.users(id);


--
-- Name: industry_templates industry_templates_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industry_templates
    ADD CONSTRAINT industry_templates_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: insight_analytics insight_analytics_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.insight_analytics
    ADD CONSTRAINT insight_analytics_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: internal_links internal_links_source_content_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.internal_links
    ADD CONSTRAINT internal_links_source_content_id_fkey FOREIGN KEY (source_content_id) REFERENCES public.multi_channel_contents(id) ON DELETE CASCADE;


--
-- Name: internal_links internal_links_target_content_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.internal_links
    ADD CONSTRAINT internal_links_target_content_id_fkey FOREIGN KEY (target_content_id) REFERENCES public.multi_channel_contents(id) ON DELETE CASCADE;


--
-- Name: journey_stage_messaging journey_stage_messaging_mapping_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journey_stage_messaging
    ADD CONSTRAINT journey_stage_messaging_mapping_id_fkey FOREIGN KEY (mapping_id) REFERENCES public.product_persona_mappings(id) ON DELETE CASCADE;


--
-- Name: knowledge_graph_analytics knowledge_graph_analytics_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_graph_analytics
    ADD CONSTRAINT knowledge_graph_analytics_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: knowledge_graph_analytics knowledge_graph_analytics_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_graph_analytics
    ADD CONSTRAINT knowledge_graph_analytics_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: knowledge_graph_cache knowledge_graph_cache_start_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_graph_cache
    ADD CONSTRAINT knowledge_graph_cache_start_node_id_fkey FOREIGN KEY (start_node_id) REFERENCES public.industry_knowledge_nodes(id) ON DELETE CASCADE;


--
-- Name: kpi_adjustment_dismissals kpi_adjustment_dismissals_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kpi_adjustment_dismissals
    ADD CONSTRAINT kpi_adjustment_dismissals_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: multi_channel_contents multi_channel_contents_brand_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.multi_channel_contents
    ADD CONSTRAINT multi_channel_contents_brand_template_id_fkey FOREIGN KEY (brand_template_id) REFERENCES public.brand_templates(id) ON DELETE SET NULL;


--
-- Name: multi_channel_contents multi_channel_contents_brand_voice_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.multi_channel_contents
    ADD CONSTRAINT multi_channel_contents_brand_voice_variant_id_fkey FOREIGN KEY (brand_voice_variant_id) REFERENCES public.brand_voice_variants(id);


--
-- Name: multi_channel_contents multi_channel_contents_cluster_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.multi_channel_contents
    ADD CONSTRAINT multi_channel_contents_cluster_id_fkey FOREIGN KEY (cluster_id) REFERENCES public.seo_clusters(id) ON DELETE SET NULL;


--
-- Name: multi_channel_contents multi_channel_contents_core_content_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.multi_channel_contents
    ADD CONSTRAINT multi_channel_contents_core_content_id_fkey FOREIGN KEY (core_content_id) REFERENCES public.core_contents(id) ON DELETE SET NULL;


--
-- Name: multi_channel_contents multi_channel_contents_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.multi_channel_contents
    ADD CONSTRAINT multi_channel_contents_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: multi_channel_contents multi_channel_contents_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.multi_channel_contents
    ADD CONSTRAINT multi_channel_contents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: orchestrator_daily_stats orchestrator_daily_stats_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orchestrator_daily_stats
    ADD CONSTRAINT orchestrator_daily_stats_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: organization_members organization_members_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: payment_orders payment_orders_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_orders
    ADD CONSTRAINT payment_orders_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: pinterest_boards pinterest_boards_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pinterest_boards
    ADD CONSTRAINT pinterest_boards_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.social_connections(id) ON DELETE CASCADE;


--
-- Name: planned_content_items planned_content_items_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planned_content_items
    ADD CONSTRAINT planned_content_items_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.planning_sessions(id) ON DELETE CASCADE;


--
-- Name: planning_sessions planning_sessions_brand_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planning_sessions
    ADD CONSTRAINT planning_sessions_brand_template_id_fkey FOREIGN KEY (brand_template_id) REFERENCES public.brand_templates(id) ON DELETE SET NULL;


--
-- Name: planning_sessions planning_sessions_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planning_sessions
    ADD CONSTRAINT planning_sessions_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.chat_conversations(id) ON DELETE SET NULL;


--
-- Name: planning_sessions planning_sessions_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.planning_sessions
    ADD CONSTRAINT planning_sessions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: product_persona_mappings product_persona_mappings_brand_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_persona_mappings
    ADD CONSTRAINT product_persona_mappings_brand_template_id_fkey FOREIGN KEY (brand_template_id) REFERENCES public.brand_templates(id) ON DELETE CASCADE;


--
-- Name: product_persona_mappings product_persona_mappings_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_persona_mappings
    ADD CONSTRAINT product_persona_mappings_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: product_persona_mappings product_persona_mappings_persona_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_persona_mappings
    ADD CONSTRAINT product_persona_mappings_persona_id_fkey FOREIGN KEY (persona_id) REFERENCES public.customer_personas(id) ON DELETE CASCADE;


--
-- Name: product_persona_mappings product_persona_mappings_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_persona_mappings
    ADD CONSTRAINT product_persona_mappings_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.brand_products(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: prompt_analytics prompt_analytics_brand_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompt_analytics
    ADD CONSTRAINT prompt_analytics_brand_template_id_fkey FOREIGN KEY (brand_template_id) REFERENCES public.brand_templates(id) ON DELETE SET NULL;


--
-- Name: prompt_analytics prompt_analytics_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompt_analytics
    ADD CONSTRAINT prompt_analytics_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;


--
-- Name: publish_attempts publish_attempts_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publish_attempts
    ADD CONSTRAINT publish_attempts_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.social_connections(id) ON DELETE SET NULL;


--
-- Name: publish_attempts publish_attempts_content_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publish_attempts
    ADD CONSTRAINT publish_attempts_content_id_fkey FOREIGN KEY (content_id) REFERENCES public.multi_channel_contents(id) ON DELETE SET NULL;


--
-- Name: publish_attempts publish_attempts_schedule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publish_attempts
    ADD CONSTRAINT publish_attempts_schedule_id_fkey FOREIGN KEY (schedule_id) REFERENCES public.content_schedules(id) ON DELETE SET NULL;


--
-- Name: regulation_crawl_history regulation_crawl_history_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regulation_crawl_history
    ADD CONSTRAINT regulation_crawl_history_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.regulation_sources(id) ON DELETE CASCADE;


--
-- Name: regulation_propagation_log regulation_propagation_log_affected_pack_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regulation_propagation_log
    ADD CONSTRAINT regulation_propagation_log_affected_pack_id_fkey FOREIGN KEY (affected_pack_id) REFERENCES public.industry_global_packs(id) ON DELETE CASCADE;


--
-- Name: regulation_propagation_log regulation_propagation_log_source_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regulation_propagation_log
    ADD CONSTRAINT regulation_propagation_log_source_node_id_fkey FOREIGN KEY (source_node_id) REFERENCES public.industry_knowledge_nodes(id) ON DELETE SET NULL;


--
-- Name: regulation_versions regulation_versions_node_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regulation_versions
    ADD CONSTRAINT regulation_versions_node_id_fkey FOREIGN KEY (node_id) REFERENCES public.industry_knowledge_nodes(id) ON DELETE CASCADE;


--
-- Name: regulation_versions regulation_versions_previous_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regulation_versions
    ADD CONSTRAINT regulation_versions_previous_version_id_fkey FOREIGN KEY (previous_version_id) REFERENCES public.regulation_versions(id);


--
-- Name: report_sync_state report_sync_state_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_sync_state
    ADD CONSTRAINT report_sync_state_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.social_connections(id) ON DELETE CASCADE;


--
-- Name: report_sync_state report_sync_state_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_sync_state
    ADD CONSTRAINT report_sync_state_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: saved_audiences saved_audiences_brand_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_audiences
    ADD CONSTRAINT saved_audiences_brand_template_id_fkey FOREIGN KEY (brand_template_id) REFERENCES public.brand_templates(id) ON DELETE SET NULL;


--
-- Name: saved_audiences saved_audiences_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_audiences
    ADD CONSTRAINT saved_audiences_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: saved_audiences saved_audiences_source_persona_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_audiences
    ADD CONSTRAINT saved_audiences_source_persona_id_fkey FOREIGN KEY (source_persona_id) REFERENCES public.customer_personas(id) ON DELETE SET NULL;


--
-- Name: script_approvals script_approvals_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.script_approvals
    ADD CONSTRAINT script_approvals_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: script_approvals script_approvals_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.script_approvals
    ADD CONSTRAINT script_approvals_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES auth.users(id);


--
-- Name: script_approvals script_approvals_reviewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.script_approvals
    ADD CONSTRAINT script_approvals_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES auth.users(id);


--
-- Name: script_approvals script_approvals_script_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.script_approvals
    ADD CONSTRAINT script_approvals_script_id_fkey FOREIGN KEY (script_id) REFERENCES public.scripts(id) ON DELETE CASCADE;


--
-- Name: script_versions script_versions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.script_versions
    ADD CONSTRAINT script_versions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: script_versions script_versions_script_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.script_versions
    ADD CONSTRAINT script_versions_script_id_fkey FOREIGN KEY (script_id) REFERENCES public.scripts(id) ON DELETE CASCADE;


--
-- Name: scripts scripts_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scripts
    ADD CONSTRAINT scripts_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id);


--
-- Name: scripts scripts_brand_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scripts
    ADD CONSTRAINT scripts_brand_template_id_fkey FOREIGN KEY (brand_template_id) REFERENCES public.brand_templates(id) ON DELETE SET NULL;


--
-- Name: scripts scripts_brand_voice_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scripts
    ADD CONSTRAINT scripts_brand_voice_variant_id_fkey FOREIGN KEY (brand_voice_variant_id) REFERENCES public.brand_voice_variants(id) ON DELETE SET NULL;


--
-- Name: scripts scripts_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scripts
    ADD CONSTRAINT scripts_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE SET NULL;


--
-- Name: scripts scripts_industry_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scripts
    ADD CONSTRAINT scripts_industry_template_id_fkey FOREIGN KEY (industry_template_id) REFERENCES public.industry_templates(id);


--
-- Name: scripts scripts_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scripts
    ADD CONSTRAINT scripts_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: scripts scripts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scripts
    ADD CONSTRAINT scripts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: security_events security_events_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_events
    ADD CONSTRAINT security_events_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: security_events security_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_events
    ADD CONSTRAINT security_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: seo_clusters seo_clusters_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seo_clusters
    ADD CONSTRAINT seo_clusters_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: seo_clusters seo_clusters_pillar_content_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seo_clusters
    ADD CONSTRAINT seo_clusters_pillar_content_id_fkey FOREIGN KEY (pillar_content_id) REFERENCES public.multi_channel_contents(id) ON DELETE SET NULL;


--
-- Name: seo_clusters seo_clusters_pillar_keyword_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seo_clusters
    ADD CONSTRAINT seo_clusters_pillar_keyword_id_fkey FOREIGN KEY (pillar_keyword_id) REFERENCES public.seo_keywords(id) ON DELETE SET NULL;


--
-- Name: seo_keywords seo_keywords_assigned_landing_page_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seo_keywords
    ADD CONSTRAINT seo_keywords_assigned_landing_page_id_fkey FOREIGN KEY (assigned_landing_page_id) REFERENCES public.seo_landing_pages(id) ON DELETE SET NULL;


--
-- Name: seo_keywords seo_keywords_cluster_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seo_keywords
    ADD CONSTRAINT seo_keywords_cluster_id_fkey FOREIGN KEY (cluster_id) REFERENCES public.seo_clusters(id) ON DELETE SET NULL;


--
-- Name: seo_rank_history seo_rank_history_keyword_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seo_rank_history
    ADD CONSTRAINT seo_rank_history_keyword_id_fkey FOREIGN KEY (keyword_id) REFERENCES public.seo_keywords(id) ON DELETE CASCADE;


--
-- Name: social_connections social_connections_brand_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_connections
    ADD CONSTRAINT social_connections_brand_template_id_fkey FOREIGN KEY (brand_template_id) REFERENCES public.brand_templates(id) ON DELETE SET NULL;


--
-- Name: social_connections social_connections_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_connections
    ADD CONSTRAINT social_connections_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: social_platform_settings social_platform_settings_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_platform_settings
    ADD CONSTRAINT social_platform_settings_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: social_post_engagements social_post_engagements_brand_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_post_engagements
    ADD CONSTRAINT social_post_engagements_brand_template_id_fkey FOREIGN KEY (brand_template_id) REFERENCES public.brand_templates(id) ON DELETE SET NULL;


--
-- Name: social_post_engagements social_post_engagements_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_post_engagements
    ADD CONSTRAINT social_post_engagements_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.social_connections(id) ON DELETE SET NULL;


--
-- Name: social_post_engagements social_post_engagements_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_post_engagements
    ADD CONSTRAINT social_post_engagements_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: social_post_metrics social_post_metrics_brand_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_post_metrics
    ADD CONSTRAINT social_post_metrics_brand_template_id_fkey FOREIGN KEY (brand_template_id) REFERENCES public.brand_templates(id) ON DELETE SET NULL;


--
-- Name: social_post_metrics social_post_metrics_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_post_metrics
    ADD CONSTRAINT social_post_metrics_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.social_connections(id) ON DELETE SET NULL;


--
-- Name: social_post_metrics social_post_metrics_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.social_post_metrics
    ADD CONSTRAINT social_post_metrics_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: storyboards storyboards_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.storyboards
    ADD CONSTRAINT storyboards_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: storyboards storyboards_script_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.storyboards
    ADD CONSTRAINT storyboards_script_id_fkey FOREIGN KEY (script_id) REFERENCES public.scripts(id) ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: telegram_bot_configs telegram_bot_configs_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_bot_configs
    ADD CONSTRAINT telegram_bot_configs_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: telegram_bot_configs telegram_bot_configs_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_bot_configs
    ADD CONSTRAINT telegram_bot_configs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: telegram_chat_bindings telegram_chat_bindings_active_brand_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_chat_bindings
    ADD CONSTRAINT telegram_chat_bindings_active_brand_template_id_fkey FOREIGN KEY (active_brand_template_id) REFERENCES public.brand_templates(id) ON DELETE SET NULL;


--
-- Name: telegram_chat_bindings telegram_chat_bindings_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_chat_bindings
    ADD CONSTRAINT telegram_chat_bindings_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: telegram_chat_bindings telegram_chat_bindings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_chat_bindings
    ADD CONSTRAINT telegram_chat_bindings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: telegram_messages_log telegram_messages_log_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_messages_log
    ADD CONSTRAINT telegram_messages_log_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: telegram_user_preferences telegram_user_preferences_default_brand_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_user_preferences
    ADD CONSTRAINT telegram_user_preferences_default_brand_id_fkey FOREIGN KEY (default_brand_id) REFERENCES public.brand_templates(id) ON DELETE SET NULL;


--
-- Name: telegram_user_preferences telegram_user_preferences_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_user_preferences
    ADD CONSTRAINT telegram_user_preferences_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: topic_content_links topic_content_links_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.topic_content_links
    ADD CONSTRAINT topic_content_links_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: topic_content_links topic_content_links_topic_history_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.topic_content_links
    ADD CONSTRAINT topic_content_links_topic_history_id_fkey FOREIGN KEY (topic_history_id) REFERENCES public.topic_history(id) ON DELETE CASCADE;


--
-- Name: topic_history topic_history_brand_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.topic_history
    ADD CONSTRAINT topic_history_brand_template_id_fkey FOREIGN KEY (brand_template_id) REFERENCES public.brand_templates(id) ON DELETE SET NULL;


--
-- Name: topic_history topic_history_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.topic_history
    ADD CONSTRAINT topic_history_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE SET NULL;


--
-- Name: topic_history topic_history_cluster_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.topic_history
    ADD CONSTRAINT topic_history_cluster_id_fkey FOREIGN KEY (cluster_id) REFERENCES public.seo_clusters(id) ON DELETE SET NULL;


--
-- Name: topic_history topic_history_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.topic_history
    ADD CONSTRAINT topic_history_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: trending_topics trending_topics_brand_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trending_topics
    ADD CONSTRAINT trending_topics_brand_template_id_fkey FOREIGN KEY (brand_template_id) REFERENCES public.brand_templates(id) ON DELETE SET NULL;


--
-- Name: trending_topics trending_topics_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trending_topics
    ADD CONSTRAINT trending_topics_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: usage_logs usage_logs_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_logs
    ADD CONSTRAINT usage_logs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: user_preferences user_preferences_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_saved_hooks user_saved_hooks_brand_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_saved_hooks
    ADD CONSTRAINT user_saved_hooks_brand_template_id_fkey FOREIGN KEY (brand_template_id) REFERENCES public.brand_templates(id) ON DELETE SET NULL;


--
-- Name: user_saved_hooks user_saved_hooks_hook_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_saved_hooks
    ADD CONSTRAINT user_saved_hooks_hook_template_id_fkey FOREIGN KEY (hook_template_id) REFERENCES public.hook_templates(id) ON DELETE SET NULL;


--
-- Name: video_generations video_generations_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_generations
    ADD CONSTRAINT video_generations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;


--
-- Name: video_generations video_generations_script_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_generations
    ADD CONSTRAINT video_generations_script_id_fkey FOREIGN KEY (script_id) REFERENCES public.scripts(id) ON DELETE SET NULL;


--
-- Name: video_generations video_generations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_generations
    ADD CONSTRAINT video_generations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: video_render_jobs video_render_jobs_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_render_jobs
    ADD CONSTRAINT video_render_jobs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;


--
-- Name: video_render_jobs video_render_jobs_script_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_render_jobs
    ADD CONSTRAINT video_render_jobs_script_id_fkey FOREIGN KEY (script_id) REFERENCES public.scripts(id) ON DELETE CASCADE;


--
-- Name: video_render_jobs video_render_jobs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_render_jobs
    ADD CONSTRAINT video_render_jobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: voucher_usages voucher_usages_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voucher_usages
    ADD CONSTRAINT voucher_usages_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: voucher_usages voucher_usages_payment_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voucher_usages
    ADD CONSTRAINT voucher_usages_payment_order_id_fkey FOREIGN KEY (payment_order_id) REFERENCES public.payment_orders(id);


--
-- Name: voucher_usages voucher_usages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voucher_usages
    ADD CONSTRAINT voucher_usages_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: voucher_usages voucher_usages_voucher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voucher_usages
    ADD CONSTRAINT voucher_usages_voucher_id_fkey FOREIGN KEY (voucher_id) REFERENCES public.vouchers(id) ON DELETE CASCADE;


--
-- Name: vouchers vouchers_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vouchers
    ADD CONSTRAINT vouchers_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: organization_members Admin can delete org members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can delete org members" ON public.organization_members FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: organizations Admin can delete organizations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can delete organizations" ON public.organizations FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: organization_members Admin can insert org members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can insert org members" ON public.organization_members FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: organization_members Admin can update org members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can update org members" ON public.organization_members FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: organizations Admin can update organizations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can update organizations" ON public.organizations FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: organization_members Admin can view all org members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can view all org members" ON public.organization_members FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: organizations Admin can view all organizations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can view all organizations" ON public.organizations FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: ai_prompts Admins can create prompts for their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can create prompts for their organization" ON public.ai_prompts FOR INSERT WITH CHECK ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE ((organization_members.user_id = auth.uid()) AND (organization_members.role = ANY (ARRAY['admin'::public.org_role, 'owner'::public.org_role]))))));


--
-- Name: agent_team_permissions Admins can delete agent permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete agent permissions" ON public.agent_team_permissions FOR DELETE TO authenticated USING (public.is_org_admin(auth.uid(), organization_id));


--
-- Name: cron_run_logs Admins can delete cron logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete cron logs" ON public.cron_run_logs FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: ai_prompts Admins can delete non-default prompts for their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete non-default prompts for their organization" ON public.ai_prompts FOR DELETE USING (((is_default = false) AND (organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE ((organization_members.user_id = auth.uid()) AND (organization_members.role = ANY (ARRAY['admin'::public.org_role, 'owner'::public.org_role])))))));


--
-- Name: plan_unit_costs Admins can delete plan_unit_costs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete plan_unit_costs" ON public.plan_unit_costs FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: social_platform_settings Admins can delete platform settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete platform settings" ON public.social_platform_settings FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can delete user_roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete user_roles" ON public.user_roles FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: admin_audit_logs Admins can insert audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert audit logs" ON public.admin_audit_logs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: plan_limits Admins can insert plan_limits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert plan_limits" ON public.plan_limits FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: plan_unit_costs Admins can insert plan_unit_costs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert plan_unit_costs" ON public.plan_unit_costs FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: social_platform_settings Admins can insert platform settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert platform settings" ON public.social_platform_settings FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: subscriptions Admins can insert subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert subscriptions" ON public.subscriptions FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can insert user_roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert user_roles" ON public.user_roles FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: ai_prompt_ab_tests Admins can manage AB tests for their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage AB tests for their organization" ON public.ai_prompt_ab_tests USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE ((organization_members.user_id = auth.uid()) AND (organization_members.role = ANY (ARRAY['admin'::public.org_role, 'owner'::public.org_role]))))));


--
-- Name: seo_landing_pages Admins can manage SEO pages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage SEO pages" ON public.seo_landing_pages USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: agent_team_permissions Admins can manage agent permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage agent permissions" ON public.agent_team_permissions FOR INSERT TO authenticated WITH CHECK (public.is_org_admin(auth.uid(), organization_id));


--
-- Name: ai_channel_model_configs Admins can manage all channel model configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all channel model configs" ON public.ai_channel_model_configs USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: curated_events Admins can manage all curated_events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all curated_events" ON public.curated_events USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: curated_news Admins can manage all curated_news; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all curated_news" ON public.curated_news USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: ai_function_configs Admins can manage all function configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all function configs" ON public.ai_function_configs USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: ai_provider_configs Admins can manage all providers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all providers" ON public.ai_provider_configs TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: batch_processing_jobs Admins can manage batch jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage batch jobs" ON public.batch_processing_jobs USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: industry_category_translations Admins can manage category translations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage category translations" ON public.industry_category_translations USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: countries Admins can manage countries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage countries" ON public.countries USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: industry_glossary_translations Admins can manage glossary translations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage glossary translations" ON public.industry_glossary_translations USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: ai_function_group_configs Admins can manage group configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage group configs" ON public.ai_function_group_configs TO authenticated USING (true) WITH CHECK (true);


--
-- Name: help_articles Admins can manage help articles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage help articles" ON public.help_articles USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: hook_templates Admins can manage hook_templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage hook_templates" ON public.hook_templates USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: industry_categories Admins can manage industry categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage industry categories" ON public.industry_categories USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: industry_glossary Admins can manage industry glossary; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage industry glossary" ON public.industry_glossary USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: industry_memory_versions Admins can manage industry memory versions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage industry memory versions" ON public.industry_memory_versions USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: industry_personas Admins can manage industry personas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage industry personas" ON public.industry_personas USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: industry_personas_v2 Admins can manage industry personas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage industry personas" ON public.industry_personas_v2 USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: industry_templates Admins can manage industry templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage industry templates" ON public.industry_templates USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: industry_persona_translations Admins can manage persona translations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage persona translations" ON public.industry_persona_translations USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: industry_persona_translations_v2 Admins can manage persona translations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage persona translations" ON public.industry_persona_translations_v2 USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: regulation_versions Admins can manage regulation versions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage regulation versions" ON public.regulation_versions USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: industry_template_translations Admins can manage template translations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage template translations" ON public.industry_template_translations USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: sales_chat_analytics Admins can read analytics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can read analytics" ON public.sales_chat_analytics FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: ad_copy_benchmarks Admins can read benchmarks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can read benchmarks" ON public.ad_copy_benchmarks FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: circuit_breaker_events Admins can read circuit breaker events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can read circuit breaker events" ON public.circuit_breaker_events FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: sales_chat_leads Admins can read leads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can read leads" ON public.sales_chat_leads FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: security_events Admins can read security events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can read security events" ON public.security_events FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: agent_team_permissions Admins can update agent permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update agent permissions" ON public.agent_team_permissions FOR UPDATE TO authenticated USING (public.is_org_admin(auth.uid(), organization_id));


--
-- Name: profiles Admins can update all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: subscriptions Admins can update all subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update all subscriptions" ON public.subscriptions FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: plan_limits Admins can update plan_limits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update plan_limits" ON public.plan_limits FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: plan_unit_costs Admins can update plan_unit_costs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update plan_unit_costs" ON public.plan_unit_costs FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: social_platform_settings Admins can update platform settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update platform settings" ON public.social_platform_settings FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: ai_prompts Admins can update prompts for their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update prompts for their organization" ON public.ai_prompts FOR UPDATE USING (((is_default = false) AND (organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE ((organization_members.user_id = auth.uid()) AND (organization_members.role = ANY (ARRAY['admin'::public.org_role, 'owner'::public.org_role])))))));


--
-- Name: user_roles Admins can update user_roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update user_roles" ON public.user_roles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: web_search_analytics Admins can view all analytics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all analytics" ON public.web_search_analytics FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: brand_templates Admins can view all brand_templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all brand_templates" ON public.brand_templates FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: carousel_images Admins can view all carousel_images; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all carousel_images" ON public.carousel_images FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: carousels Admins can view all carousels; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all carousels" ON public.carousels FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: channel_image_history Admins can view all channel_image_history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all channel_image_history" ON public.channel_image_history FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: cron_run_logs Admins can view all cron logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all cron logs" ON public.cron_run_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: chat_feedback Admins can view all feedback; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all feedback" ON public.chat_feedback FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: ai_function_configs Admins can view all function configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all function configs" ON public.ai_function_configs FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: ai_metrics Admins can view all metrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all metrics" ON public.ai_metrics FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: profiles Admins can view all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: ai_provider_configs Admins can view all providers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all providers" ON public.ai_provider_configs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: scripts Admins can view all scripts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all scripts" ON public.scripts FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: subscriptions Admins can view all subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all subscriptions" ON public.subscriptions FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: usage_logs Admins can view all usage_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all usage_logs" ON public.usage_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can view all user_roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all user_roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: admin_audit_logs Admins can view audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view audit logs" ON public.admin_audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: batch_processing_jobs Admins can view batch jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view batch jobs" ON public.batch_processing_jobs FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: web_search_cache Admins can view cache; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view cache" ON public.web_search_cache FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: edge_function_daily_stats Admins can view daily stats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view daily stats" ON public.edge_function_daily_stats FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: industry_templates Admins can view deleted industry templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view deleted industry templates" ON public.industry_templates FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) AND (deleted_at IS NOT NULL)));


--
-- Name: edge_function_metrics Admins can view metrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view metrics" ON public.edge_function_metrics FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: social_platform_settings Admins can view platform settings safe; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view platform settings safe" ON public.social_platform_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: voucher_usages Admins full access voucher_usages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins full access voucher_usages" ON public.voucher_usages TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: vouchers Admins full access vouchers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins full access vouchers" ON public.vouchers TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: telegram_example_prompts Admins manage examples; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage examples" ON public.telegram_example_prompts USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: industry_knowledge_edges Admins manage knowledge edges; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage knowledge edges" ON public.industry_knowledge_edges TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: industry_knowledge_nodes Admins manage knowledge nodes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage knowledge nodes" ON public.industry_knowledge_nodes TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: regulation_propagation_log Admins manage propagation logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage propagation logs" ON public.regulation_propagation_log TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: social_connections Admins or owners can delete brand social_connections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins or owners can delete brand social_connections" ON public.social_connections FOR DELETE TO authenticated USING (((brand_template_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.brand_templates bt
  WHERE ((bt.id = social_connections.brand_template_id) AND ((bt.user_id = auth.uid()) OR ((bt.organization_id IS NOT NULL) AND public.is_org_admin(auth.uid(), bt.organization_id))))))));


--
-- Name: social_connections Admins or owners can insert brand social_connections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins or owners can insert brand social_connections" ON public.social_connections FOR INSERT TO authenticated WITH CHECK (((brand_template_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.brand_templates bt
  WHERE ((bt.id = social_connections.brand_template_id) AND ((bt.user_id = auth.uid()) OR ((bt.organization_id IS NOT NULL) AND public.is_org_admin(auth.uid(), bt.organization_id))))))));


--
-- Name: social_connections Admins or owners can update brand social_connections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins or owners can update brand social_connections" ON public.social_connections FOR UPDATE TO authenticated USING (((brand_template_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.brand_templates bt
  WHERE ((bt.id = social_connections.brand_template_id) AND ((bt.user_id = auth.uid()) OR ((bt.organization_id IS NOT NULL) AND public.is_org_admin(auth.uid(), bt.organization_id))))))));


--
-- Name: social_connections Admins or owners can view brand social_connections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins or owners can view brand social_connections" ON public.social_connections FOR SELECT TO authenticated USING (((brand_template_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.brand_templates bt
  WHERE ((bt.id = social_connections.brand_template_id) AND ((bt.user_id = auth.uid()) OR ((bt.organization_id IS NOT NULL) AND public.is_org_admin(auth.uid(), bt.organization_id))))))));


--
-- Name: regulation_propagation_log Admins view propagation logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins view propagation logs" ON public.regulation_propagation_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: script_approvals Admins/Editors can update approvals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins/Editors can update approvals" ON public.script_approvals FOR UPDATE USING ((public.has_org_role(auth.uid(), organization_id, 'admin'::text) OR public.has_org_role(auth.uid(), organization_id, 'owner'::text)));


--
-- Name: industry_search_aliases Aliases are public read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Aliases are public read" ON public.industry_search_aliases FOR SELECT USING (true);


--
-- Name: industry_global_packs Allow admin full access to global packs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow admin full access to global packs" ON public.industry_global_packs TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: industry_jurisdiction_profiles Allow admin full access to jurisdiction profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow admin full access to jurisdiction profiles" ON public.industry_jurisdiction_profiles TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: industry_pack_translations Allow admin full access to pack translations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow admin full access to pack translations" ON public.industry_pack_translations TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: sales_chat_messages_log Allow authenticated read on sales_chat_messages_log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated read on sales_chat_messages_log" ON public.sales_chat_messages_log FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: regulation_sources Allow delete for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow delete for authenticated users" ON public.regulation_sources FOR DELETE USING ((auth.uid() IS NOT NULL));


--
-- Name: regulation_crawl_history Allow insert for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow insert for authenticated users" ON public.regulation_crawl_history FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: regulation_sources Allow insert for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow insert for authenticated users" ON public.regulation_sources FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: industry_global_packs Allow read access to global packs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow read access to global packs" ON public.industry_global_packs FOR SELECT TO authenticated USING ((is_active = true));


--
-- Name: industry_jurisdiction_profiles Allow read access to jurisdiction profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow read access to jurisdiction profiles" ON public.industry_jurisdiction_profiles FOR SELECT TO authenticated USING (true);


--
-- Name: industry_pack_translations Allow read access to pack translations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow read access to pack translations" ON public.industry_pack_translations FOR SELECT TO authenticated USING (true);


--
-- Name: regulation_sources Allow read access to regulation_sources; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow read access to regulation_sources" ON public.regulation_sources FOR SELECT USING (true);


--
-- Name: regulation_crawl_history Allow update for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow update for authenticated users" ON public.regulation_crawl_history FOR UPDATE USING ((auth.uid() IS NOT NULL));


--
-- Name: regulation_sources Allow update for authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow update for authenticated users" ON public.regulation_sources FOR UPDATE USING ((auth.uid() IS NOT NULL));


--
-- Name: telegram_bot_configs Anyone authenticated can read default bot meta; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone authenticated can read default bot meta" ON public.telegram_bot_configs FOR SELECT TO authenticated USING (((organization_id IS NULL) AND (is_default = true) AND (is_active = true)));


--
-- Name: carousel_style_presets Anyone can read active style presets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read active style presets" ON public.carousel_style_presets FOR SELECT TO anon USING ((is_active = true));


--
-- Name: ai_agent_model_configs Anyone can read global agent configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read global agent configs" ON public.ai_agent_model_configs FOR SELECT TO authenticated USING ((organization_id IS NULL));


--
-- Name: marketing_calendar Anyone can read marketing calendar; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read marketing calendar" ON public.marketing_calendar FOR SELECT USING ((is_active = true));


--
-- Name: blog_posts Anyone can read published blog posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read published blog posts" ON public.blog_posts FOR SELECT USING ((status = 'published'::text));


--
-- Name: help_articles Anyone can read published help articles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read published help articles" ON public.help_articles FOR SELECT USING ((is_published = true));


--
-- Name: countries Anyone can view active countries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active countries" ON public.countries FOR SELECT USING ((is_active = true));


--
-- Name: industry_glossary Anyone can view active glossary terms; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active glossary terms" ON public.industry_glossary FOR SELECT USING (((is_active = true) AND (EXISTS ( SELECT 1
   FROM public.industry_templates it
  WHERE ((it.id = industry_glossary.industry_template_id) AND (it.is_active = true) AND (it.deleted_at IS NULL))))));


--
-- Name: hook_templates Anyone can view active hook_templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active hook_templates" ON public.hook_templates FOR SELECT USING ((is_active = true));


--
-- Name: industry_categories Anyone can view active industry categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active industry categories" ON public.industry_categories FOR SELECT USING ((is_active = true));


--
-- Name: industry_personas Anyone can view active industry personas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active industry personas" ON public.industry_personas FOR SELECT USING (((is_active = true) AND (EXISTS ( SELECT 1
   FROM public.industry_templates it
  WHERE ((it.id = industry_personas.industry_template_id) AND (it.is_active = true) AND (it.deleted_at IS NULL))))));


--
-- Name: industry_personas_v2 Anyone can view active industry personas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active industry personas" ON public.industry_personas_v2 FOR SELECT USING ((is_active = true));


--
-- Name: industry_templates Anyone can view active industry templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active industry templates" ON public.industry_templates FOR SELECT USING (((is_active = true) AND (deleted_at IS NULL)));


--
-- Name: blog_comments Anyone can view approved comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view approved comments" ON public.blog_comments FOR SELECT USING ((is_approved = true));


--
-- Name: industry_category_translations Anyone can view category translations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view category translations" ON public.industry_category_translations FOR SELECT USING (true);


--
-- Name: industry_glossary_translations Anyone can view glossary translations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view glossary translations" ON public.industry_glossary_translations FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.industry_glossary ig
     JOIN public.industry_templates it ON ((it.id = ig.industry_template_id)))
  WHERE ((ig.id = industry_glossary_translations.glossary_id) AND (ig.is_active = true) AND (it.is_active = true) AND (it.deleted_at IS NULL)))));


--
-- Name: industry_memory_versions Anyone can view industry memory versions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view industry memory versions" ON public.industry_memory_versions FOR SELECT USING (true);


--
-- Name: industry_persona_translations Anyone can view persona translations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view persona translations" ON public.industry_persona_translations FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.industry_personas ip
     JOIN public.industry_templates it ON ((it.id = ip.industry_template_id)))
  WHERE ((ip.id = industry_persona_translations.industry_persona_id) AND (ip.is_active = true) AND (it.is_active = true) AND (it.deleted_at IS NULL)))));


--
-- Name: industry_persona_translations_v2 Anyone can view persona translations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view persona translations" ON public.industry_persona_translations_v2 FOR SELECT USING (true);


--
-- Name: plan_limits Anyone can view plan_limits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view plan_limits" ON public.plan_limits FOR SELECT USING (true);


--
-- Name: plan_unit_costs Anyone can view plan_unit_costs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view plan_unit_costs" ON public.plan_unit_costs FOR SELECT USING (true);


--
-- Name: blog_reactions Anyone can view reactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view reactions" ON public.blog_reactions FOR SELECT USING (true);


--
-- Name: industry_template_translations Anyone can view template translations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view template translations" ON public.industry_template_translations FOR SELECT USING (true);


--
-- Name: blog_reactions Authenticated can delete own reactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated can delete own reactions" ON public.blog_reactions FOR DELETE TO authenticated USING ((visitor_id IS NOT NULL));


--
-- Name: regulation_crawl_history Authenticated can read crawl history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated can read crawl history" ON public.regulation_crawl_history FOR SELECT TO authenticated USING ((auth.uid() IS NOT NULL));


--
-- Name: telegram_example_prompts Authenticated read examples; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated read examples" ON public.telegram_example_prompts FOR SELECT USING (((auth.role() = 'authenticated'::text) OR (auth.role() = 'service_role'::text)));


--
-- Name: payment_orders Authenticated users can create payment orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create payment orders" ON public.payment_orders FOR INSERT TO authenticated WITH CHECK ((public.is_org_member(auth.uid(), organization_id) AND (auth.uid() = user_id)));


--
-- Name: knowledge_graph_analytics Authenticated users can insert analytics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can insert analytics" ON public.knowledge_graph_analytics FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: industry_personas_v2 Authenticated users can read industry personas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can read industry personas" ON public.industry_personas_v2 FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: industry_persona_translations_v2 Authenticated users can read persona translations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can read persona translations" ON public.industry_persona_translations_v2 FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: carousel_style_presets Authenticated users can read style presets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can read style presets" ON public.carousel_style_presets FOR SELECT TO authenticated USING (true);


--
-- Name: regulation_versions Authenticated users can view regulation versions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view regulation versions" ON public.regulation_versions FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: knowledge_graph_cache Cache readable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Cache readable by authenticated" ON public.knowledge_graph_cache FOR SELECT TO authenticated USING ((expires_at > now()));


--
-- Name: ai_function_categories Categories are viewable by authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Categories are viewable by authenticated users" ON public.ai_function_categories FOR SELECT TO authenticated USING (((organization_id IS NULL) OR public.is_org_member(auth.uid(), organization_id)));


--
-- Name: industry_knowledge_edges Knowledge edges viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Knowledge edges viewable by authenticated" ON public.industry_knowledge_edges FOR SELECT TO authenticated USING (true);


--
-- Name: industry_knowledge_nodes Knowledge nodes viewable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Knowledge nodes viewable by authenticated" ON public.industry_knowledge_nodes FOR SELECT TO authenticated USING ((is_active = true));


--
-- Name: agent_goals Members can delete org goals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members can delete org goals" ON public.agent_goals FOR DELETE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));


--
-- Name: agent_pipelines Members can delete org pipelines; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members can delete org pipelines" ON public.agent_pipelines FOR DELETE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));


--
-- Name: agent_approvals Members can insert org approvals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members can insert org approvals" ON public.agent_approvals FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));


--
-- Name: agent_goals Members can insert org goals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members can insert org goals" ON public.agent_goals FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));


--
-- Name: agent_pipelines Members can insert org pipelines; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members can insert org pipelines" ON public.agent_pipelines FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));


--
-- Name: agent_pipeline_logs Members can insert pipeline logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members can insert pipeline logs" ON public.agent_pipeline_logs FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.agent_pipelines p
  WHERE ((p.id = agent_pipeline_logs.pipeline_id) AND public.is_org_member(auth.uid(), p.organization_id)))));


--
-- Name: agent_approvals Members can update org approvals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members can update org approvals" ON public.agent_approvals FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));


--
-- Name: agent_goals Members can update org goals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members can update org goals" ON public.agent_goals FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));


--
-- Name: agent_pipelines Members can update org pipelines; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members can update org pipelines" ON public.agent_pipelines FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));


--
-- Name: agent_team_permissions Members can view agent permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members can view agent permissions" ON public.agent_team_permissions FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));


--
-- Name: agent_approvals Members can view org approvals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members can view org approvals" ON public.agent_approvals FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));


--
-- Name: agent_goals Members can view org goals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members can view org goals" ON public.agent_goals FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));


--
-- Name: agent_pipelines Members can view org pipelines; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members can view org pipelines" ON public.agent_pipelines FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));


--
-- Name: agent_pipeline_logs Members can view pipeline logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members can view pipeline logs" ON public.agent_pipeline_logs FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.agent_pipelines p
  WHERE ((p.id = agent_pipeline_logs.pipeline_id) AND public.is_org_member(auth.uid(), p.organization_id)))));


--
-- Name: internal_links Members delete internal_links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members delete internal_links" ON public.internal_links FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.organization_members om
  WHERE ((om.organization_id = internal_links.organization_id) AND (om.user_id = auth.uid())))));


--
-- Name: internal_links Members insert internal_links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members insert internal_links" ON public.internal_links FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.organization_members om
  WHERE ((om.organization_id = internal_links.organization_id) AND (om.user_id = auth.uid())))));


--
-- Name: internal_links Members read internal_links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members read internal_links" ON public.internal_links FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.organization_members om
  WHERE ((om.organization_id = internal_links.organization_id) AND (om.user_id = auth.uid())))));


--
-- Name: internal_links Members update internal_links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members update internal_links" ON public.internal_links FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.organization_members om
  WHERE ((om.organization_id = internal_links.organization_id) AND (om.user_id = auth.uid())))));


--
-- Name: firecrawl_serp_cache No client access to firecrawl cache; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "No client access to firecrawl cache" ON public.firecrawl_serp_cache TO authenticated USING (false) WITH CHECK (false);


--
-- Name: organizations Only org admins can update organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only org admins can update organization" ON public.organizations FOR UPDATE USING (public.is_org_admin(auth.uid(), id));


--
-- Name: organizations Only org owner can delete organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only org owner can delete organization" ON public.organizations FOR DELETE USING (public.has_org_role(auth.uid(), id, 'owner'::public.org_role));


--
-- Name: organization_members Org admins can add members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org admins can add members" ON public.organization_members FOR INSERT WITH CHECK (public.is_org_admin(auth.uid(), organization_id));


--
-- Name: ai_function_categories Org admins can create custom categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org admins can create custom categories" ON public.ai_function_categories FOR INSERT TO authenticated WITH CHECK (((is_system = false) AND (organization_id IS NOT NULL) AND public.is_org_admin(auth.uid(), organization_id)));


--
-- Name: blog_posts Org admins can delete blog posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org admins can delete blog posts" ON public.blog_posts FOR DELETE TO authenticated USING (public.is_org_admin(auth.uid(), organization_id));


--
-- Name: telegram_bot_configs Org admins can delete bot config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org admins can delete bot config" ON public.telegram_bot_configs FOR DELETE USING (public.is_org_admin(auth.uid(), organization_id));


--
-- Name: content_assignments Org admins can delete content_assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org admins can delete content_assignments" ON public.content_assignments FOR DELETE USING (public.is_org_admin(auth.uid(), organization_id));


--
-- Name: ai_function_categories Org admins can delete custom categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org admins can delete custom categories" ON public.ai_function_categories FOR DELETE TO authenticated USING (((is_system = false) AND (organization_id IS NOT NULL) AND public.is_org_admin(auth.uid(), organization_id)));


--
-- Name: content_embeddings Org admins can delete embeddings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org admins can delete embeddings" ON public.content_embeddings FOR DELETE USING (((organization_id IS NOT NULL) AND public.is_org_admin(auth.uid(), organization_id)));


--
-- Name: journey_stage_messaging Org admins can delete journey_stage_messaging; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org admins can delete journey_stage_messaging" ON public.journey_stage_messaging FOR DELETE USING ((((organization_id IS NOT NULL) AND public.is_org_admin(auth.uid(), organization_id)) OR (user_id = auth.uid())));


--
-- Name: brand_products Org admins can delete org brand_products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org admins can delete org brand_products" ON public.brand_products FOR DELETE USING (((organization_id IS NOT NULL) AND public.is_org_admin(auth.uid(), organization_id)));


--
-- Name: brand_templates Org admins can delete org brand_templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org admins can delete org brand_templates" ON public.brand_templates FOR DELETE USING (((organization_id IS NOT NULL) AND public.is_org_admin(auth.uid(), organization_id)));


--
-- Name: brand_voice_variants Org admins can delete org brand_voice_variants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org admins can delete org brand_voice_variants" ON public.brand_voice_variants FOR DELETE USING (((organization_id IS NOT NULL) AND public.is_org_admin(auth.uid(), organization_id)));


--
-- Name: carousels Org admins can delete org carousels; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org admins can delete org carousels" ON public.carousels FOR DELETE USING (((organization_id IS NOT NULL) AND public.is_org_admin(auth.uid(), organization_id)));


--
-- Name: content_schedules Org admins can delete org content_schedules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org admins can delete org content_schedules" ON public.content_schedules FOR DELETE USING (((organization_id IS NOT NULL) AND public.is_org_admin(auth.uid(), organization_id)));


--
-- Name: chat_conversations Org admins can delete org conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org admins can delete org conversations" ON public.chat_conversations FOR DELETE USING (((organization_id IS NOT NULL) AND public.is_org_admin(auth.uid(), organization_id)));


--
-- Name: multi_channel_contents Org admins can delete org multi_channel_contents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org admins can delete org multi_channel_contents" ON public.multi_channel_contents FOR DELETE USING (((organization_id IS NOT NULL) AND public.is_org_admin(auth.uid(), organization_id)));


--
-- Name: user_saved_hooks Org admins can delete org saved hooks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org admins can delete org saved hooks" ON public.user_saved_hooks FOR DELETE USING (((organization_id IS NOT NULL) AND public.is_org_admin(auth.uid(), organization_id)));


--
-- Name: scripts Org admins can delete org scripts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org admins can delete org scripts" ON public.scripts FOR DELETE USING (((organization_id IS NOT NULL) AND public.is_org_admin(auth.uid(), organization_id)));


--
-- Name: topic_content_links Org admins can delete org topic_content_links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org admins can delete org topic_content_links" ON public.topic_content_links FOR DELETE USING (((organization_id IS NOT NULL) AND public.is_org_admin(auth.uid(), organization_id)));


--
-- Name: topic_history Org admins can delete org topic_history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org admins can delete org topic_history" ON public.topic_history FOR DELETE USING (((organization_id IS NOT NULL) AND public.is_org_admin(auth.uid(), organization_id)));


--
-- Name: social_connections Org admins can delete social_connections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org admins can delete social_connections" ON public.social_connections FOR DELETE TO authenticated USING (((organization_id IS NOT NULL) AND public.is_org_admin(auth.uid(), organization_id)));


--
-- Name: trending_topics Org admins can delete trending_topics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org admins can delete trending_topics" ON public.trending_topics FOR DELETE USING (public.is_org_admin(auth.uid(), organization_id));


--
-- Name: social_connections Org admins can insert org social_connections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org admins can insert org social_connections" ON public.social_connections FOR INSERT TO authenticated WITH CHECK (((organization_id IS NOT NULL) AND public.is_org_admin(auth.uid(), organization_id)));


--
-- Name: approval_assignments Org admins can manage approval_assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org admins can manage approval_assignments" ON public.approval_assignments USING (public.is_org_admin(auth.uid(), organization_id)) WITH CHECK (public.is_org_admin(auth.uid(), organization_id));


--
-- Name: ai_function_configs Org admins can manage function configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org admins can manage function configs" ON public.ai_function_configs USING (public.is_org_admin(auth.uid(), organization_id)) WITH CHECK (public.is_org_admin(auth.uid(), organization_id));


--
-- Name: ai_channel_model_configs Org admins can manage org channel model configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org admins can manage org channel model configs" ON public.ai_channel_model_configs USING (public.is_org_admin(auth.uid(), organization_id)) WITH CHECK (public.is_org_admin(auth.uid(), organization_id));


--
-- Name: curated_events Org admins can manage org curated_events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org admins can manage org curated_events" ON public.curated_events USING (((organization_id IS NOT NULL) AND public.is_org_admin(auth.uid(), organization_id))) WITH CHECK (((organization_id IS NOT NULL) AND public.is_org_admin(auth.uid(), organization_id)));


--
-- Name: curated_news Org admins can manage org curated_news; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org admins can manage org curated_news" ON public.curated_news USING (((organization_id IS NOT NULL) AND public.is_org_admin(auth.uid(), organization_id))) WITH CHECK (((organization_id IS NOT NULL) AND public.is_org_admin(auth.uid(), organization_id)));


--
-- Name: ai_provider_configs Org admins can manage providers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org admins can manage providers" ON public.ai_provider_configs TO authenticated USING (public.is_org_admin(auth.uid(), organization_id)) WITH CHECK (public.is_org_admin(auth.uid(), organization_id));


--
-- Name: organization_members Org admins can remove members except owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org admins can remove members except owner" ON public.organization_members FOR DELETE USING ((public.is_org_admin(auth.uid(), organization_id) AND (NOT public.has_org_role(user_id, organization_id, 'owner'::public.org_role))));


--
-- Name: content_assignments Org admins can update content_assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org admins can update content_assignments" ON public.content_assignments FOR UPDATE USING (public.is_org_member(auth.uid(), organization_id));


--
-- Name: ai_function_categories Org admins can update custom categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org admins can update custom categories" ON public.ai_function_categories FOR UPDATE TO authenticated USING (((is_system = false) AND (organization_id IS NOT NULL) AND public.is_org_admin(auth.uid(), organization_id)));


--
-- Name: organization_members Org admins can update member roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org admins can update member roles" ON public.organization_members FOR UPDATE USING ((public.is_org_admin(auth.uid(), organization_id) AND (NOT public.has_org_role(user_id, organization_id, 'owner'::public.org_role))));


--
-- Name: social_connections Org admins can update org social_connections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org admins can update org social_connections" ON public.social_connections FOR UPDATE TO authenticated USING (((organization_id IS NOT NULL) AND public.is_org_admin(auth.uid(), organization_id)));


--
-- Name: telegram_bot_configs Org admins can view bot config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org admins can view bot config" ON public.telegram_bot_configs FOR SELECT USING (public.is_org_admin(auth.uid(), organization_id));


--
-- Name: brand_templates Org admins can view deleted brand_templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org admins can view deleted brand_templates" ON public.brand_templates FOR SELECT USING (((organization_id IS NOT NULL) AND public.is_org_admin(auth.uid(), organization_id) AND (deleted_at IS NOT NULL)));


--
-- Name: knowledge_graph_analytics Org admins can view org analytics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org admins can view org analytics" ON public.knowledge_graph_analytics FOR SELECT TO authenticated USING (((organization_id IS NULL) OR public.is_org_member(auth.uid(), organization_id)));


--
-- Name: social_connections Org admins can view org social_connections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org admins can view org social_connections" ON public.social_connections FOR SELECT TO authenticated USING (((organization_id IS NOT NULL) AND public.is_org_admin(auth.uid(), organization_id)));


--
-- Name: ai_provider_configs Org admins can view providers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org admins can view providers" ON public.ai_provider_configs FOR SELECT TO authenticated USING (public.is_org_admin(auth.uid(), organization_id));


--
-- Name: ai_agent_model_configs Org admins manage agent configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org admins manage agent configs" ON public.ai_agent_model_configs TO authenticated USING (public.is_org_admin(auth.uid(), organization_id));


--
-- Name: blog_posts Org members can create blog posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org members can create blog posts" ON public.blog_posts FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));


--
-- Name: calendar_notes Org members can create calendar notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org members can create calendar notes" ON public.calendar_notes FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));


--
-- Name: calendar_notes Org members can delete calendar notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org members can delete calendar notes" ON public.calendar_notes FOR DELETE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));


--
-- Name: chat_messages Org members can insert chat messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org members can insert chat messages" ON public.chat_messages FOR INSERT WITH CHECK ((public.is_org_member(auth.uid(), organization_id) AND (auth.uid() = sender_id)));


--
-- Name: journey_stage_messaging Org members can insert journey_stage_messaging; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org members can insert journey_stage_messaging" ON public.journey_stage_messaging FOR INSERT WITH CHECK ((((organization_id IS NULL) AND (user_id = auth.uid())) OR ((organization_id IS NOT NULL) AND public.is_org_member(auth.uid(), organization_id))));


--
-- Name: ai_agent_model_configs Org members can read agent configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org members can read agent configs" ON public.ai_agent_model_configs FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));


--
-- Name: brand_memory Org members can read brand_memory; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org members can read brand_memory" ON public.brand_memory FOR SELECT USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: social_post_engagements Org members can read engagements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org members can read engagements" ON public.social_post_engagements FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));


--
-- Name: report_sync_state Org members can read report_sync_state; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org members can read report_sync_state" ON public.report_sync_state FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));


--
-- Name: social_post_metrics Org members can read social_post_metrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org members can read social_post_metrics" ON public.social_post_metrics FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));


--
-- Name: blog_posts Org members can update blog posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org members can update blog posts" ON public.blog_posts FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));


--
-- Name: calendar_notes Org members can update calendar notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org members can update calendar notes" ON public.calendar_notes FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));


--
-- Name: content_embeddings Org members can update embeddings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org members can update embeddings" ON public.content_embeddings FOR UPDATE USING (((organization_id IS NOT NULL) AND public.is_org_member(auth.uid(), organization_id)));


--
-- Name: journey_stage_messaging Org members can update journey_stage_messaging; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org members can update journey_stage_messaging" ON public.journey_stage_messaging FOR UPDATE USING ((((organization_id IS NOT NULL) AND public.is_org_member(auth.uid(), organization_id)) OR (user_id = auth.uid())));


--
-- Name: chat_conversations Org members can update org conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org members can update org conversations" ON public.chat_conversations FOR UPDATE USING (((organization_id IS NOT NULL) AND public.is_org_member(auth.uid(), organization_id)));


--
-- Name: addon_purchases Org members can view addon purchases; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org members can view addon purchases" ON public.addon_purchases FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));


--
-- Name: approval_assignments Org members can view approval_assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org members can view approval_assignments" ON public.approval_assignments FOR SELECT USING (public.is_org_member(auth.uid(), organization_id));


--
-- Name: calendar_notes Org members can view calendar notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org members can view calendar notes" ON public.calendar_notes FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));


--
-- Name: chat_messages Org members can view chat messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org members can view chat messages" ON public.chat_messages FOR SELECT USING (public.is_org_member(auth.uid(), organization_id));


--
-- Name: journey_stage_messaging Org members can view journey_stage_messaging; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org members can view journey_stage_messaging" ON public.journey_stage_messaging FOR SELECT USING ((((organization_id IS NOT NULL) AND public.is_org_member(auth.uid(), organization_id)) OR (user_id = auth.uid())));


--
-- Name: orchestrator_daily_stats Org members can view orchestrator stats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org members can view orchestrator stats" ON public.orchestrator_daily_stats FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));


--
-- Name: web_search_analytics Org members can view org analytics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org members can view org analytics" ON public.web_search_analytics FOR SELECT USING (((organization_id IS NOT NULL) AND public.is_org_member(auth.uid(), organization_id)));


--
-- Name: ai_response_cache Org members can view org cache entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org members can view org cache entries" ON public.ai_response_cache FOR SELECT USING (((cache_scope = 'global'::text) OR ((cache_scope = 'org'::text) AND public.is_org_member(auth.uid(), organization_id))));


--
-- Name: conversation_embeddings Org members can view org conversation embeddings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org members can view org conversation embeddings" ON public.conversation_embeddings FOR SELECT USING (((organization_id IS NOT NULL) AND public.is_org_member(auth.uid(), organization_id)));


--
-- Name: chat_conversation_messages Org members can view org conversation messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org members can view org conversation messages" ON public.chat_conversation_messages FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.chat_conversations c
  WHERE ((c.id = chat_conversation_messages.conversation_id) AND (c.organization_id IS NOT NULL) AND public.is_org_member(auth.uid(), c.organization_id)))));


--
-- Name: chat_conversations Org members can view org conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org members can view org conversations" ON public.chat_conversations FOR SELECT USING (((organization_id IS NOT NULL) AND public.is_org_member(auth.uid(), organization_id)));


--
-- Name: curated_events Org members can view org curated_events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org members can view org curated_events" ON public.curated_events FOR SELECT USING ((((organization_id IS NULL) AND (is_active = true)) OR ((organization_id IS NOT NULL) AND public.is_org_member(auth.uid(), organization_id))));


--
-- Name: curated_news Org members can view org curated_news; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org members can view org curated_news" ON public.curated_news FOR SELECT USING ((((organization_id IS NULL) AND (is_active = true)) OR ((organization_id IS NOT NULL) AND public.is_org_member(auth.uid(), organization_id))));


--
-- Name: chat_feedback Org members can view org feedback; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org members can view org feedback" ON public.chat_feedback FOR SELECT USING (((organization_id IS NOT NULL) AND public.is_org_member(auth.uid(), organization_id)));


--
-- Name: ai_metrics Org members can view org metrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org members can view org metrics" ON public.ai_metrics FOR SELECT USING (((organization_id IS NOT NULL) AND public.is_org_member(auth.uid(), organization_id)));


--
-- Name: storyboards Org members can view org storyboards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org members can view org storyboards" ON public.storyboards FOR SELECT USING (((organization_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.organization_members
  WHERE ((organization_members.organization_id = storyboards.organization_id) AND (organization_members.user_id = auth.uid()))))));


--
-- Name: video_generations Org members can view org video generations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org members can view org video generations" ON public.video_generations FOR SELECT USING (((organization_id IS NOT NULL) AND public.is_org_member(auth.uid(), organization_id)));


--
-- Name: payment_orders Org members can view payment orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org members can view payment orders" ON public.payment_orders FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));


--
-- Name: profiles Org members can view profiles of other members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org members can view profiles of other members" ON public.profiles FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.organization_members om1
     JOIN public.organization_members om2 ON ((om1.organization_id = om2.organization_id)))
  WHERE ((om1.user_id = auth.uid()) AND (om2.user_id = profiles.id)))));


--
-- Name: script_versions Org members can view shared script versions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org members can view shared script versions" ON public.script_versions FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.scripts
  WHERE ((scripts.id = script_versions.script_id) AND (scripts.shared_with_org = true) AND public.is_org_member(auth.uid(), scripts.organization_id)))));


--
-- Name: scripts Org members can view shared scripts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org members can view shared scripts" ON public.scripts FOR SELECT USING (((shared_with_org = true) AND public.is_org_member(auth.uid(), organization_id)));


--
-- Name: subscriptions Org members can view subscription; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org members can view subscription" ON public.subscriptions FOR SELECT TO authenticated USING (((auth.uid() = user_id) OR (organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid())))));


--
-- Name: audio_assets Org members view org audio; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org members view org audio" ON public.audio_assets FOR SELECT USING (((organization_id IS NOT NULL) AND public.is_org_member(auth.uid(), organization_id)));


--
-- Name: video_render_jobs Org members view org render jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org members view org render jobs" ON public.video_render_jobs FOR SELECT USING (((organization_id IS NOT NULL) AND public.is_org_member(auth.uid(), organization_id)));


--
-- Name: seo_landing_pages Public can view published SEO pages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view published SEO pages" ON public.seo_landing_pages FOR SELECT USING ((is_published = true));


--
-- Name: edge_function_metrics Service can insert metrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service can insert metrics" ON public.edge_function_metrics FOR INSERT WITH CHECK (true);


--
-- Name: edge_function_daily_stats Service can manage daily stats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service can manage daily stats" ON public.edge_function_daily_stats USING (true) WITH CHECK (true);


--
-- Name: web_search_analytics Service role can insert analytics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can insert analytics" ON public.web_search_analytics FOR INSERT WITH CHECK (((auth.jwt() ->> 'role'::text) = 'service_role'::text));


--
-- Name: circuit_breaker_events Service role can insert circuit breaker events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can insert circuit breaker events" ON public.circuit_breaker_events FOR INSERT TO service_role WITH CHECK (true);


--
-- Name: cron_run_logs Service role can insert cron logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can insert cron logs" ON public.cron_run_logs FOR INSERT TO service_role WITH CHECK (true);


--
-- Name: social_post_engagements Service role can insert engagements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can insert engagements" ON public.social_post_engagements FOR INSERT TO service_role WITH CHECK (true);


--
-- Name: ai_metrics Service role can insert metrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can insert metrics" ON public.ai_metrics FOR INSERT TO service_role WITH CHECK (true);


--
-- Name: profiles Service role can insert profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can insert profiles" ON public.profiles FOR INSERT TO service_role WITH CHECK (true);


--
-- Name: security_events Service role can insert security events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can insert security events" ON public.security_events FOR INSERT TO service_role WITH CHECK (true);


--
-- Name: social_post_metrics Service role can insert social_post_metrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can insert social_post_metrics" ON public.social_post_metrics FOR INSERT TO service_role WITH CHECK (true);


--
-- Name: ad_copy_benchmarks Service role can manage benchmarks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage benchmarks" ON public.ad_copy_benchmarks TO service_role USING (true) WITH CHECK (true);


--
-- Name: brand_memory Service role can manage brand_memory; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage brand_memory" ON public.brand_memory TO service_role USING (true) WITH CHECK (true);


--
-- Name: web_search_cache Service role can manage cache; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage cache" ON public.web_search_cache USING (((auth.jwt() ->> 'role'::text) = 'service_role'::text)) WITH CHECK (((auth.jwt() ->> 'role'::text) = 'service_role'::text));


--
-- Name: orchestrator_daily_stats Service role can manage orchestrator stats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage orchestrator stats" ON public.orchestrator_daily_stats TO service_role USING (true) WITH CHECK (true);


--
-- Name: report_sync_state Service role can manage report_sync_state; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage report_sync_state" ON public.report_sync_state TO service_role USING (true) WITH CHECK (true);


--
-- Name: carousel_style_presets Service role can manage style presets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage style presets" ON public.carousel_style_presets TO service_role USING (true) WITH CHECK (true);


--
-- Name: social_post_metrics Service role can update social_post_metrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can update social_post_metrics" ON public.social_post_metrics FOR UPDATE TO service_role USING (true) WITH CHECK (true);


--
-- Name: workflow_checkpoints Service role full access on workflow_checkpoints; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access on workflow_checkpoints" ON public.workflow_checkpoints TO service_role USING (true) WITH CHECK (true);


--
-- Name: social_connections Service role full access social_connections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access social_connections" ON public.social_connections TO service_role USING (true) WITH CHECK (true);


--
-- Name: conversation_embeddings Service role has full access to conversation embeddings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role has full access to conversation embeddings" ON public.conversation_embeddings USING (((auth.jwt() ->> 'role'::text) = 'service_role'::text)) WITH CHECK (((auth.jwt() ->> 'role'::text) = 'service_role'::text));


--
-- Name: knowledge_graph_cache Service role manages cache; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role manages cache" ON public.knowledge_graph_cache TO service_role USING (true) WITH CHECK (true);


--
-- Name: ai_agent_model_configs System admins manage global agent configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System admins manage global agent configs" ON public.ai_agent_model_configs TO authenticated USING (((organization_id IS NULL) AND public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: notifications System can insert notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT WITH CHECK ((public.is_org_member(auth.uid(), organization_id) OR (organization_id IS NULL)));


--
-- Name: ai_prompt_history System can insert prompt history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert prompt history" ON public.ai_prompt_history FOR INSERT WITH CHECK ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: ad_copy_ab_tests Users can create ab tests in their org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create ab tests in their org" ON public.ad_copy_ab_tests FOR INSERT WITH CHECK ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: channel_image_history Users can create image history in their org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create image history in their org" ON public.channel_image_history FOR INSERT WITH CHECK (public.is_org_member(auth.uid(), organization_id));


--
-- Name: core_contents Users can create org core contents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create org core contents" ON public.core_contents FOR INSERT WITH CHECK ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: organizations Users can create organizations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create organizations" ON public.organizations FOR INSERT TO authenticated WITH CHECK ((auth.uid() = owner_id));


--
-- Name: storyboards Users can create own storyboards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own storyboards" ON public.storyboards FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: generation_tasks Users can create own tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own tasks" ON public.generation_tasks FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: customer_personas Users can create personas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create personas" ON public.customer_personas FOR INSERT WITH CHECK (((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))) OR (user_id = auth.uid())));


--
-- Name: planning_sessions Users can create planning sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create planning sessions" ON public.planning_sessions FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: ad_sync_configs Users can create sync configs in their org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create sync configs in their org" ON public.ad_sync_configs FOR INSERT WITH CHECK (public.is_org_member(auth.uid(), organization_id));


--
-- Name: script_versions Users can create versions for their own scripts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create versions for their own scripts" ON public.script_versions FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM public.scripts
  WHERE ((scripts.id = script_versions.script_id) AND (scripts.user_id = auth.uid())))) AND (created_by = auth.uid())));


--
-- Name: video_generations Users can create video generations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create video generations" ON public.video_generations FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: ad_copy_ab_results Users can delete ab results for their org tests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete ab results for their org tests" ON public.ad_copy_ab_results FOR DELETE USING ((ab_test_id IN ( SELECT ad_copy_ab_tests.id
   FROM public.ad_copy_ab_tests
  WHERE (ad_copy_ab_tests.organization_id IN ( SELECT organization_members.organization_id
           FROM public.organization_members
          WHERE (organization_members.user_id = auth.uid()))))));


--
-- Name: ad_sequences Users can delete ad_sequences in their org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete ad_sequences in their org" ON public.ad_sequences FOR DELETE USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: ad_copy_creative_scores Users can delete creative scores in their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete creative scores in their organization" ON public.ad_copy_creative_scores FOR DELETE USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: planned_content_items Users can delete items in their sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete items in their sessions" ON public.planned_content_items FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.planning_sessions ps
  WHERE ((ps.id = planned_content_items.session_id) AND ((ps.user_id = auth.uid()) OR ((ps.organization_id IS NOT NULL) AND public.is_org_admin(auth.uid(), ps.organization_id)))))));


--
-- Name: chat_conversation_messages Users can delete messages from own conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete messages from own conversations" ON public.chat_conversation_messages FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.chat_conversations c
  WHERE ((c.id = chat_conversation_messages.conversation_id) AND (c.user_id = auth.uid())))));


--
-- Name: ad_copy_optimization_suggestions Users can delete optimization suggestions in their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete optimization suggestions in their organization" ON public.ad_copy_optimization_suggestions FOR DELETE USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: ad_copy_ai_insights Users can delete org ai insights; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete org ai insights" ON public.ad_copy_ai_insights FOR DELETE USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: core_contents Users can delete org core contents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete org core contents" ON public.core_contents FOR DELETE USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: telegram_chat_bindings Users can delete own bindings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own bindings" ON public.telegram_chat_bindings FOR DELETE USING (((auth.uid() = user_id) OR public.is_org_admin(auth.uid(), organization_id)));


--
-- Name: brand_products Users can delete own brand_products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own brand_products" ON public.brand_products FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: brand_templates Users can delete own brand_templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own brand_templates" ON public.brand_templates FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: brand_voice_variants Users can delete own brand_voice_variants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own brand_voice_variants" ON public.brand_voice_variants FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: carousels Users can delete own carousels; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own carousels" ON public.carousels FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: conversation_embeddings Users can delete own conversation embeddings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own conversation embeddings" ON public.conversation_embeddings FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: chat_conversations Users can delete own conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own conversations" ON public.chat_conversations FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: product_persona_mappings Users can delete own mappings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own mappings" ON public.product_persona_mappings FOR DELETE USING (((user_id = auth.uid()) OR ((organization_id IS NOT NULL) AND public.is_org_admin(auth.uid(), organization_id))));


--
-- Name: chat_messages Users can delete own messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own messages" ON public.chat_messages FOR DELETE USING ((auth.uid() = sender_id));


--
-- Name: multi_channel_contents Users can delete own multi_channel_contents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own multi_channel_contents" ON public.multi_channel_contents FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: notifications Users can delete own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own notifications" ON public.notifications FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: ad_copies Users can delete own org ad_copies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own org ad_copies" ON public.ad_copies FOR DELETE USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: geo_brand_monitors Users can delete own org geo monitors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own org geo monitors" ON public.geo_brand_monitors FOR DELETE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));


--
-- Name: planning_sessions Users can delete own planning sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own planning sessions" ON public.planning_sessions FOR DELETE USING (((user_id = auth.uid()) OR ((organization_id IS NOT NULL) AND public.is_org_admin(auth.uid(), organization_id))));


--
-- Name: user_preferences Users can delete own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own preferences" ON public.user_preferences FOR DELETE USING ((user_id = auth.uid()));


--
-- Name: user_saved_hooks Users can delete own saved hooks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own saved hooks" ON public.user_saved_hooks FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: scripts Users can delete own scripts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own scripts" ON public.scripts FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: storyboards Users can delete own storyboards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own storyboards" ON public.storyboards FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: content_style_patterns Users can delete own style patterns; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own style patterns" ON public.content_style_patterns FOR DELETE USING (((user_id = auth.uid()) OR ((organization_id IS NOT NULL) AND public.is_org_admin(auth.uid(), organization_id))));


--
-- Name: generation_tasks Users can delete own tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own tasks" ON public.generation_tasks FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: topic_content_links Users can delete own topic_content_links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own topic_content_links" ON public.topic_content_links FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: topic_history Users can delete own topic_history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own topic_history" ON public.topic_history FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: customer_personas Users can delete personas in their org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete personas in their org" ON public.customer_personas FOR DELETE USING (((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))) OR (user_id = auth.uid())));


--
-- Name: saved_audiences Users can delete saved_audiences in their org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete saved_audiences in their org" ON public.saved_audiences FOR DELETE USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: ad_sequence_stage_copies Users can delete stage_copies via stage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete stage_copies via stage" ON public.ad_sequence_stage_copies FOR DELETE USING ((stage_id IN ( SELECT s.id
   FROM (public.ad_sequence_stages s
     JOIN public.ad_sequences seq ON ((s.sequence_id = seq.id)))
  WHERE (seq.organization_id IN ( SELECT organization_members.organization_id
           FROM public.organization_members
          WHERE (organization_members.user_id = auth.uid()))))));


--
-- Name: ad_sequence_stages Users can delete stages via sequence; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete stages via sequence" ON public.ad_sequence_stages FOR DELETE USING ((sequence_id IN ( SELECT ad_sequences.id
   FROM public.ad_sequences
  WHERE (ad_sequences.organization_id IN ( SELECT organization_members.organization_id
           FROM public.organization_members
          WHERE (organization_members.user_id = auth.uid()))))));


--
-- Name: ad_swipe_files Users can delete swipe files in their org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete swipe files in their org" ON public.ad_swipe_files FOR DELETE USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: ad_copy_ab_tests Users can delete their org ab tests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their org ab tests" ON public.ad_copy_ab_tests FOR DELETE USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: channel_image_history Users can delete their org's image history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their org's image history" ON public.channel_image_history FOR DELETE USING (public.is_org_member(auth.uid(), organization_id));


--
-- Name: ad_sync_configs Users can delete their org's sync configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their org's sync configs" ON public.ad_sync_configs FOR DELETE USING (public.is_org_member(auth.uid(), organization_id));


--
-- Name: carousel_images Users can delete their own carousel images; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own carousel images" ON public.carousel_images FOR DELETE TO authenticated USING ((created_by = auth.uid()));


--
-- Name: kpi_adjustment_dismissals Users can delete their own dismissals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own dismissals" ON public.kpi_adjustment_dismissals FOR DELETE USING ((user_id = auth.uid()));


--
-- Name: oauth_pending_states Users can delete their own oauth pending states; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own oauth pending states" ON public.oauth_pending_states FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: pinterest_boards Users can delete their own pinterest boards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own pinterest boards" ON public.pinterest_boards FOR DELETE USING ((connection_id IN ( SELECT social_connections.id
   FROM public.social_connections
  WHERE (social_connections.user_id = auth.uid()))));


--
-- Name: video_generations Users can delete their own video generations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own video generations" ON public.video_generations FOR DELETE USING ((user_id = auth.uid()));


--
-- Name: ad_copy_ab_results Users can insert ab results for their org tests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert ab results for their org tests" ON public.ad_copy_ab_results FOR INSERT WITH CHECK ((ab_test_id IN ( SELECT ad_copy_ab_tests.id
   FROM public.ad_copy_ab_tests
  WHERE (ad_copy_ab_tests.organization_id IN ( SELECT organization_members.organization_id
           FROM public.organization_members
          WHERE (organization_members.user_id = auth.uid()))))));


--
-- Name: ad_copies Users can insert ad_copies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert ad_copies" ON public.ad_copies FOR INSERT WITH CHECK ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: ad_sequences Users can insert ad_sequences in their org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert ad_sequences in their org" ON public.ad_sequences FOR INSERT WITH CHECK ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: brand_products Users can insert brand_products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert brand_products" ON public.brand_products FOR INSERT WITH CHECK ((((organization_id IS NULL) AND (user_id = auth.uid())) OR ((organization_id IS NOT NULL) AND public.is_org_member(auth.uid(), organization_id))));


--
-- Name: brand_templates Users can insert brand_templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert brand_templates" ON public.brand_templates FOR INSERT TO authenticated WITH CHECK ((((organization_id IS NULL) AND (user_id = auth.uid())) OR ((organization_id IS NOT NULL) AND public.is_org_member(auth.uid(), organization_id) AND ((user_id IS NULL) OR (user_id = auth.uid())))));


--
-- Name: ad_copy_creative_scores Users can insert creative scores in their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert creative scores in their organization" ON public.ad_copy_creative_scores FOR INSERT WITH CHECK ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: kpi_adjustment_dismissals Users can insert dismissals for their organization campaigns; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert dismissals for their organization campaigns" ON public.kpi_adjustment_dismissals FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.campaigns c
     JOIN public.organization_members om ON ((om.organization_id = c.organization_id)))
  WHERE ((c.id = kpi_adjustment_dismissals.campaign_id) AND (om.user_id = auth.uid())))));


--
-- Name: planned_content_items Users can insert items in their sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert items in their sessions" ON public.planned_content_items FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.planning_sessions ps
  WHERE ((ps.id = planned_content_items.session_id) AND ((ps.user_id = auth.uid()) OR ((ps.organization_id IS NOT NULL) AND public.is_org_member(auth.uid(), ps.organization_id)))))));


--
-- Name: content_learnings Users can insert learnings for their org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert learnings for their org" ON public.content_learnings FOR INSERT WITH CHECK ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: product_persona_mappings Users can insert mappings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert mappings" ON public.product_persona_mappings FOR INSERT WITH CHECK ((((organization_id IS NULL) AND (user_id = auth.uid())) OR ((organization_id IS NOT NULL) AND public.is_org_member(auth.uid(), organization_id))));


--
-- Name: chat_conversation_messages Users can insert messages to own conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert messages to own conversations" ON public.chat_conversation_messages FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.chat_conversations c
  WHERE ((c.id = chat_conversation_messages.conversation_id) AND (c.user_id = auth.uid())))));


--
-- Name: ad_copy_optimization_suggestions Users can insert optimization suggestions in their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert optimization suggestions in their organization" ON public.ad_copy_optimization_suggestions FOR INSERT WITH CHECK ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: ad_copy_ai_insights Users can insert org ai insights; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert org ai insights" ON public.ad_copy_ai_insights FOR INSERT WITH CHECK ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: ad_copy_analytics_snapshots Users can insert org analytics snapshots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert org analytics snapshots" ON public.ad_copy_analytics_snapshots FOR INSERT WITH CHECK ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: approval_logs Users can insert org approval_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert org approval_logs" ON public.approval_logs FOR INSERT WITH CHECK (public.is_org_member(auth.uid(), organization_id));


--
-- Name: brand_voice_variants Users can insert org brand_voice_variants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert org brand_voice_variants" ON public.brand_voice_variants FOR INSERT WITH CHECK (((organization_id IS NULL) OR public.is_org_member(auth.uid(), organization_id)));


--
-- Name: carousels Users can insert org carousels; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert org carousels" ON public.carousels FOR INSERT WITH CHECK (((organization_id IS NULL) OR public.is_org_member(auth.uid(), organization_id)));


--
-- Name: content_assignments Users can insert org content_assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert org content_assignments" ON public.content_assignments FOR INSERT WITH CHECK (public.is_org_member(auth.uid(), organization_id));


--
-- Name: content_publishing_logs Users can insert org content_publishing_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert org content_publishing_logs" ON public.content_publishing_logs FOR INSERT WITH CHECK (((organization_id IS NULL) OR public.is_org_member(auth.uid(), organization_id)));


--
-- Name: content_schedules Users can insert org content_schedules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert org content_schedules" ON public.content_schedules FOR INSERT WITH CHECK (((organization_id IS NULL) OR public.is_org_member(auth.uid(), organization_id)));


--
-- Name: content_embeddings Users can insert org embeddings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert org embeddings" ON public.content_embeddings FOR INSERT WITH CHECK (((organization_id IS NULL) OR public.is_org_member(auth.uid(), organization_id)));


--
-- Name: multi_channel_contents Users can insert org multi_channel_contents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert org multi_channel_contents" ON public.multi_channel_contents FOR INSERT WITH CHECK (((organization_id IS NULL) OR public.is_org_member(auth.uid(), organization_id)));


--
-- Name: publish_attempts Users can insert org publish_attempts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert org publish_attempts" ON public.publish_attempts FOR INSERT WITH CHECK (((organization_id IS NOT NULL) AND public.is_org_member(auth.uid(), organization_id)));


--
-- Name: user_saved_hooks Users can insert org saved hooks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert org saved hooks" ON public.user_saved_hooks FOR INSERT WITH CHECK (((organization_id IS NULL) OR public.is_org_member(auth.uid(), organization_id)));


--
-- Name: scripts Users can insert org scripts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert org scripts" ON public.scripts FOR INSERT WITH CHECK (((organization_id IS NULL) OR public.is_org_member(auth.uid(), organization_id)));


--
-- Name: topic_content_links Users can insert org topic_content_links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert org topic_content_links" ON public.topic_content_links FOR INSERT WITH CHECK (((organization_id IS NULL) OR public.is_org_member(auth.uid(), organization_id)));


--
-- Name: topic_history Users can insert org topic_history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert org topic_history" ON public.topic_history FOR INSERT WITH CHECK (((organization_id IS NULL) OR public.is_org_member(auth.uid(), organization_id)));


--
-- Name: trending_topics Users can insert org trending_topics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert org trending_topics" ON public.trending_topics FOR INSERT WITH CHECK (public.is_org_member(auth.uid(), organization_id));


--
-- Name: insight_analytics Users can insert own analytics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own analytics" ON public.insight_analytics FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: brand_voice_variants Users can insert own brand_voice_variants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own brand_voice_variants" ON public.brand_voice_variants FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: carousels Users can insert own carousels; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own carousels" ON public.carousels FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: conversation_embeddings Users can insert own conversation embeddings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own conversation embeddings" ON public.conversation_embeddings FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: chat_conversations Users can insert own conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own conversations" ON public.chat_conversations FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: chat_feedback Users can insert own feedback; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own feedback" ON public.chat_feedback FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: content_feedback Users can insert own feedback; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own feedback" ON public.content_feedback FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: multi_channel_contents Users can insert own multi_channel_contents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own multi_channel_contents" ON public.multi_channel_contents FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: geo_brand_monitors Users can insert own org geo monitors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own org geo monitors" ON public.geo_brand_monitors FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));


--
-- Name: geo_monitoring_results Users can insert own org monitoring results; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own org monitoring results" ON public.geo_monitoring_results FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));


--
-- Name: user_preferences Users can insert own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own preferences" ON public.user_preferences FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: profiles Users can insert own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((auth.uid() = id));


--
-- Name: user_saved_hooks Users can insert own saved hooks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own saved hooks" ON public.user_saved_hooks FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: scripts Users can insert own scripts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own scripts" ON public.scripts FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: generation_signals Users can insert own signals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own signals" ON public.generation_signals FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: topic_content_links Users can insert own topic_content_links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own topic_content_links" ON public.topic_content_links FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: topic_history Users can insert own topic_history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own topic_history" ON public.topic_history FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: ad_copy_prediction_history Users can insert prediction history in their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert prediction history in their organization" ON public.ad_copy_prediction_history FOR INSERT WITH CHECK ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: saved_audiences Users can insert saved_audiences in their org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert saved_audiences in their org" ON public.saved_audiences FOR INSERT WITH CHECK ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: ad_sequence_stage_copies Users can insert stage_copies via stage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert stage_copies via stage" ON public.ad_sequence_stage_copies FOR INSERT WITH CHECK ((stage_id IN ( SELECT s.id
   FROM (public.ad_sequence_stages s
     JOIN public.ad_sequences seq ON ((s.sequence_id = seq.id)))
  WHERE (seq.organization_id IN ( SELECT organization_members.organization_id
           FROM public.organization_members
          WHERE (organization_members.user_id = auth.uid()))))));


--
-- Name: ad_sequence_stages Users can insert stages via sequence; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert stages via sequence" ON public.ad_sequence_stages FOR INSERT WITH CHECK ((sequence_id IN ( SELECT ad_sequences.id
   FROM public.ad_sequences
  WHERE (ad_sequences.organization_id IN ( SELECT organization_members.organization_id
           FROM public.organization_members
          WHERE (organization_members.user_id = auth.uid()))))));


--
-- Name: content_style_patterns Users can insert style patterns; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert style patterns" ON public.content_style_patterns FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: ad_swipe_files Users can insert swipe files in their org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert swipe files in their org" ON public.ad_swipe_files FOR INSERT WITH CHECK ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: carousel_images Users can insert their own carousel images; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own carousel images" ON public.carousel_images FOR INSERT TO authenticated WITH CHECK ((created_by = auth.uid()));


--
-- Name: oauth_pending_states Users can insert their own oauth pending states; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own oauth pending states" ON public.oauth_pending_states FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: pinterest_boards Users can insert their own pinterest boards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own pinterest boards" ON public.pinterest_boards FOR INSERT WITH CHECK ((connection_id IN ( SELECT social_connections.id
   FROM public.social_connections
  WHERE (social_connections.user_id = auth.uid()))));


--
-- Name: brand_channel_optimizations Users can manage brand channel optimizations in their org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage brand channel optimizations in their org" ON public.brand_channel_optimizations USING ((brand_template_id IN ( SELECT bt.id
   FROM (public.brand_templates bt
     JOIN public.organization_members om ON ((bt.organization_id = om.organization_id)))
  WHERE (om.user_id = auth.uid()))));


--
-- Name: brand_preferences_learned Users can manage brand preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage brand preferences" ON public.brand_preferences_learned USING ((brand_template_id IN ( SELECT brand_templates.id
   FROM public.brand_templates
  WHERE (brand_templates.organization_id IN ( SELECT organization_members.organization_id
           FROM public.organization_members
          WHERE (organization_members.user_id = auth.uid()))))));


--
-- Name: competitor_profiles Users can manage competitors in their org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage competitors in their org" ON public.competitor_profiles USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: geo_action_tasks Users can manage own org action tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own org action tasks" ON public.geo_action_tasks TO authenticated USING (public.is_org_member(auth.uid(), organization_id));


--
-- Name: geo_content_scores Users can manage own org content scores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own org content scores" ON public.geo_content_scores TO authenticated USING (public.is_org_member(auth.uid(), organization_id));


--
-- Name: geo_alert_history Users can manage own org geo_alert_history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own org geo_alert_history" ON public.geo_alert_history TO authenticated USING (public.is_org_member(auth.uid(), organization_id)) WITH CHECK (public.is_org_member(auth.uid(), organization_id));


--
-- Name: geo_prompts Users can manage own org geo_prompts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own org geo_prompts" ON public.geo_prompts TO authenticated USING (public.is_org_member(auth.uid(), organization_id)) WITH CHECK (public.is_org_member(auth.uid(), organization_id));


--
-- Name: geo_scan_jobs Users can manage own org geo_scan_jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own org geo_scan_jobs" ON public.geo_scan_jobs TO authenticated USING (public.is_org_member(auth.uid(), organization_id)) WITH CHECK (public.is_org_member(auth.uid(), organization_id));


--
-- Name: campaign_content_plans Users can manage own org plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own org plans" ON public.campaign_content_plans USING (public.is_org_member(auth.uid(), organization_id)) WITH CHECK (public.is_org_member(auth.uid(), organization_id));


--
-- Name: geo_schema_outputs Users can manage own org schema outputs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own org schema outputs" ON public.geo_schema_outputs TO authenticated USING (public.is_org_member(auth.uid(), organization_id));


--
-- Name: duplicate_ignore_list Users can manage their own ignore list; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own ignore list" ON public.duplicate_ignore_list USING ((ignored_by = auth.uid())) WITH CHECK ((ignored_by = auth.uid()));


--
-- Name: ad_copy_variations Users can manage variations of own ad_copies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage variations of own ad_copies" ON public.ad_copy_variations USING ((ad_copy_id IN ( SELECT ad_copies.id
   FROM public.ad_copies
  WHERE (ad_copies.organization_id IN ( SELECT organization_members.organization_id
           FROM public.organization_members
          WHERE (organization_members.user_id = auth.uid()))))));


--
-- Name: vouchers Users can read active vouchers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read active vouchers" ON public.vouchers FOR SELECT TO authenticated USING ((is_active = true));


--
-- Name: content_feedback Users can read own feedback; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own feedback" ON public.content_feedback FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: ad_copies Users can read own org ad_copies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own org ad_copies" ON public.ad_copies FOR SELECT USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: generation_signals Users can read own signals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own signals" ON public.generation_signals FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: voucher_usages Users can read own voucher usages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own voucher usages" ON public.voucher_usages FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: script_approvals Users can request approval for their scripts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can request approval for their scripts" ON public.script_approvals FOR INSERT WITH CHECK (((requested_by = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.scripts
  WHERE ((scripts.id = script_approvals.script_id) AND (scripts.user_id = auth.uid()))))));


--
-- Name: ad_copy_ab_results Users can update ab results for their org tests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update ab results for their org tests" ON public.ad_copy_ab_results FOR UPDATE USING ((ab_test_id IN ( SELECT ad_copy_ab_tests.id
   FROM public.ad_copy_ab_tests
  WHERE (ad_copy_ab_tests.organization_id IN ( SELECT organization_members.organization_id
           FROM public.organization_members
          WHERE (organization_members.user_id = auth.uid()))))));


--
-- Name: ad_sequences Users can update ad_sequences in their org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update ad_sequences in their org" ON public.ad_sequences FOR UPDATE USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: ad_copy_creative_scores Users can update creative scores in their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update creative scores in their organization" ON public.ad_copy_creative_scores FOR UPDATE USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: planned_content_items Users can update items in their sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update items in their sessions" ON public.planned_content_items FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.planning_sessions ps
  WHERE ((ps.id = planned_content_items.session_id) AND ((ps.user_id = auth.uid()) OR ((ps.organization_id IS NOT NULL) AND public.is_org_admin(auth.uid(), ps.organization_id)))))));


--
-- Name: ad_copy_optimization_suggestions Users can update optimization suggestions in their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update optimization suggestions in their organization" ON public.ad_copy_optimization_suggestions FOR UPDATE USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: ad_copy_ai_insights Users can update org ai insights; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update org ai insights" ON public.ad_copy_ai_insights FOR UPDATE USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: ad_copy_analytics_snapshots Users can update org analytics snapshots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update org analytics snapshots" ON public.ad_copy_analytics_snapshots FOR UPDATE USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: brand_products Users can update org brand_products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update org brand_products" ON public.brand_products FOR UPDATE USING (((organization_id IS NOT NULL) AND public.is_org_member(auth.uid(), organization_id)));


--
-- Name: brand_templates Users can update org brand_templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update org brand_templates" ON public.brand_templates FOR UPDATE USING (((organization_id IS NOT NULL) AND public.is_org_member(auth.uid(), organization_id)));


--
-- Name: brand_voice_variants Users can update org brand_voice_variants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update org brand_voice_variants" ON public.brand_voice_variants FOR UPDATE USING (((organization_id IS NOT NULL) AND public.is_org_member(auth.uid(), organization_id)));


--
-- Name: carousels Users can update org carousels; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update org carousels" ON public.carousels FOR UPDATE USING (((organization_id IS NOT NULL) AND public.is_org_member(auth.uid(), organization_id)));


--
-- Name: content_schedules Users can update org content_schedules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update org content_schedules" ON public.content_schedules FOR UPDATE USING (((organization_id IS NOT NULL) AND public.is_org_member(auth.uid(), organization_id)));


--
-- Name: core_contents Users can update org core contents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update org core contents" ON public.core_contents FOR UPDATE USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: multi_channel_contents Users can update org multi_channel_contents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update org multi_channel_contents" ON public.multi_channel_contents FOR UPDATE USING (((organization_id IS NOT NULL) AND public.is_org_member(auth.uid(), organization_id)));


--
-- Name: publish_attempts Users can update org publish_attempts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update org publish_attempts" ON public.publish_attempts FOR UPDATE USING (((organization_id IS NOT NULL) AND public.is_org_member(auth.uid(), organization_id)));


--
-- Name: user_saved_hooks Users can update org saved hooks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update org saved hooks" ON public.user_saved_hooks FOR UPDATE USING (((organization_id IS NOT NULL) AND public.is_org_member(auth.uid(), organization_id)));


--
-- Name: scripts Users can update org scripts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update org scripts" ON public.scripts FOR UPDATE USING (((organization_id IS NOT NULL) AND public.is_org_member(auth.uid(), organization_id)));


--
-- Name: topic_content_links Users can update org topic_content_links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update org topic_content_links" ON public.topic_content_links FOR UPDATE USING (((organization_id IS NOT NULL) AND public.is_org_member(auth.uid(), organization_id)));


--
-- Name: topic_history Users can update org topic_history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update org topic_history" ON public.topic_history FOR UPDATE USING (((organization_id IS NOT NULL) AND public.is_org_member(auth.uid(), organization_id)));


--
-- Name: trending_topics Users can update org trending_topics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update org trending_topics" ON public.trending_topics FOR UPDATE USING (public.is_org_member(auth.uid(), organization_id));


--
-- Name: brand_products Users can update own brand_products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own brand_products" ON public.brand_products FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: brand_templates Users can update own brand_templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own brand_templates" ON public.brand_templates FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: brand_voice_variants Users can update own brand_voice_variants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own brand_voice_variants" ON public.brand_voice_variants FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: carousels Users can update own carousels; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own carousels" ON public.carousels FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: conversation_embeddings Users can update own conversation embeddings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own conversation embeddings" ON public.conversation_embeddings FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: chat_conversations Users can update own conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own conversations" ON public.chat_conversations FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: content_feedback Users can update own feedback; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own feedback" ON public.content_feedback FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: product_persona_mappings Users can update own mappings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own mappings" ON public.product_persona_mappings FOR UPDATE USING (((user_id = auth.uid()) OR ((organization_id IS NOT NULL) AND public.is_org_member(auth.uid(), organization_id))));


--
-- Name: chat_messages Users can update own messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own messages" ON public.chat_messages FOR UPDATE USING ((auth.uid() = sender_id));


--
-- Name: multi_channel_contents Users can update own multi_channel_contents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own multi_channel_contents" ON public.multi_channel_contents FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: notifications Users can update own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: ad_copies Users can update own org ad_copies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own org ad_copies" ON public.ad_copies FOR UPDATE USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: geo_brand_monitors Users can update own org geo monitors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own org geo monitors" ON public.geo_brand_monitors FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));


--
-- Name: planning_sessions Users can update own planning sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own planning sessions" ON public.planning_sessions FOR UPDATE USING (((user_id = auth.uid()) OR ((organization_id IS NOT NULL) AND public.is_org_admin(auth.uid(), organization_id))));


--
-- Name: user_preferences Users can update own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own preferences" ON public.user_preferences FOR UPDATE USING ((user_id = auth.uid()));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = id));


--
-- Name: user_saved_hooks Users can update own saved hooks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own saved hooks" ON public.user_saved_hooks FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: scripts Users can update own scripts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own scripts" ON public.scripts FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: generation_signals Users can update own signals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own signals" ON public.generation_signals FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: storyboards Users can update own storyboards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own storyboards" ON public.storyboards FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: content_style_patterns Users can update own style patterns; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own style patterns" ON public.content_style_patterns FOR UPDATE USING ((user_id = auth.uid()));


--
-- Name: generation_tasks Users can update own tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own tasks" ON public.generation_tasks FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: topic_content_links Users can update own topic_content_links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own topic_content_links" ON public.topic_content_links FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: topic_history Users can update own topic_history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own topic_history" ON public.topic_history FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: customer_personas Users can update personas in their org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update personas in their org" ON public.customer_personas FOR UPDATE USING (((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))) OR (user_id = auth.uid())));


--
-- Name: ad_copy_prediction_history Users can update prediction history in their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update prediction history in their organization" ON public.ad_copy_prediction_history FOR UPDATE USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: saved_audiences Users can update saved_audiences in their org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update saved_audiences in their org" ON public.saved_audiences FOR UPDATE USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: ad_sequence_stage_copies Users can update stage_copies via stage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update stage_copies via stage" ON public.ad_sequence_stage_copies FOR UPDATE USING ((stage_id IN ( SELECT s.id
   FROM (public.ad_sequence_stages s
     JOIN public.ad_sequences seq ON ((s.sequence_id = seq.id)))
  WHERE (seq.organization_id IN ( SELECT organization_members.organization_id
           FROM public.organization_members
          WHERE (organization_members.user_id = auth.uid()))))));


--
-- Name: ad_sequence_stages Users can update stages via sequence; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update stages via sequence" ON public.ad_sequence_stages FOR UPDATE USING ((sequence_id IN ( SELECT ad_sequences.id
   FROM public.ad_sequences
  WHERE (ad_sequences.organization_id IN ( SELECT organization_members.organization_id
           FROM public.organization_members
          WHERE (organization_members.user_id = auth.uid()))))));


--
-- Name: ad_swipe_files Users can update swipe files in their org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update swipe files in their org" ON public.ad_swipe_files FOR UPDATE USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: ad_copy_ab_tests Users can update their org ab tests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their org ab tests" ON public.ad_copy_ab_tests FOR UPDATE USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: channel_image_history Users can update their org's image history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their org's image history" ON public.channel_image_history FOR UPDATE USING (public.is_org_member(auth.uid(), organization_id));


--
-- Name: ad_sync_configs Users can update their org's sync configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their org's sync configs" ON public.ad_sync_configs FOR UPDATE USING (public.is_org_member(auth.uid(), organization_id));


--
-- Name: carousel_images Users can update their own carousel images; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own carousel images" ON public.carousel_images FOR UPDATE TO authenticated USING ((created_by = auth.uid()));


--
-- Name: pinterest_boards Users can update their own pinterest boards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own pinterest boards" ON public.pinterest_boards FOR UPDATE USING ((connection_id IN ( SELECT social_connections.id
   FROM public.social_connections
  WHERE (social_connections.user_id = auth.uid()))));


--
-- Name: video_generations Users can update their own video generations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own video generations" ON public.video_generations FOR UPDATE USING ((user_id = auth.uid()));


--
-- Name: ai_prompt_ab_tests Users can view AB tests for their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view AB tests for their organization" ON public.ai_prompt_ab_tests FOR SELECT USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: ad_copy_ab_results Users can view ab results for their org tests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view ab results for their org tests" ON public.ad_copy_ab_results FOR SELECT USING ((ab_test_id IN ( SELECT ad_copy_ab_tests.id
   FROM public.ad_copy_ab_tests
  WHERE (ad_copy_ab_tests.organization_id IN ( SELECT organization_members.organization_id
           FROM public.organization_members
          WHERE (organization_members.user_id = auth.uid()))))));


--
-- Name: ad_sequences Users can view ad_sequences in their org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view ad_sequences in their org" ON public.ad_sequences FOR SELECT USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: script_approvals Users can view approvals for their scripts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view approvals for their scripts" ON public.script_approvals FOR SELECT USING (((requested_by = auth.uid()) OR (reviewer_id = auth.uid()) OR public.is_org_member(auth.uid(), organization_id)));


--
-- Name: brand_channel_optimizations Users can view brand channel optimizations in their org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view brand channel optimizations in their org" ON public.brand_channel_optimizations FOR SELECT USING ((brand_template_id IN ( SELECT bt.id
   FROM (public.brand_templates bt
     JOIN public.organization_members om ON ((bt.organization_id = om.organization_id)))
  WHERE (om.user_id = auth.uid()))));


--
-- Name: brand_preferences_learned Users can view brand preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view brand preferences" ON public.brand_preferences_learned FOR SELECT USING ((brand_template_id IN ( SELECT brand_templates.id
   FROM public.brand_templates
  WHERE (brand_templates.organization_id IN ( SELECT organization_members.organization_id
           FROM public.organization_members
          WHERE (organization_members.user_id = auth.uid()))))));


--
-- Name: competitor_profiles Users can view competitors in their org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view competitors in their org" ON public.competitor_profiles FOR SELECT USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: ad_copy_creative_scores Users can view creative scores in their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view creative scores in their organization" ON public.ad_copy_creative_scores FOR SELECT USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: kpi_adjustment_dismissals Users can view dismissals for their organization campaigns; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view dismissals for their organization campaigns" ON public.kpi_adjustment_dismissals FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.campaigns c
     JOIN public.organization_members om ON ((om.organization_id = c.organization_id)))
  WHERE ((c.id = kpi_adjustment_dismissals.campaign_id) AND (om.user_id = auth.uid())))));


--
-- Name: planned_content_items Users can view items in their sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view items in their sessions" ON public.planned_content_items FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.planning_sessions ps
  WHERE ((ps.id = planned_content_items.session_id) AND ((ps.user_id = auth.uid()) OR ((ps.organization_id IS NOT NULL) AND public.is_org_member(auth.uid(), ps.organization_id)))))));


--
-- Name: organization_members Users can view members of their organizations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view members of their organizations" ON public.organization_members FOR SELECT USING (public.is_org_member(auth.uid(), organization_id));


--
-- Name: chat_conversation_messages Users can view messages of own conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view messages of own conversations" ON public.chat_conversation_messages FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.chat_conversations c
  WHERE ((c.id = chat_conversation_messages.conversation_id) AND (c.user_id = auth.uid())))));


--
-- Name: ad_copy_optimization_suggestions Users can view optimization suggestions in their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view optimization suggestions in their organization" ON public.ad_copy_optimization_suggestions FOR SELECT USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: ad_copy_ai_insights Users can view org ai insights; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view org ai insights" ON public.ad_copy_ai_insights FOR SELECT USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: ad_copy_analytics_snapshots Users can view org analytics snapshots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view org analytics snapshots" ON public.ad_copy_analytics_snapshots FOR SELECT USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: approval_logs Users can view org approval_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view org approval_logs" ON public.approval_logs FOR SELECT USING (public.is_org_member(auth.uid(), organization_id));


--
-- Name: brand_products Users can view org brand_products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view org brand_products" ON public.brand_products FOR SELECT USING (((organization_id IS NOT NULL) AND public.is_org_member(auth.uid(), organization_id)));


--
-- Name: brand_templates Users can view org brand_templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view org brand_templates" ON public.brand_templates FOR SELECT USING (((organization_id IS NOT NULL) AND public.is_org_member(auth.uid(), organization_id) AND (deleted_at IS NULL)));


--
-- Name: brand_voice_variants Users can view org brand_voice_variants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view org brand_voice_variants" ON public.brand_voice_variants FOR SELECT USING (((organization_id IS NOT NULL) AND public.is_org_member(auth.uid(), organization_id)));


--
-- Name: carousels Users can view org carousels; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view org carousels" ON public.carousels FOR SELECT USING (((organization_id IS NOT NULL) AND public.is_org_member(auth.uid(), organization_id)));


--
-- Name: ai_channel_model_configs Users can view org channel model configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view org channel model configs" ON public.ai_channel_model_configs FOR SELECT USING (public.is_org_member(auth.uid(), organization_id));


--
-- Name: content_assignments Users can view org content_assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view org content_assignments" ON public.content_assignments FOR SELECT USING (public.is_org_member(auth.uid(), organization_id));


--
-- Name: content_publishing_logs Users can view org content_publishing_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view org content_publishing_logs" ON public.content_publishing_logs FOR SELECT USING (((organization_id IS NOT NULL) AND public.is_org_member(auth.uid(), organization_id)));


--
-- Name: content_schedules Users can view org content_schedules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view org content_schedules" ON public.content_schedules FOR SELECT USING (((organization_id IS NOT NULL) AND public.is_org_member(auth.uid(), organization_id)));


--
-- Name: core_contents Users can view org core contents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view org core contents" ON public.core_contents FOR SELECT USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: content_embeddings Users can view org embeddings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view org embeddings" ON public.content_embeddings FOR SELECT USING (((organization_id IS NOT NULL) AND public.is_org_member(auth.uid(), organization_id)));


--
-- Name: publish_attempts Users can view org publish_attempts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view org publish_attempts" ON public.publish_attempts FOR SELECT USING (((organization_id IS NOT NULL) AND public.is_org_member(auth.uid(), organization_id)));


--
-- Name: user_saved_hooks Users can view org saved hooks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view org saved hooks" ON public.user_saved_hooks FOR SELECT USING (((organization_id IS NOT NULL) AND public.is_org_member(auth.uid(), organization_id)));


--
-- Name: scripts Users can view org scripts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view org scripts" ON public.scripts FOR SELECT USING (((organization_id IS NOT NULL) AND public.is_org_member(auth.uid(), organization_id)));


--
-- Name: topic_content_links Users can view org topic_content_links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view org topic_content_links" ON public.topic_content_links FOR SELECT USING (((organization_id IS NOT NULL) AND public.is_org_member(auth.uid(), organization_id)));


--
-- Name: topic_history Users can view org topic_history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view org topic_history" ON public.topic_history FOR SELECT USING (((organization_id IS NOT NULL) AND public.is_org_member(auth.uid(), organization_id)));


--
-- Name: trending_topics Users can view org trending_topics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view org trending_topics" ON public.trending_topics FOR SELECT USING (public.is_org_member(auth.uid(), organization_id));


--
-- Name: organizations Users can view organizations they belong to; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view organizations they belong to" ON public.organizations FOR SELECT USING (public.is_org_member(auth.uid(), id));


--
-- Name: insight_analytics Users can view own analytics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own analytics" ON public.insight_analytics FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: telegram_chat_bindings Users can view own bindings or admins view all org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own bindings or admins view all org" ON public.telegram_chat_bindings FOR SELECT USING (((auth.uid() = user_id) OR public.is_org_admin(auth.uid(), organization_id)));


--
-- Name: brand_products Users can view own brand_products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own brand_products" ON public.brand_products FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: brand_templates Users can view own brand_templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own brand_templates" ON public.brand_templates FOR SELECT USING (((auth.uid() = user_id) AND (deleted_at IS NULL)));


--
-- Name: brand_voice_variants Users can view own brand_voice_variants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own brand_voice_variants" ON public.brand_voice_variants FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: carousels Users can view own carousels; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own carousels" ON public.carousels FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: conversation_embeddings Users can view own conversation embeddings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own conversation embeddings" ON public.conversation_embeddings FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: chat_conversations Users can view own conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own conversations" ON public.chat_conversations FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: chat_feedback Users can view own feedback; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own feedback" ON public.chat_feedback FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: product_persona_mappings Users can view own mappings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own mappings" ON public.product_persona_mappings FOR SELECT USING (((user_id = auth.uid()) OR ((organization_id IS NOT NULL) AND public.is_org_member(auth.uid(), organization_id))));


--
-- Name: notifications Users can view own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: geo_action_tasks Users can view own org action tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own org action tasks" ON public.geo_action_tasks FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));


--
-- Name: geo_content_scores Users can view own org content scores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own org content scores" ON public.geo_content_scores FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));


--
-- Name: ai_function_configs Users can view own org function configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own org function configs" ON public.ai_function_configs FOR SELECT USING (public.is_org_member(auth.uid(), organization_id));


--
-- Name: geo_brand_monitors Users can view own org geo monitors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own org geo monitors" ON public.geo_brand_monitors FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));


--
-- Name: geo_visibility_snapshots Users can view own org geo_visibility_snapshots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own org geo_visibility_snapshots" ON public.geo_visibility_snapshots TO authenticated USING (public.is_org_member(auth.uid(), organization_id)) WITH CHECK (public.is_org_member(auth.uid(), organization_id));


--
-- Name: geo_monitoring_results Users can view own org monitoring results; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own org monitoring results" ON public.geo_monitoring_results FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));


--
-- Name: geo_schema_outputs Users can view own org schema outputs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own org schema outputs" ON public.geo_schema_outputs FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));


--
-- Name: planning_sessions Users can view own planning sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own planning sessions" ON public.planning_sessions FOR SELECT USING (((user_id = auth.uid()) OR ((organization_id IS NOT NULL) AND public.is_org_member(auth.uid(), organization_id))));


--
-- Name: user_preferences Users can view own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own preferences" ON public.user_preferences FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: profiles Users can view own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING ((auth.uid() = id));


--
-- Name: user_roles Users can view own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_saved_hooks Users can view own saved hooks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own saved hooks" ON public.user_saved_hooks FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: scripts Users can view own scripts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own scripts" ON public.scripts FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: storyboards Users can view own storyboards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own storyboards" ON public.storyboards FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: content_style_patterns Users can view own style patterns; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own style patterns" ON public.content_style_patterns FOR SELECT USING (((user_id = auth.uid()) OR ((organization_id IS NOT NULL) AND public.is_org_member(auth.uid(), organization_id))));


--
-- Name: generation_tasks Users can view own tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own tasks" ON public.generation_tasks FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: topic_content_links Users can view own topic_content_links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own topic_content_links" ON public.topic_content_links FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: topic_history Users can view own topic_history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own topic_history" ON public.topic_history FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: usage_logs Users can view own usage_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own usage_logs" ON public.usage_logs FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: customer_personas Users can view personas in their org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view personas in their org" ON public.customer_personas FOR SELECT USING (((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))) OR (user_id = auth.uid())));


--
-- Name: ad_copy_prediction_history Users can view prediction history in their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view prediction history in their organization" ON public.ad_copy_prediction_history FOR SELECT USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: ai_prompt_history Users can view prompt history for their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view prompt history for their organization" ON public.ai_prompt_history FOR SELECT USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: ai_prompts Users can view prompts for their organization or global default; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view prompts for their organization or global default" ON public.ai_prompts FOR SELECT USING (((organization_id IS NULL) OR (organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid())))));


--
-- Name: saved_audiences Users can view saved_audiences in their org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view saved_audiences in their org" ON public.saved_audiences FOR SELECT USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: ad_sequence_stage_copies Users can view stage_copies via stage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view stage_copies via stage" ON public.ad_sequence_stage_copies FOR SELECT USING ((stage_id IN ( SELECT s.id
   FROM (public.ad_sequence_stages s
     JOIN public.ad_sequences seq ON ((s.sequence_id = seq.id)))
  WHERE (seq.organization_id IN ( SELECT organization_members.organization_id
           FROM public.organization_members
          WHERE (organization_members.user_id = auth.uid()))))));


--
-- Name: ad_sequence_stages Users can view stages via sequence; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view stages via sequence" ON public.ad_sequence_stages FOR SELECT USING ((sequence_id IN ( SELECT ad_sequences.id
   FROM public.ad_sequences
  WHERE (ad_sequences.organization_id IN ( SELECT organization_members.organization_id
           FROM public.organization_members
          WHERE (organization_members.user_id = auth.uid()))))));


--
-- Name: ad_swipe_files Users can view swipe files in their org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view swipe files in their org" ON public.ad_swipe_files FOR SELECT USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: ad_copy_ab_tests Users can view their org ab tests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their org ab tests" ON public.ad_copy_ab_tests FOR SELECT USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: channel_image_history Users can view their org's image history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their org's image history" ON public.channel_image_history FOR SELECT USING (public.is_org_member(auth.uid(), organization_id));


--
-- Name: content_learnings Users can view their org's learnings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their org's learnings" ON public.content_learnings FOR SELECT USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: ad_sync_configs Users can view their org's sync configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their org's sync configs" ON public.ad_sync_configs FOR SELECT USING (public.is_org_member(auth.uid(), organization_id));


--
-- Name: prompt_analytics Users can view their organization's prompt analytics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their organization's prompt analytics" ON public.prompt_analytics FOR SELECT USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: carousel_images Users can view their own carousel images; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own carousel images" ON public.carousel_images FOR SELECT TO authenticated USING (((created_by = auth.uid()) OR public.is_org_member(auth.uid(), organization_id)));


--
-- Name: oauth_pending_states Users can view their own oauth pending states; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own oauth pending states" ON public.oauth_pending_states FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: pinterest_boards Users can view their own pinterest boards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own pinterest boards" ON public.pinterest_boards FOR SELECT USING (((connection_id IN ( SELECT social_connections.id
   FROM public.social_connections
  WHERE (social_connections.user_id = auth.uid()))) OR (organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid())))));


--
-- Name: video_generations Users can view their own video generations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own video generations" ON public.video_generations FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: script_versions Users can view versions of their own scripts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view versions of their own scripts" ON public.script_versions FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.scripts
  WHERE ((scripts.id = script_versions.script_id) AND (scripts.user_id = auth.uid())))));


--
-- Name: audio_assets Users create audio; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users create audio" ON public.audio_assets FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: video_render_jobs Users create render jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users create render jobs" ON public.video_render_jobs FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: audio_assets Users delete own audio; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users delete own audio" ON public.audio_assets FOR DELETE USING ((user_id = auth.uid()));


--
-- Name: video_render_jobs Users delete own render jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users delete own render jobs" ON public.video_render_jobs FOR DELETE USING ((user_id = auth.uid()));


--
-- Name: telegram_user_preferences Users delete own tg prefs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users delete own tg prefs" ON public.telegram_user_preferences FOR DELETE USING ((user_id = auth.uid()));


--
-- Name: telegram_user_preferences Users insert own tg prefs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users insert own tg prefs" ON public.telegram_user_preferences FOR INSERT WITH CHECK (((user_id = auth.uid()) AND public.is_org_member(auth.uid(), organization_id)));


--
-- Name: facebook_oauth_sessions Users manage own facebook oauth sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users manage own facebook oauth sessions" ON public.facebook_oauth_sessions TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: telegram_user_preferences Users read own tg prefs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users read own tg prefs" ON public.telegram_user_preferences FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: audio_assets Users update own audio; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users update own audio" ON public.audio_assets FOR UPDATE USING ((user_id = auth.uid()));


--
-- Name: telegram_chat_bindings Users update own bindings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users update own bindings" ON public.telegram_chat_bindings FOR UPDATE USING (((auth.uid() = user_id) OR public.is_org_admin(auth.uid(), organization_id))) WITH CHECK (((auth.uid() = user_id) OR public.is_org_admin(auth.uid(), organization_id)));


--
-- Name: video_render_jobs Users update own render jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users update own render jobs" ON public.video_render_jobs FOR UPDATE USING ((user_id = auth.uid()));


--
-- Name: telegram_user_preferences Users update own tg prefs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users update own tg prefs" ON public.telegram_user_preferences FOR UPDATE USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: audio_assets Users view own audio; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users view own audio" ON public.audio_assets FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: video_render_jobs Users view own render jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users view own render jobs" ON public.video_render_jobs FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: sales_chat_analytics Validated anonymous insert analytics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Validated anonymous insert analytics" ON public.sales_chat_analytics FOR INSERT WITH CHECK ((session_id IS NOT NULL));


--
-- Name: sales_chat_messages_log Validated anonymous insert on sales_chat_messages_log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Validated anonymous insert on sales_chat_messages_log" ON public.sales_chat_messages_log FOR INSERT WITH CHECK (((session_id IS NOT NULL) AND (length(session_id) > 0) AND (length(content) < 5000)));


--
-- Name: sales_chat_analytics Validated anonymous update analytics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Validated anonymous update analytics" ON public.sales_chat_analytics FOR UPDATE USING ((session_id IS NOT NULL)) WITH CHECK ((session_id IS NOT NULL));


--
-- Name: blog_comments Validated insert comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Validated insert comments" ON public.blog_comments FOR INSERT WITH CHECK (((post_slug IS NOT NULL) AND (content IS NOT NULL) AND (author_name IS NOT NULL) AND (length(content) <= 2000) AND (length(author_name) <= 100)));


--
-- Name: sales_chat_leads Validated insert leads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Validated insert leads" ON public.sales_chat_leads FOR INSERT TO authenticated, anon WITH CHECK (((session_id IS NOT NULL) AND (email IS NOT NULL)));


--
-- Name: blog_reactions Validated insert reactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Validated insert reactions" ON public.blog_reactions FOR INSERT WITH CHECK (((post_slug IS NOT NULL) AND (reaction_type IS NOT NULL)));


--
-- Name: sales_chat_leads Validated update own leads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Validated update own leads" ON public.sales_chat_leads FOR UPDATE TO authenticated, anon USING ((session_id IS NOT NULL)) WITH CHECK ((session_id IS NOT NULL));


--
-- Name: ad_copies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ad_copies ENABLE ROW LEVEL SECURITY;

--
-- Name: ad_copy_ab_results; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ad_copy_ab_results ENABLE ROW LEVEL SECURITY;

--
-- Name: ad_copy_ab_tests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ad_copy_ab_tests ENABLE ROW LEVEL SECURITY;

--
-- Name: ad_copy_ai_insights; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ad_copy_ai_insights ENABLE ROW LEVEL SECURITY;

--
-- Name: ad_copy_analytics_snapshots; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ad_copy_analytics_snapshots ENABLE ROW LEVEL SECURITY;

--
-- Name: ad_copy_benchmarks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ad_copy_benchmarks ENABLE ROW LEVEL SECURITY;

--
-- Name: ad_copy_creative_scores; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ad_copy_creative_scores ENABLE ROW LEVEL SECURITY;

--
-- Name: ad_copy_optimization_suggestions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ad_copy_optimization_suggestions ENABLE ROW LEVEL SECURITY;

--
-- Name: ad_copy_performance; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ad_copy_performance ENABLE ROW LEVEL SECURITY;

--
-- Name: ad_copy_prediction_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ad_copy_prediction_history ENABLE ROW LEVEL SECURITY;

--
-- Name: ad_copy_variations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ad_copy_variations ENABLE ROW LEVEL SECURITY;

--
-- Name: ad_sequence_stage_copies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ad_sequence_stage_copies ENABLE ROW LEVEL SECURITY;

--
-- Name: ad_sequence_stages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ad_sequence_stages ENABLE ROW LEVEL SECURITY;

--
-- Name: ad_sequences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ad_sequences ENABLE ROW LEVEL SECURITY;

--
-- Name: ad_swipe_files; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ad_swipe_files ENABLE ROW LEVEL SECURITY;

--
-- Name: ad_sync_configs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ad_sync_configs ENABLE ROW LEVEL SECURITY;

--
-- Name: addon_purchases; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.addon_purchases ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: agent_approvals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agent_approvals ENABLE ROW LEVEL SECURITY;

--
-- Name: agent_blackboard; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agent_blackboard ENABLE ROW LEVEL SECURITY;

--
-- Name: agent_execution_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agent_execution_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: agent_goals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agent_goals ENABLE ROW LEVEL SECURITY;

--
-- Name: agent_pipeline_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agent_pipeline_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: agent_pipelines; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agent_pipelines ENABLE ROW LEVEL SECURITY;

--
-- Name: agent_team_permissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agent_team_permissions ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_agent_model_configs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_agent_model_configs ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_channel_model_configs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_channel_model_configs ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_function_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_function_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_function_configs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_function_configs ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_function_group_configs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_function_group_configs ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_metrics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_metrics ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_prompt_ab_tests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_prompt_ab_tests ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_prompt_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_prompt_history ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_prompts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_prompts ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_provider_configs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_provider_configs ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_response_cache; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_response_cache ENABLE ROW LEVEL SECURITY;

--
-- Name: approval_assignments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.approval_assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: approval_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.approval_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: audio_assets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audio_assets ENABLE ROW LEVEL SECURITY;

--
-- Name: batch_processing_jobs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.batch_processing_jobs ENABLE ROW LEVEL SECURITY;

--
-- Name: blog_comments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.blog_comments ENABLE ROW LEVEL SECURITY;

--
-- Name: blog_posts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

--
-- Name: blog_reactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.blog_reactions ENABLE ROW LEVEL SECURITY;

--
-- Name: brand_channel_optimizations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.brand_channel_optimizations ENABLE ROW LEVEL SECURITY;

--
-- Name: brand_memory; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.brand_memory ENABLE ROW LEVEL SECURITY;

--
-- Name: brand_preferences_learned; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.brand_preferences_learned ENABLE ROW LEVEL SECURITY;

--
-- Name: brand_products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.brand_products ENABLE ROW LEVEL SECURITY;

--
-- Name: brand_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.brand_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: brand_voice_variants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.brand_voice_variants ENABLE ROW LEVEL SECURITY;

--
-- Name: calendar_notes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.calendar_notes ENABLE ROW LEVEL SECURITY;

--
-- Name: campaign_content_plans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.campaign_content_plans ENABLE ROW LEVEL SECURITY;

--
-- Name: campaign_contents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.campaign_contents ENABLE ROW LEVEL SECURITY;

--
-- Name: campaign_contents campaign_contents_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY campaign_contents_delete ON public.campaign_contents FOR DELETE USING ((campaign_id IN ( SELECT campaigns.id
   FROM public.campaigns
  WHERE (campaigns.organization_id IN ( SELECT organization_members.organization_id
           FROM public.organization_members
          WHERE (organization_members.user_id = auth.uid()))))));


--
-- Name: campaign_contents campaign_contents_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY campaign_contents_insert ON public.campaign_contents FOR INSERT WITH CHECK ((campaign_id IN ( SELECT campaigns.id
   FROM public.campaigns
  WHERE (campaigns.organization_id IN ( SELECT organization_members.organization_id
           FROM public.organization_members
          WHERE (organization_members.user_id = auth.uid()))))));


--
-- Name: campaign_contents campaign_contents_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY campaign_contents_select ON public.campaign_contents FOR SELECT USING ((campaign_id IN ( SELECT campaigns.id
   FROM public.campaigns
  WHERE (campaigns.organization_id IN ( SELECT organization_members.organization_id
           FROM public.organization_members
          WHERE (organization_members.user_id = auth.uid()))))));


--
-- Name: campaign_contents campaign_contents_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY campaign_contents_update ON public.campaign_contents FOR UPDATE USING ((campaign_id IN ( SELECT campaigns.id
   FROM public.campaigns
  WHERE (campaigns.organization_id IN ( SELECT organization_members.organization_id
           FROM public.organization_members
          WHERE (organization_members.user_id = auth.uid()))))));


--
-- Name: campaign_kpi_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.campaign_kpi_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: campaign_kpi_logs campaign_kpi_logs_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY campaign_kpi_logs_delete ON public.campaign_kpi_logs FOR DELETE USING ((campaign_id IN ( SELECT campaigns.id
   FROM public.campaigns
  WHERE (campaigns.organization_id IN ( SELECT organization_members.organization_id
           FROM public.organization_members
          WHERE (organization_members.user_id = auth.uid()))))));


--
-- Name: campaign_kpi_logs campaign_kpi_logs_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY campaign_kpi_logs_insert ON public.campaign_kpi_logs FOR INSERT WITH CHECK ((campaign_id IN ( SELECT campaigns.id
   FROM public.campaigns
  WHERE (campaigns.organization_id IN ( SELECT organization_members.organization_id
           FROM public.organization_members
          WHERE (organization_members.user_id = auth.uid()))))));


--
-- Name: campaign_kpi_logs campaign_kpi_logs_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY campaign_kpi_logs_select ON public.campaign_kpi_logs FOR SELECT USING ((campaign_id IN ( SELECT campaigns.id
   FROM public.campaigns
  WHERE (campaigns.organization_id IN ( SELECT organization_members.organization_id
           FROM public.organization_members
          WHERE (organization_members.user_id = auth.uid()))))));


--
-- Name: campaign_kpi_logs campaign_kpi_logs_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY campaign_kpi_logs_update ON public.campaign_kpi_logs FOR UPDATE USING ((campaign_id IN ( SELECT campaigns.id
   FROM public.campaigns
  WHERE (campaigns.organization_id IN ( SELECT organization_members.organization_id
           FROM public.organization_members
          WHERE (organization_members.user_id = auth.uid()))))));


--
-- Name: campaign_milestones; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.campaign_milestones ENABLE ROW LEVEL SECURITY;

--
-- Name: campaign_milestones campaign_milestones_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY campaign_milestones_delete ON public.campaign_milestones FOR DELETE USING ((campaign_id IN ( SELECT campaigns.id
   FROM public.campaigns
  WHERE (campaigns.organization_id IN ( SELECT organization_members.organization_id
           FROM public.organization_members
          WHERE (organization_members.user_id = auth.uid()))))));


--
-- Name: campaign_milestones campaign_milestones_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY campaign_milestones_insert ON public.campaign_milestones FOR INSERT WITH CHECK ((campaign_id IN ( SELECT campaigns.id
   FROM public.campaigns
  WHERE (campaigns.organization_id IN ( SELECT organization_members.organization_id
           FROM public.organization_members
          WHERE (organization_members.user_id = auth.uid()))))));


--
-- Name: campaign_milestones campaign_milestones_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY campaign_milestones_select ON public.campaign_milestones FOR SELECT USING ((campaign_id IN ( SELECT campaigns.id
   FROM public.campaigns
  WHERE (campaigns.organization_id IN ( SELECT organization_members.organization_id
           FROM public.organization_members
          WHERE (organization_members.user_id = auth.uid()))))));


--
-- Name: campaign_milestones campaign_milestones_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY campaign_milestones_update ON public.campaign_milestones FOR UPDATE USING ((campaign_id IN ( SELECT campaigns.id
   FROM public.campaigns
  WHERE (campaigns.organization_id IN ( SELECT organization_members.organization_id
           FROM public.organization_members
          WHERE (organization_members.user_id = auth.uid()))))));


--
-- Name: campaign_notification_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.campaign_notification_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: campaigns; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

--
-- Name: campaigns campaigns_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY campaigns_delete ON public.campaigns FOR DELETE USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: campaigns campaigns_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY campaigns_insert ON public.campaigns FOR INSERT WITH CHECK ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: campaigns campaigns_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY campaigns_select ON public.campaigns FOR SELECT USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: campaigns campaigns_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY campaigns_update ON public.campaigns FOR UPDATE USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: carousel_images; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.carousel_images ENABLE ROW LEVEL SECURITY;

--
-- Name: carousel_style_presets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.carousel_style_presets ENABLE ROW LEVEL SECURITY;

--
-- Name: carousels; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.carousels ENABLE ROW LEVEL SECURITY;

--
-- Name: channel_image_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.channel_image_history ENABLE ROW LEVEL SECURITY;

--
-- Name: character_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.character_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_conversation_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_conversation_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_conversations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_feedback; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_feedback ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: circuit_breaker_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.circuit_breaker_events ENABLE ROW LEVEL SECURITY;

--
-- Name: competitor_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.competitor_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: content_assignments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.content_assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: content_embeddings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.content_embeddings ENABLE ROW LEVEL SECURITY;

--
-- Name: content_feedback; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.content_feedback ENABLE ROW LEVEL SECURITY;

--
-- Name: content_learnings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.content_learnings ENABLE ROW LEVEL SECURITY;

--
-- Name: content_publishing_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.content_publishing_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: content_schedules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.content_schedules ENABLE ROW LEVEL SECURITY;

--
-- Name: content_style_patterns; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.content_style_patterns ENABLE ROW LEVEL SECURITY;

--
-- Name: conversation_embeddings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.conversation_embeddings ENABLE ROW LEVEL SECURITY;

--
-- Name: core_contents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.core_contents ENABLE ROW LEVEL SECURITY;

--
-- Name: countries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;

--
-- Name: cron_run_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cron_run_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: curated_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.curated_events ENABLE ROW LEVEL SECURITY;

--
-- Name: curated_news; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.curated_news ENABLE ROW LEVEL SECURITY;

--
-- Name: customer_personas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customer_personas ENABLE ROW LEVEL SECURITY;

--
-- Name: duplicate_ignore_list; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.duplicate_ignore_list ENABLE ROW LEVEL SECURITY;

--
-- Name: edge_function_daily_stats; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.edge_function_daily_stats ENABLE ROW LEVEL SECURITY;

--
-- Name: edge_function_metrics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.edge_function_metrics ENABLE ROW LEVEL SECURITY;

--
-- Name: external_link_sources; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.external_link_sources ENABLE ROW LEVEL SECURITY;

--
-- Name: facebook_oauth_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.facebook_oauth_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: firecrawl_serp_cache; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.firecrawl_serp_cache ENABLE ROW LEVEL SECURITY;

--
-- Name: generation_signals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.generation_signals ENABLE ROW LEVEL SECURITY;

--
-- Name: generation_tasks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.generation_tasks ENABLE ROW LEVEL SECURITY;

--
-- Name: geo_action_tasks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.geo_action_tasks ENABLE ROW LEVEL SECURITY;

--
-- Name: geo_alert_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.geo_alert_history ENABLE ROW LEVEL SECURITY;

--
-- Name: geo_brand_monitors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.geo_brand_monitors ENABLE ROW LEVEL SECURITY;

--
-- Name: geo_content_scores; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.geo_content_scores ENABLE ROW LEVEL SECURITY;

--
-- Name: geo_monitoring_results; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.geo_monitoring_results ENABLE ROW LEVEL SECURITY;

--
-- Name: geo_prompts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.geo_prompts ENABLE ROW LEVEL SECURITY;

--
-- Name: geo_scan_jobs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.geo_scan_jobs ENABLE ROW LEVEL SECURITY;

--
-- Name: geo_schema_outputs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.geo_schema_outputs ENABLE ROW LEVEL SECURITY;

--
-- Name: geo_visibility_snapshots; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.geo_visibility_snapshots ENABLE ROW LEVEL SECURITY;

--
-- Name: gsc_connections; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.gsc_connections ENABLE ROW LEVEL SECURITY;

--
-- Name: gsc_metrics_daily; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.gsc_metrics_daily ENABLE ROW LEVEL SECURITY;

--
-- Name: gsc_sync_runs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.gsc_sync_runs ENABLE ROW LEVEL SECURITY;

--
-- Name: help_articles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.help_articles ENABLE ROW LEVEL SECURITY;

--
-- Name: hook_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.hook_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: industry_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.industry_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: industry_category_translations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.industry_category_translations ENABLE ROW LEVEL SECURITY;

--
-- Name: industry_global_packs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.industry_global_packs ENABLE ROW LEVEL SECURITY;

--
-- Name: industry_glossary; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.industry_glossary ENABLE ROW LEVEL SECURITY;

--
-- Name: industry_glossary_translations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.industry_glossary_translations ENABLE ROW LEVEL SECURITY;

--
-- Name: industry_jurisdiction_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.industry_jurisdiction_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: industry_knowledge_edges; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.industry_knowledge_edges ENABLE ROW LEVEL SECURITY;

--
-- Name: industry_knowledge_nodes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.industry_knowledge_nodes ENABLE ROW LEVEL SECURITY;

--
-- Name: industry_memory_versions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.industry_memory_versions ENABLE ROW LEVEL SECURITY;

--
-- Name: industry_pack_translations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.industry_pack_translations ENABLE ROW LEVEL SECURITY;

--
-- Name: industry_persona_translations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.industry_persona_translations ENABLE ROW LEVEL SECURITY;

--
-- Name: industry_persona_translations_v2; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.industry_persona_translations_v2 ENABLE ROW LEVEL SECURITY;

--
-- Name: industry_personas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.industry_personas ENABLE ROW LEVEL SECURITY;

--
-- Name: industry_personas_v2; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.industry_personas_v2 ENABLE ROW LEVEL SECURITY;

--
-- Name: industry_search_aliases; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.industry_search_aliases ENABLE ROW LEVEL SECURITY;

--
-- Name: industry_template_translations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.industry_template_translations ENABLE ROW LEVEL SECURITY;

--
-- Name: industry_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.industry_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: insight_analytics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.insight_analytics ENABLE ROW LEVEL SECURITY;

--
-- Name: internal_links; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.internal_links ENABLE ROW LEVEL SECURITY;

--
-- Name: journey_stage_messaging; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.journey_stage_messaging ENABLE ROW LEVEL SECURITY;

--
-- Name: keyword_enrichment_jobs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.keyword_enrichment_jobs ENABLE ROW LEVEL SECURITY;

--
-- Name: keyword_research_jobs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.keyword_research_jobs ENABLE ROW LEVEL SECURITY;

--
-- Name: knowledge_graph_analytics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.knowledge_graph_analytics ENABLE ROW LEVEL SECURITY;

--
-- Name: knowledge_graph_cache; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.knowledge_graph_cache ENABLE ROW LEVEL SECURITY;

--
-- Name: kpi_adjustment_dismissals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.kpi_adjustment_dismissals ENABLE ROW LEVEL SECURITY;

--
-- Name: marketing_calendar; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.marketing_calendar ENABLE ROW LEVEL SECURITY;

--
-- Name: multi_channel_contents mcc_select_unified; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mcc_select_unified ON public.multi_channel_contents FOR SELECT TO authenticated USING (((user_id = ( SELECT auth.uid() AS uid)) OR ((organization_id IS NOT NULL) AND public.is_org_member(( SELECT auth.uid() AS uid), organization_id)) OR public.has_role(( SELECT auth.uid() AS uid), 'admin'::public.app_role)));


--
-- Name: multi_channel_contents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.multi_channel_contents ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: oauth_pending_states; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.oauth_pending_states ENABLE ROW LEVEL SECURITY;

--
-- Name: orchestrator_daily_stats; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.orchestrator_daily_stats ENABLE ROW LEVEL SECURITY;

--
-- Name: external_link_sources org members delete els; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "org members delete els" ON public.external_link_sources FOR DELETE USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: external_link_sources org members insert els; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "org members insert els" ON public.external_link_sources FOR INSERT WITH CHECK ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: external_link_sources org members select els; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "org members select els" ON public.external_link_sources FOR SELECT USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: external_link_sources org members update els; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "org members update els" ON public.external_link_sources FOR UPDATE USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: gsc_connections org_admins_manage_gsc_conn; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY org_admins_manage_gsc_conn ON public.gsc_connections USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE ((organization_members.user_id = auth.uid()) AND (organization_members.role = ANY (ARRAY['owner'::public.org_role, 'admin'::public.org_role]))))));


--
-- Name: ad_copy_performance org_member_delete_ad_perf; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY org_member_delete_ad_perf ON public.ad_copy_performance FOR DELETE TO authenticated USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: ad_copy_performance org_member_insert_ad_perf; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY org_member_insert_ad_perf ON public.ad_copy_performance FOR INSERT TO authenticated WITH CHECK ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: ad_copy_performance org_member_select_ad_perf; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY org_member_select_ad_perf ON public.ad_copy_performance FOR SELECT TO authenticated USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: ad_copy_performance org_member_update_ad_perf; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY org_member_update_ad_perf ON public.ad_copy_performance FOR UPDATE TO authenticated USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: character_profiles org_members_can_delete_character_profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY org_members_can_delete_character_profiles ON public.character_profiles FOR DELETE USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: character_profiles org_members_can_insert_character_profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY org_members_can_insert_character_profiles ON public.character_profiles FOR INSERT WITH CHECK ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: character_profiles org_members_can_select_character_profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY org_members_can_select_character_profiles ON public.character_profiles FOR SELECT USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: character_profiles org_members_can_update_character_profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY org_members_can_update_character_profiles ON public.character_profiles FOR UPDATE USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: seo_clusters org_members_delete_clusters; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY org_members_delete_clusters ON public.seo_clusters FOR DELETE USING (public.is_org_member(auth.uid(), organization_id));


--
-- Name: seo_clusters org_members_insert_clusters; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY org_members_insert_clusters ON public.seo_clusters FOR INSERT WITH CHECK (public.is_org_member(auth.uid(), organization_id));


--
-- Name: keyword_enrichment_jobs org_members_insert_enrichment_jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY org_members_insert_enrichment_jobs ON public.keyword_enrichment_jobs FOR INSERT WITH CHECK ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: keyword_research_jobs org_members_jobs_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY org_members_jobs_insert ON public.keyword_research_jobs FOR INSERT WITH CHECK (((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))) AND (created_by = auth.uid())));


--
-- Name: keyword_research_jobs org_members_jobs_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY org_members_jobs_select ON public.keyword_research_jobs FOR SELECT USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: keyword_research_jobs org_members_jobs_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY org_members_jobs_update ON public.keyword_research_jobs FOR UPDATE USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: seo_keywords org_members_keywords_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY org_members_keywords_all ON public.seo_keywords USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid())))) WITH CHECK ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: seo_clusters org_members_select_clusters; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY org_members_select_clusters ON public.seo_clusters FOR SELECT USING (public.is_org_member(auth.uid(), organization_id));


--
-- Name: keyword_enrichment_jobs org_members_select_enrichment_jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY org_members_select_enrichment_jobs ON public.keyword_enrichment_jobs FOR SELECT USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: seo_rank_history org_members_select_rank_history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY org_members_select_rank_history ON public.seo_rank_history FOR SELECT USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: seo_clusters org_members_update_clusters; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY org_members_update_clusters ON public.seo_clusters FOR UPDATE USING (public.is_org_member(auth.uid(), organization_id));


--
-- Name: keyword_enrichment_jobs org_members_update_enrichment_jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY org_members_update_enrichment_jobs ON public.keyword_enrichment_jobs FOR UPDATE USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: gsc_connections org_members_view_gsc_conn; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY org_members_view_gsc_conn ON public.gsc_connections FOR SELECT USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: gsc_metrics_daily org_members_view_gsc_metrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY org_members_view_gsc_metrics ON public.gsc_metrics_daily FOR SELECT USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: gsc_sync_runs org_members_view_gsc_runs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY org_members_view_gsc_runs ON public.gsc_sync_runs FOR SELECT USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: organization_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

--
-- Name: organizations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;

--
-- Name: pinterest_boards; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pinterest_boards ENABLE ROW LEVEL SECURITY;

--
-- Name: pinterest_oauth_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pinterest_oauth_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: plan_limits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.plan_limits ENABLE ROW LEVEL SECURITY;

--
-- Name: plan_unit_costs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.plan_unit_costs ENABLE ROW LEVEL SECURITY;

--
-- Name: planned_content_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.planned_content_items ENABLE ROW LEVEL SECURITY;

--
-- Name: planning_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.planning_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: product_persona_mappings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_persona_mappings ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: prompt_analytics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.prompt_analytics ENABLE ROW LEVEL SECURITY;

--
-- Name: publish_attempts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.publish_attempts ENABLE ROW LEVEL SECURITY;

--
-- Name: seo_rank_tracker_runs rank_runs_org_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rank_runs_org_select ON public.seo_rank_tracker_runs FOR SELECT USING (((organization_id IS NULL) OR (organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid())))));


--
-- Name: regulation_crawl_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.regulation_crawl_history ENABLE ROW LEVEL SECURITY;

--
-- Name: regulation_propagation_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.regulation_propagation_log ENABLE ROW LEVEL SECURITY;

--
-- Name: regulation_sources; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.regulation_sources ENABLE ROW LEVEL SECURITY;

--
-- Name: regulation_versions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.regulation_versions ENABLE ROW LEVEL SECURITY;

--
-- Name: report_sync_state; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.report_sync_state ENABLE ROW LEVEL SECURITY;

--
-- Name: sales_chat_analytics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sales_chat_analytics ENABLE ROW LEVEL SECURITY;

--
-- Name: sales_chat_leads; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sales_chat_leads ENABLE ROW LEVEL SECURITY;

--
-- Name: sales_chat_messages_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sales_chat_messages_log ENABLE ROW LEVEL SECURITY;

--
-- Name: saved_audiences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.saved_audiences ENABLE ROW LEVEL SECURITY;

--
-- Name: script_approvals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.script_approvals ENABLE ROW LEVEL SECURITY;

--
-- Name: script_versions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.script_versions ENABLE ROW LEVEL SECURITY;

--
-- Name: scripts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;

--
-- Name: security_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

--
-- Name: seo_clusters; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.seo_clusters ENABLE ROW LEVEL SECURITY;

--
-- Name: seo_keywords; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.seo_keywords ENABLE ROW LEVEL SECURITY;

--
-- Name: seo_landing_pages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.seo_landing_pages ENABLE ROW LEVEL SECURITY;

--
-- Name: seo_rank_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.seo_rank_history ENABLE ROW LEVEL SECURITY;

--
-- Name: seo_rank_tracker_runs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.seo_rank_tracker_runs ENABLE ROW LEVEL SECURITY;

--
-- Name: seo_serp_snapshots; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.seo_serp_snapshots ENABLE ROW LEVEL SECURITY;

--
-- Name: seo_serp_snapshots serp_snapshots_org_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY serp_snapshots_org_select ON public.seo_serp_snapshots FOR SELECT USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid()))));


--
-- Name: telegram_pending_links service role manage pending links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "service role manage pending links" ON public.telegram_pending_links TO service_role USING (true) WITH CHECK (true);


--
-- Name: telegram_notifications service_role_full_access_telegram_notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY service_role_full_access_telegram_notifications ON public.telegram_notifications TO service_role USING (true) WITH CHECK (true);


--
-- Name: seo_rank_history service_role_manage_rank_history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY service_role_manage_rank_history ON public.seo_rank_history USING ((auth.role() = 'service_role'::text)) WITH CHECK ((auth.role() = 'service_role'::text));


--
-- Name: social_connections; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.social_connections ENABLE ROW LEVEL SECURITY;

--
-- Name: social_platform_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.social_platform_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: social_post_engagements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.social_post_engagements ENABLE ROW LEVEL SECURITY;

--
-- Name: social_post_metrics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.social_post_metrics ENABLE ROW LEVEL SECURITY;

--
-- Name: storyboards; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.storyboards ENABLE ROW LEVEL SECURITY;

--
-- Name: subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: telegram_bot_configs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.telegram_bot_configs ENABLE ROW LEVEL SECURITY;

--
-- Name: telegram_chat_bindings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.telegram_chat_bindings ENABLE ROW LEVEL SECURITY;

--
-- Name: telegram_chat_state; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.telegram_chat_state ENABLE ROW LEVEL SECURITY;

--
-- Name: telegram_example_cache; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.telegram_example_cache ENABLE ROW LEVEL SECURITY;

--
-- Name: telegram_example_cache telegram_example_cache_no_user_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY telegram_example_cache_no_user_access ON public.telegram_example_cache TO authenticated, anon USING (false) WITH CHECK (false);


--
-- Name: telegram_example_prompts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.telegram_example_prompts ENABLE ROW LEVEL SECURITY;

--
-- Name: telegram_messages_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.telegram_messages_log ENABLE ROW LEVEL SECURITY;

--
-- Name: telegram_notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.telegram_notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: telegram_pending_links; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.telegram_pending_links ENABLE ROW LEVEL SECURITY;

--
-- Name: telegram_processed_updates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.telegram_processed_updates ENABLE ROW LEVEL SECURITY;

--
-- Name: telegram_user_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.telegram_user_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: topic_content_links; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.topic_content_links ENABLE ROW LEVEL SECURITY;

--
-- Name: topic_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.topic_history ENABLE ROW LEVEL SECURITY;

--
-- Name: trending_topics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.trending_topics ENABLE ROW LEVEL SECURITY;

--
-- Name: usage_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: user_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_saved_hooks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_saved_hooks ENABLE ROW LEVEL SECURITY;

--
-- Name: pinterest_oauth_sessions users_manage_own_pinterest_oauth_sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_manage_own_pinterest_oauth_sessions ON public.pinterest_oauth_sessions USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: video_generations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.video_generations ENABLE ROW LEVEL SECURITY;

--
-- Name: video_render_jobs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.video_render_jobs ENABLE ROW LEVEL SECURITY;

--
-- Name: voucher_usages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.voucher_usages ENABLE ROW LEVEL SECURITY;

--
-- Name: vouchers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;

--
-- Name: web_search_analytics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.web_search_analytics ENABLE ROW LEVEL SECURITY;

--
-- Name: web_search_cache; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.web_search_cache ENABLE ROW LEVEL SECURITY;

--
-- Name: workflow_checkpoints; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.workflow_checkpoints ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict W0ew3bkRBnjq1BSHi5GyaOGoaQcyfjRfosZGo7akTPVRyBVEj5j5CegDeBoMjct

