-- Add GeminiGen to ai_provider_configs.provider_type CHECK and seed
-- default AI function configs for generate-video and generate-music.
-- Idempotent: safe to re-run.

-- 1. Extend provider_type CHECK to include 'geminigen'
ALTER TABLE public.ai_provider_configs
  DROP CONSTRAINT IF EXISTS ai_provider_configs_provider_type_check;

ALTER TABLE public.ai_provider_configs
  ADD CONSTRAINT ai_provider_configs_provider_type_check
  CHECK (provider_type IN ('lovable', 'perplexity', 'firecrawl', 'openai', 'anthropic', 'gemini', 'replicate', 'geminigen', 'custom'));

-- 2. Seed organization-agnostic (NULL organization_id = global default) function configs.
--    Org admins can override per-org by inserting their own row.
--    Idempotent via WHERE NOT EXISTS (PostgreSQL treats NULLs as distinct in UNIQUE
--    constraints, so ON CONFLICT won't match NULL org_id rows).
INSERT INTO public.ai_function_configs (
  organization_id, function_name, model_override, parameters, is_enabled, priority_level
)
SELECT
  NULL,
  'generate-video',
  'geminigen/veo-3',
  jsonb_build_object(
    'default_provider', 'geminigen',
    'default_duration', 5,
    'default_aspect_ratio', '16:9',
    'default_resolution', '1080p',
    'max_duration', 10,
    'supported_models', jsonb_build_array(
      'geminigen/veo-3',
      'geminigen/veo-3-fast',
      'geminigen/veo-3.1',
      'geminigen/veo-3.1-fast',
      'geminigen/veo-2',
      'geminigen/sora-2'
    )
  ),
  true,
  'normal'
WHERE NOT EXISTS (
  SELECT 1 FROM public.ai_function_configs
  WHERE organization_id IS NULL AND function_name = 'generate-video'
);

INSERT INTO public.ai_function_configs (
  organization_id, function_name, model_override, parameters, is_enabled, priority_level
)
SELECT
  NULL,
  'generate-music',
  'elevenlabs/music-v1',
  jsonb_build_object(
    'default_provider', 'elevenlabs',
    'default_style', 'cinematic',
    'default_intensity', 'medium',
    'min_duration', 1,
    'max_duration', 30
  ),
  true,
  'normal'
WHERE NOT EXISTS (
  SELECT 1 FROM public.ai_function_configs
  WHERE organization_id IS NULL AND function_name = 'generate-music'
);

COMMENT ON COLUMN public.ai_function_configs.parameters IS
  'JSONB config: default_provider, default_model, supported_models[], default_duration, default_aspect_ratio, etc.';
