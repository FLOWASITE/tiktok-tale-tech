-- Add new columns for generation-specific tracking to ai_metrics
ALTER TABLE ai_metrics 
ADD COLUMN IF NOT EXISTS channels TEXT[],
ADD COLUMN IF NOT EXISTS quality_mode TEXT,
ADD COLUMN IF NOT EXISTS models_used JSONB,
ADD COLUMN IF NOT EXISTS channel_durations JSONB,
ADD COLUMN IF NOT EXISTS cache_hit BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS estimated_cost_usd DECIMAL(10, 6),
ADD COLUMN IF NOT EXISTS used_fallback BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS fallback_model TEXT,
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS content_id UUID,
ADD COLUMN IF NOT EXISTS action_type TEXT;

-- Index for analytics queries
CREATE INDEX IF NOT EXISTS idx_ai_metrics_org_date ON ai_metrics(organization_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_metrics_function_date ON ai_metrics(function_name, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_metrics_content ON ai_metrics(content_id) WHERE content_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_metrics_cost ON ai_metrics(estimated_cost_usd) WHERE estimated_cost_usd IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN ai_metrics.channels IS 'Array of channels generated (facebook, instagram, etc.)';
COMMENT ON COLUMN ai_metrics.quality_mode IS 'Quality mode used: fast, balanced, quality';
COMMENT ON COLUMN ai_metrics.models_used IS 'JSON mapping channel to model used';
COMMENT ON COLUMN ai_metrics.channel_durations IS 'JSON mapping channel to generation duration in ms';
COMMENT ON COLUMN ai_metrics.estimated_cost_usd IS 'Estimated cost in USD based on token usage';
COMMENT ON COLUMN ai_metrics.used_fallback IS 'Whether circuit breaker triggered fallback model';
COMMENT ON COLUMN ai_metrics.action_type IS 'Action type: create, expand, regenerate, preview';