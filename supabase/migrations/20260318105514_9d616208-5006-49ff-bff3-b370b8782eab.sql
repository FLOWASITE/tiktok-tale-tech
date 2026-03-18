
CREATE TABLE public.social_post_engagements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  brand_template_id UUID REFERENCES public.brand_templates(id) ON DELETE SET NULL,
  connection_id UUID REFERENCES public.social_connections(id) ON DELETE SET NULL,
  platform TEXT NOT NULL DEFAULT 'facebook',
  post_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  sender_id TEXT,
  sender_name TEXT,
  facebook_event_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_spe_org_id ON public.social_post_engagements(organization_id);
CREATE INDEX idx_spe_post_id ON public.social_post_engagements(post_id);
CREATE INDEX idx_spe_connection_id ON public.social_post_engagements(connection_id);
CREATE INDEX idx_spe_event_type ON public.social_post_engagements(event_type);
CREATE UNIQUE INDEX idx_spe_facebook_event_unique ON public.social_post_engagements(facebook_event_id) WHERE facebook_event_id IS NOT NULL;

ALTER TABLE public.social_post_engagements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can read engagements"
  ON public.social_post_engagements
  FOR SELECT
  TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Service role can insert engagements"
  ON public.social_post_engagements
  FOR INSERT
  TO service_role
  WITH CHECK (true);
