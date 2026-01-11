-- Update the check constraint on ai_prompt_history to allow 'created' change_type
ALTER TABLE public.ai_prompt_history DROP CONSTRAINT IF EXISTS ai_prompt_history_change_type_check;

ALTER TABLE public.ai_prompt_history 
ADD CONSTRAINT ai_prompt_history_change_type_check 
CHECK (change_type IN ('created', 'update', 'content_update', 'status_change', 'metadata_update', 'rollback', 'ab_test'));