-- Add new columns for runtime AI configuration
ALTER TABLE public.ai_function_configs 
ADD COLUMN IF NOT EXISTS temperature NUMERIC(3,2) DEFAULT 0.7,
ADD COLUMN IF NOT EXISTS max_tokens INTEGER DEFAULT 4096,
ADD COLUMN IF NOT EXISTS custom_system_prompt TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ai_function_configs_lookup 
ON public.ai_function_configs(function_name, organization_id, is_enabled);

-- Add comment for documentation
COMMENT ON COLUMN public.ai_function_configs.temperature IS 'AI model temperature (0.0-1.0)';
COMMENT ON COLUMN public.ai_function_configs.max_tokens IS 'Maximum tokens for AI response';
COMMENT ON COLUMN public.ai_function_configs.custom_system_prompt IS 'Optional custom system prompt override';