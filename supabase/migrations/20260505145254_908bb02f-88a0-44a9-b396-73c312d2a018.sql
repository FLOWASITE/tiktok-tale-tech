UPDATE public.ai_function_configs
SET model_override = 'qwen-plus',
    force_provider = 'dashscope',
    updated_at = now()
WHERE function_name = 'generate-character'
  AND organization_id IS NULL;