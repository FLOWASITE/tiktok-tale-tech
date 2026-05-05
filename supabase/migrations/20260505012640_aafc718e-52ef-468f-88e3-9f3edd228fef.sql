
-- GSC Connections (OAuth tokens per organization + site)
CREATE TABLE IF NOT EXISTS public.gsc_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  brand_template_id UUID,
  site_url TEXT NOT NULL,
  google_email TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, site_url)
);

ALTER TABLE public.gsc_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_view_gsc_conn" ON public.gsc_connections
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())
  );

CREATE POLICY "org_admins_manage_gsc_conn" ON public.gsc_connections
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role IN ('owner','admin')
    )
  );

CREATE INDEX idx_gsc_conn_org ON public.gsc_connections(organization_id);
CREATE INDEX idx_gsc_conn_active ON public.gsc_connections(is_active) WHERE is_active = true;

-- GSC Daily metrics snapshot
CREATE TABLE IF NOT EXISTS public.gsc_metrics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES public.gsc_connections(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL,
  date DATE NOT NULL,
  page TEXT,
  query TEXT,
  country TEXT,
  device TEXT,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  ctr NUMERIC(6,4) NOT NULL DEFAULT 0,
  position NUMERIC(6,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.gsc_metrics_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_view_gsc_metrics" ON public.gsc_metrics_daily
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())
  );

CREATE INDEX idx_gsc_metrics_conn_date ON public.gsc_metrics_daily(connection_id, date DESC);
CREATE INDEX idx_gsc_metrics_org_date ON public.gsc_metrics_daily(organization_id, date DESC);
CREATE INDEX idx_gsc_metrics_query ON public.gsc_metrics_daily(query) WHERE query IS NOT NULL;

-- GSC Sync runs log
CREATE TABLE IF NOT EXISTS public.gsc_sync_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID REFERENCES public.gsc_connections(id) ON DELETE CASCADE,
  organization_id UUID,
  status TEXT NOT NULL,
  rows_synced INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.gsc_sync_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_view_gsc_runs" ON public.gsc_sync_runs
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())
  );

CREATE INDEX idx_gsc_runs_conn ON public.gsc_sync_runs(connection_id, started_at DESC);

-- Update trigger
CREATE TRIGGER update_gsc_connections_updated_at
  BEFORE UPDATE ON public.gsc_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
