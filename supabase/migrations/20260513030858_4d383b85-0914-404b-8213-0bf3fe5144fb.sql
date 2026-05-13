INSERT INTO public.ai_function_configs (function_name, model_override, max_tokens, temperature, is_enabled, priority_level)
VALUES
  ('extract-carousel-palette', 'google/gemini-2.5-flash-lite', 120, 0.0, true, 'low'),
  ('validate-seamless-consistency', NULL, NULL, NULL, true, 'normal')
ON CONFLICT DO NOTHING;