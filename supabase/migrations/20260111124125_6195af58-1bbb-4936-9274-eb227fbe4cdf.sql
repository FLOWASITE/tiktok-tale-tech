-- ============================================
-- Cleanup Duplicate Prompts Migration
-- ============================================
-- Problem: Multiple functions have TWO system prompts (system & system_prompt)
-- Solution: Deprecate shorter 'system' prompts, keep 'system_prompt' as canonical

-- Phase 1: Mark short 'system' prompts as inactive (keep for history)
UPDATE ai_prompts 
SET 
  is_active = false, 
  name = CASE 
    WHEN name NOT LIKE '%[DEPRECATED]%' THEN name || ' [DEPRECATED]'
    ELSE name 
  END,
  description = 'DEPRECATED: Use system_prompt instead. ' || COALESCE(description, ''),
  updated_at = now()
WHERE function_name IN ('generate-core-content', 'generate-multichannel', 'generate-ad-copy')
  AND prompt_key = 'system'
  AND prompt_type = 'system'
  AND is_active = true;

-- Phase 2: Ensure system_prompt is marked as default for these functions
UPDATE ai_prompts 
SET 
  is_default = true,
  updated_at = now()
WHERE function_name IN ('generate-core-content', 'generate-multichannel', 'generate-ad-copy')
  AND prompt_key = 'system_prompt'
  AND prompt_type = 'system'
  AND is_active = true;