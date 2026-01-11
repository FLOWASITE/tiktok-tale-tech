-- Add unique constraint for default prompts (where organization_id IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_prompts_unique_default 
ON public.ai_prompts(function_name, prompt_key) 
WHERE organization_id IS NULL;

-- Add partial unique constraint for org-specific prompts
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_prompts_unique_org 
ON public.ai_prompts(function_name, prompt_key, organization_id) 
WHERE organization_id IS NOT NULL;