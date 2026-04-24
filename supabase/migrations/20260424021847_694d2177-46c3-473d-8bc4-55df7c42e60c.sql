-- Reroute channel model overrides away from Lovable Gateway models
-- (Lovable Gateway has been hitting 402 'Not enough credits' for these orgs).
-- Switch to qwen-plus (DashScope) which has user-provided API keys configured.

UPDATE public.ai_channel_model_configs
SET model_override = 'qwen-plus',
    updated_at = now()
WHERE channel = 'instagram'
  AND model_override = 'anthropic/claude-3.5-haiku';

UPDATE public.ai_channel_model_configs
SET model_override = 'qwen-plus',
    updated_at = now()
WHERE channel = 'youtube'
  AND model_override = 'google/gemini-2.5-flash-lite';