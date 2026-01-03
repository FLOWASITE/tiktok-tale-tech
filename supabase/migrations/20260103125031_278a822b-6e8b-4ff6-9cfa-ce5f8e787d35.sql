-- Xóa constraint cũ
ALTER TABLE ai_provider_configs 
DROP CONSTRAINT IF EXISTS ai_provider_configs_provider_type_check;

-- Thêm constraint mới với openrouter
ALTER TABLE ai_provider_configs 
ADD CONSTRAINT ai_provider_configs_provider_type_check 
CHECK (provider_type = ANY (ARRAY[
  'lovable'::text, 
  'perplexity'::text, 
  'firecrawl'::text, 
  'openai'::text, 
  'anthropic'::text, 
  'gemini'::text, 
  'replicate'::text, 
  'custom'::text,
  'openrouter'::text
]));