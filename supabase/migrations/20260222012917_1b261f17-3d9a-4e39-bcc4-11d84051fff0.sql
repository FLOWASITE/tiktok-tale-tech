
-- Drop and recreate constraint with 'poyo' added
ALTER TABLE public.ai_provider_configs
DROP CONSTRAINT ai_provider_configs_provider_type_check;

ALTER TABLE public.ai_provider_configs
ADD CONSTRAINT ai_provider_configs_provider_type_check
CHECK (provider_type = ANY (ARRAY['lovable','perplexity','firecrawl','openai','anthropic','gemini','replicate','custom','openrouter','kie','poyo']));

-- Insert PoYo.ai provider config
INSERT INTO public.ai_provider_configs (
  provider_type,
  display_name,
  is_active,
  api_key_secret_name,
  default_model
) VALUES (
  'poyo',
  'PoYo.ai',
  true,
  'POYO_API_KEY',
  'poyo/gpt-4o-image'
);
