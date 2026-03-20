ALTER TABLE public.ai_function_configs ADD COLUMN IF NOT EXISTS force_provider text DEFAULT NULL;
ALTER TABLE public.ai_channel_model_configs ADD COLUMN IF NOT EXISTS force_provider text DEFAULT NULL;
COMMENT ON COLUMN public.ai_function_configs.force_provider IS 'Force routing to a specific provider (e.g. openrouter, lovable, openai) instead of auto-detecting from model name';
COMMENT ON COLUMN public.ai_channel_model_configs.force_provider IS 'Force routing to a specific provider (e.g. openrouter, lovable, openai) instead of auto-detecting from model name';