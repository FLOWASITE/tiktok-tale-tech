DO $$
DECLARE
  flash_functions text[] := ARRAY[
    'suggest-usp', 'suggest-ad-fix', 'optimize-social-text',
    'extract-broll-keywords', 'extract-regulation-content', 'parse-regulation-document',
    'clarify-campaign-intent', 'ai-edit-channel', 'generate-sample-text',
    'geo-generate-prompts', 'generate-hooks', 'geo-score-content'
  ];
  plus_functions text[] := ARRAY[
    'analyze-regulation-impact', 'score-ad-creative', 'improve-script',
    'agent-quality', 'enrich-industry-profiles', 'geo-scan-brand'
  ];
  vision_functions text[] := ARRAY[
    'validate-seamless-consistency'
  ];
  fn text;
  v_updated int;
BEGIN
  FOREACH fn IN ARRAY flash_functions LOOP
    UPDATE public.ai_function_configs
    SET model_override = 'qwen-flash',
        force_provider = 'dashscope',
        is_enabled = true,
        temperature = COALESCE(temperature, 0.7),
        max_tokens = COALESCE(max_tokens, 2000),
        updated_at = now()
    WHERE function_name = fn AND organization_id IS NULL;
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    IF v_updated = 0 THEN
      INSERT INTO public.ai_function_configs (
        function_name, model_override, force_provider, is_enabled, temperature, max_tokens
      ) VALUES (fn, 'qwen-flash', 'dashscope', true, 0.7, 2000);
    END IF;
  END LOOP;

  FOREACH fn IN ARRAY plus_functions LOOP
    UPDATE public.ai_function_configs
    SET model_override = 'qwen-plus',
        force_provider = 'dashscope',
        is_enabled = true,
        temperature = COALESCE(temperature, 0.7),
        max_tokens = COALESCE(max_tokens, 4000),
        updated_at = now()
    WHERE function_name = fn AND organization_id IS NULL;
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    IF v_updated = 0 THEN
      INSERT INTO public.ai_function_configs (
        function_name, model_override, force_provider, is_enabled, temperature, max_tokens
      ) VALUES (fn, 'qwen-plus', 'dashscope', true, 0.7, 4000);
    END IF;
  END LOOP;

  FOREACH fn IN ARRAY vision_functions LOOP
    UPDATE public.ai_function_configs
    SET model_override = 'qwen3-vl-plus',
        force_provider = 'dashscope',
        is_enabled = true,
        temperature = COALESCE(temperature, 0.5),
        max_tokens = COALESCE(max_tokens, 2000),
        updated_at = now()
    WHERE function_name = fn AND organization_id IS NULL;
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    IF v_updated = 0 THEN
      INSERT INTO public.ai_function_configs (
        function_name, model_override, force_provider, is_enabled, temperature, max_tokens
      ) VALUES (fn, 'qwen3-vl-plus', 'dashscope', true, 0.5, 2000);
    END IF;
  END LOOP;
END $$;