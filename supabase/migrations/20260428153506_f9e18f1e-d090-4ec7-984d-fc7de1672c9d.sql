-- Tables for the Reports module
-- 1) social_post_metrics: snapshot insights from social platform APIs
CREATE TABLE IF NOT EXISTS public.social_post_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  brand_template_id UUID REFERENCES public.brand_templates(id) ON DELETE SET NULL,
  connection_id UUID REFERENCES public.social_connections(id) ON DELETE SET NULL,
  content_id UUID,
  platform TEXT NOT NULL,
  post_id TEXT NOT NULL,
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reach INTEGER NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0,
  comments INTEGER NOT NULL DEFAULT 0,
  shares INTEGER NOT NULL DEFAULT 0,
  saves INTEGER NOT NULL DEFAULT 0,
  video_views INTEGER NOT NULL DEFAULT 0,
  link_clicks INTEGER NOT NULL DEFAULT 0,
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spm_org_id ON public.social_post_metrics(organization_id);
CREATE INDEX IF NOT EXISTS idx_spm_brand_id ON public.social_post_metrics(brand_template_id);
CREATE INDEX IF NOT EXISTS idx_spm_platform ON public.social_post_metrics(platform);
CREATE INDEX IF NOT EXISTS idx_spm_snapshot_at ON public.social_post_metrics(snapshot_at DESC);
CREATE INDEX IF NOT EXISTS idx_spm_post_id ON public.social_post_metrics(post_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_spm_unique_daily 
  ON public.social_post_metrics(connection_id, post_id, ((snapshot_at AT TIME ZONE 'UTC')::date))
  WHERE connection_id IS NOT NULL;

ALTER TABLE public.social_post_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can read social_post_metrics"
  ON public.social_post_metrics FOR SELECT
  TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Service role can insert social_post_metrics"
  ON public.social_post_metrics FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update social_post_metrics"
  ON public.social_post_metrics FOR UPDATE
  TO service_role
  USING (true) WITH CHECK (true);

CREATE TRIGGER update_social_post_metrics_updated_at
  BEFORE UPDATE ON public.social_post_metrics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) report_sync_state: track cron sync per connection
CREATE TABLE IF NOT EXISTS public.report_sync_state (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES public.social_connections(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  last_synced_at TIMESTAMPTZ,
  last_status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  posts_synced INTEGER NOT NULL DEFAULT 0,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT report_sync_state_status_check CHECK (last_status IN ('pending','success','failed','skipped','partial'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rss_unique_connection
  ON public.report_sync_state(connection_id) WHERE connection_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rss_org_id ON public.report_sync_state(organization_id);
CREATE INDEX IF NOT EXISTS idx_rss_platform ON public.report_sync_state(platform);

ALTER TABLE public.report_sync_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can read report_sync_state"
  ON public.report_sync_state FOR SELECT
  TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Service role can manage report_sync_state"
  ON public.report_sync_state FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE TRIGGER update_report_sync_state_updated_at
  BEFORE UPDATE ON public.report_sync_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();