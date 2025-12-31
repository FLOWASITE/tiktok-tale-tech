-- Create AI Metrics table for observability
CREATE TABLE IF NOT EXISTS public.ai_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id TEXT NOT NULL,
  function_name TEXT NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  user_id UUID,
  brand_template_id UUID REFERENCES brand_templates(id) ON DELETE SET NULL,
  
  -- Timing metrics
  total_duration_ms INTEGER NOT NULL,
  ai_call_duration_ms INTEGER,
  context_fetch_duration_ms INTEGER,
  
  -- Token usage (estimated)
  input_tokens_estimated INTEGER,
  output_tokens_estimated INTEGER,
  
  -- Context richness
  context_sources TEXT[] DEFAULT '{}',
  context_richness_score INTEGER,
  
  -- Agentic loop specific
  total_turns INTEGER,
  tools_executed TEXT[],
  exit_reason TEXT,
  
  -- Error tracking
  had_error BOOLEAN DEFAULT false,
  error_type TEXT,
  error_message TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_ai_metrics_org_id ON ai_metrics(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_metrics_function ON ai_metrics(function_name);
CREATE INDEX IF NOT EXISTS idx_ai_metrics_created ON ai_metrics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_metrics_trace ON ai_metrics(trace_id);
CREATE INDEX IF NOT EXISTS idx_ai_metrics_errors ON ai_metrics(had_error) WHERE had_error = true;

-- Enable RLS
ALTER TABLE ai_metrics ENABLE ROW LEVEL SECURITY;

-- RLS policy: Admins can view all metrics
CREATE POLICY "Admins can view all metrics" ON ai_metrics
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- RLS policy: Organization members can view their org metrics
CREATE POLICY "Org members can view org metrics" ON ai_metrics
  FOR SELECT USING (
    organization_id IS NOT NULL 
    AND public.is_org_member(auth.uid(), organization_id)
  );

-- RLS policy: Service role can insert (edge functions)
CREATE POLICY "Service role can insert metrics" ON ai_metrics
  FOR INSERT WITH CHECK (true);

-- Add comment for documentation
COMMENT ON TABLE ai_metrics IS 'Stores performance metrics and observability data for AI function calls';