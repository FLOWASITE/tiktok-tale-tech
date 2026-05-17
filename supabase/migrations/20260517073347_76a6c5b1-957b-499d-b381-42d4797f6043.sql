INSERT INTO public.ai_function_configs (function_name, organization_id, model_override, temperature, max_tokens, cache_ttl_hours, is_enabled, priority_level)
VALUES
  ('suggest-piece-topics', NULL, 'google/gemini-3-flash-preview', 0.75, 1200, 0, true, 'normal'),
  ('suggest-channels', NULL, 'google/gemini-3-flash-preview', 0.40, 800, 0, true, 'normal')
ON CONFLICT (function_name) WHERE organization_id IS NULL DO NOTHING;