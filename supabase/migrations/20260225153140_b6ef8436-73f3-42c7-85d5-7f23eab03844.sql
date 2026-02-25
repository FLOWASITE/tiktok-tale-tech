
CREATE TABLE public.workflow_checkpoints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  node_name TEXT NOT NULL,
  graph_state JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed'))
);

-- Index for fast lookup by session
CREATE INDEX idx_workflow_checkpoints_session ON public.workflow_checkpoints (session_id, status, created_at DESC);

-- Auto-cleanup old checkpoints (older than 7 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_checkpoints()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.workflow_checkpoints
  WHERE created_at < NOW() - INTERVAL '7 days'
    OR (status IN ('completed', 'failed') AND created_at < NOW() - INTERVAL '1 day');
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- RLS: Allow service role full access (Edge Functions use service role)
ALTER TABLE public.workflow_checkpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on workflow_checkpoints"
  ON public.workflow_checkpoints
  FOR ALL
  USING (true)
  WITH CHECK (true);
