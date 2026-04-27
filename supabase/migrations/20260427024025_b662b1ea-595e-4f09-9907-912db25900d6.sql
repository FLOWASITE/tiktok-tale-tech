-- Standardize force_provider for all qwen-* functions to remove dependency on auto-detection
UPDATE public.ai_function_configs
SET force_provider = 'dashscope', updated_at = now()
WHERE organization_id IS NULL
  AND force_provider IS NULL
  AND function_name IN (
    'topic-ai',
    'analyze-dashboard-insights',
    'analyze-script',
    'chat-topics',
    'auto-suggest-connections',
    'generate-brand-guideline',
    'generate-carousel',
    'generate-core-content',
    'generate-multichannel',
    'generate-storyboard',
    'regenerate-carousel-caption'
  );

-- Fix invalid model name: qwen3-flash doesn't exist in DashScope catalog (qwen3 series has turbo/plus/max/long/vl-*/coder-*)
UPDATE public.ai_function_configs
SET model_override = 'qwen-flash', updated_at = now()
WHERE organization_id IS NULL
  AND function_name = 'topic-ai'
  AND model_override = 'qwen3-flash';

-- Fix generate-script: qwen-max is NOT an OpenRouter model (OpenRouter uses qwen/qwen3.5-*).
-- Align with generate-multichannel pattern: use qwen-max-latest via DashScope.
UPDATE public.ai_function_configs
SET model_override = 'qwen-max-latest',
    force_provider = 'dashscope',
    updated_at = now()
WHERE organization_id IS NULL
  AND function_name = 'generate-script'
  AND model_override = 'qwen-max'
  AND force_provider = 'openrouter';