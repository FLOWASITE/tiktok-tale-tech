
-- ============================================
-- Phase 3: Shared Blackboard + Brand Memory tables
-- For Hierarchical Supervisor Multi-Agent Architecture
-- ============================================

-- Shared Blackboard for inter-agent communication within a session
CREATE TABLE public.agent_blackboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  agent_name TEXT NOT NULL,
  data_key TEXT NOT NULL,
  data_value JSONB NOT NULL,
  ttl_seconds INT DEFAULT 3600,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_blackboard_session ON public.agent_blackboard(session_id, data_key);
CREATE INDEX idx_blackboard_agent ON public.agent_blackboard(session_id, agent_name);

-- Brand Memory Store (long-term vector memory per brand)
CREATE TABLE public.brand_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_template_id UUID REFERENCES public.brand_templates(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id),
  memory_type TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(384),
  confidence FLOAT DEFAULT 0.5,
  source TEXT,
  used_count INT DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_brand_memory_brand ON public.brand_memory(brand_template_id, memory_type);
CREATE INDEX idx_brand_memory_org ON public.brand_memory(organization_id);
CREATE INDEX idx_brand_memory_embedding ON public.brand_memory USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);

-- Agent execution logs for monitoring and debugging
CREATE TABLE public.agent_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  agent_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'started',
  input_summary TEXT,
  output_summary TEXT,
  tools_used TEXT[],
  duration_ms INT,
  token_usage JSONB,
  error_message TEXT,
  retry_count INT DEFAULT 0,
  model_used TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_agent_logs_session ON public.agent_execution_logs(session_id);
CREATE INDEX idx_agent_logs_agent ON public.agent_execution_logs(agent_name, created_at DESC);

-- RLS policies
ALTER TABLE public.agent_blackboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_execution_logs ENABLE ROW LEVEL SECURITY;

-- Blackboard: service role only (edge functions)
CREATE POLICY "Service role access for agent_blackboard"
  ON public.agent_blackboard
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Brand memory: org members can read, service role can write
CREATE POLICY "Org members can read brand_memory"
  ON public.brand_memory
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage brand_memory"
  ON public.brand_memory
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Agent logs: org members can read
CREATE POLICY "Service role access for agent_execution_logs"
  ON public.agent_execution_logs
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Updated_at trigger for brand_memory
CREATE TRIGGER set_brand_memory_updated_at
  BEFORE UPDATE ON public.brand_memory
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

-- Search function for brand memory (vector similarity)
CREATE OR REPLACE FUNCTION public.search_brand_memory(
  query_embedding extensions.vector,
  match_brand_template_id UUID,
  match_types TEXT[] DEFAULT NULL,
  match_threshold FLOAT DEFAULT 0.6,
  match_count INT DEFAULT 5
)
RETURNS TABLE(
  id UUID,
  memory_type TEXT,
  content TEXT,
  confidence FLOAT,
  source TEXT,
  similarity FLOAT,
  used_count INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bm.id,
    bm.memory_type,
    bm.content,
    bm.confidence::FLOAT,
    bm.source,
    (1 - (bm.embedding <=> query_embedding))::FLOAT AS similarity,
    bm.used_count
  FROM public.brand_memory bm
  WHERE bm.brand_template_id = match_brand_template_id
    AND bm.embedding IS NOT NULL
    AND (match_types IS NULL OR bm.memory_type = ANY(match_types))
    AND (1 - (bm.embedding <=> query_embedding)) > match_threshold
  ORDER BY bm.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
