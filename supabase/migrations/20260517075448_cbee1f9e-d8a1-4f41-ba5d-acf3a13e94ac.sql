-- Remove suggest-channels from AI configs (now rule-based, no AI)
DELETE FROM public.ai_function_configs WHERE function_name = 'suggest-channels';

-- Set 7-day cache for suggest-piece-topics (168 hours)
UPDATE public.ai_function_configs
SET cache_ttl_hours = 168
WHERE function_name = 'suggest-piece-topics';