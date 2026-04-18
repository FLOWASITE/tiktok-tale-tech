ALTER TABLE public.ai_metrics
  ADD COLUMN IF NOT EXISTS compliance_risk_level text,
  ADD COLUMN IF NOT EXISTS compliance_violations jsonb,
  ADD COLUMN IF NOT EXISTS compliance_action text;

CREATE INDEX IF NOT EXISTS idx_ai_metrics_compliance_risk_level
  ON public.ai_metrics(compliance_risk_level)
  WHERE compliance_risk_level IS NOT NULL;