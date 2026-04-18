-- Add trace_id and sampled_response to ai_metrics for distributed tracing
ALTER TABLE public.ai_metrics ADD COLUMN IF NOT EXISTS trace_id text;
ALTER TABLE public.ai_metrics ADD COLUMN IF NOT EXISTS sampled_response text;
CREATE INDEX IF NOT EXISTS ai_metrics_trace_id_idx ON public.ai_metrics(trace_id) WHERE trace_id IS NOT NULL;