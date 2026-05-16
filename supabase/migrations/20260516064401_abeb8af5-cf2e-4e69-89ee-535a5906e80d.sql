-- C3: Approval expiry + claim CAS for orchestrator race prevention
ALTER TABLE public.agent_approvals
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Default 7 days for newly inserted pending approvals
ALTER TABLE public.agent_approvals
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '7 days');

-- Backfill existing pending rows (one-time)
UPDATE public.agent_approvals
SET expires_at = COALESCE(created_at, now()) + interval '7 days'
WHERE expires_at IS NULL AND status = 'pending';

CREATE INDEX IF NOT EXISTS idx_agent_approvals_pending_expiry
  ON public.agent_approvals (expires_at)
  WHERE status = 'pending';

-- H2: Stage claim CAS — prevent two concurrent run_stage executions
ALTER TABLE public.agent_pipelines
  ADD COLUMN IF NOT EXISTS stage_claim_token TEXT,
  ADD COLUMN IF NOT EXISTS stage_claim_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_agent_pipelines_stage_claim
  ON public.agent_pipelines (stage_claim_at)
  WHERE stage_claim_token IS NOT NULL;
