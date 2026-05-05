-- Enable required extensions (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 1) Tracker run history -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.seo_rank_tracker_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  triggered_by TEXT NOT NULL DEFAULT 'cron', -- 'cron' | 'manual' | 'api'
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  checked INTEGER NOT NULL DEFAULT 0,
  found INTEGER NOT NULL DEFAULT 0,
  errors JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rank_runs_org_started
  ON public.seo_rank_tracker_runs (organization_id, started_at DESC);

ALTER TABLE public.seo_rank_tracker_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rank_runs_org_select" ON public.seo_rank_tracker_runs;
CREATE POLICY "rank_runs_org_select" ON public.seo_rank_tracker_runs
  FOR SELECT USING (
    organization_id IS NULL OR organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

-- 2) SERP snapshots ------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.seo_serp_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  keyword_id UUID NOT NULL,
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  top_results JSONB NOT NULL,           -- [{rank, url, title, description, host, our_site}]
  median_word_count INTEGER,
  common_h2s TEXT[],
  schema_types TEXT[],
  source TEXT NOT NULL DEFAULT 'firecrawl',
  raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_serp_snapshots_keyword_at
  ON public.seo_serp_snapshots (keyword_id, snapshot_at DESC);
CREATE INDEX IF NOT EXISTS idx_serp_snapshots_org
  ON public.seo_serp_snapshots (organization_id, snapshot_at DESC);

ALTER TABLE public.seo_serp_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "serp_snapshots_org_select" ON public.seo_serp_snapshots;
CREATE POLICY "serp_snapshots_org_select" ON public.seo_serp_snapshots
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

-- 3) Schedule weekly rank tracker (Mon 02:00 UTC) -----------------------
DO $$
BEGIN
  -- unschedule if exists
  PERFORM cron.unschedule('seo-rank-tracker-weekly')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'seo-rank-tracker-weekly');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'seo-rank-tracker-weekly',
  '0 2 * * 1',
  $cron$
  SELECT net.http_post(
    url := 'https://rllyipiyuptkibqinotz.supabase.co/functions/v1/seo-rank-tracker',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    ),
    body := jsonb_build_object('triggered_by', 'cron', 'limit', 200)
  );
  $cron$
);