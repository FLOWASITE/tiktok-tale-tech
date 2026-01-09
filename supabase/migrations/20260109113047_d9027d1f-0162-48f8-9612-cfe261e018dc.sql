-- Phase 1: Add hook_evaluations column for AI Hook Evaluator results
ALTER TABLE public.multi_channel_contents 
ADD COLUMN IF NOT EXISTS hook_evaluations JSONB DEFAULT NULL;

COMMENT ON COLUMN public.multi_channel_contents.hook_evaluations IS 
'Hook evaluation results from AI Hook Evaluator per channel. Structure: { channel: { combined_score, regex_score, ai_score, issues, strengths } }';