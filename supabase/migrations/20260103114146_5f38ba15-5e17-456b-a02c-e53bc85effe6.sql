-- Add encrypted_api_key column to ai_provider_configs
ALTER TABLE public.ai_provider_configs
ADD COLUMN IF NOT EXISTS encrypted_api_key TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.ai_provider_configs.encrypted_api_key IS 'Encrypted API key for the provider. Only decrypted in edge functions.';