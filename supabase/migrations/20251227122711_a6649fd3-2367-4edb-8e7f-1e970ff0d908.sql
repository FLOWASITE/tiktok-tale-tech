-- Drop the old constraint
ALTER TABLE public.topic_history DROP CONSTRAINT IF EXISTS topic_history_usage_status_check;

-- Add new constraint with all valid usage_status values
ALTER TABLE public.topic_history ADD CONSTRAINT topic_history_usage_status_check 
CHECK (usage_status = ANY (ARRAY['suggested'::text, 'selected'::text, 'created'::text, 'published'::text, 'saved'::text, 'draft'::text]));