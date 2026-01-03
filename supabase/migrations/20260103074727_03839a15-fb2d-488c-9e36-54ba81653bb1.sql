-- Table for storing social media connections/OAuth tokens
CREATE TABLE public.social_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('twitter', 'facebook', 'instagram', 'linkedin', 'tiktok', 'threads', 'youtube')),
  platform_user_id TEXT,
  platform_username TEXT,
  platform_display_name TEXT,
  platform_avatar_url TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[] DEFAULT '{}',
  page_id TEXT,
  page_name TEXT,
  is_active BOOLEAN DEFAULT true,
  connected_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  last_error TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, platform, platform_user_id)
);

-- Table for logging publish attempts
CREATE TABLE public.publish_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES public.content_schedules(id) ON DELETE SET NULL,
  content_id UUID REFERENCES public.multi_channel_contents(id) ON DELETE SET NULL,
  connection_id UUID REFERENCES public.social_connections(id) ON DELETE SET NULL,
  organization_id UUID,
  platform TEXT NOT NULL,
  channel TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'success', 'failed', 'rate_limited', 'cancelled')),
  external_post_id TEXT,
  external_post_url TEXT,
  error_code TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  request_payload JSONB,
  response_payload JSONB,
  attempted_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_social_connections_org ON public.social_connections(organization_id);
CREATE INDEX idx_social_connections_platform ON public.social_connections(platform);
CREATE INDEX idx_social_connections_active ON public.social_connections(organization_id, platform, is_active);
CREATE INDEX idx_publish_attempts_schedule ON public.publish_attempts(schedule_id);
CREATE INDEX idx_publish_attempts_content ON public.publish_attempts(content_id);
CREATE INDEX idx_publish_attempts_status ON public.publish_attempts(status, attempted_at);

-- Enable RLS
ALTER TABLE public.social_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publish_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for social_connections
CREATE POLICY "Users can view org social_connections"
  ON public.social_connections FOR SELECT
  USING (organization_id IS NOT NULL AND is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can insert org social_connections"
  ON public.social_connections FOR INSERT
  WITH CHECK (organization_id IS NOT NULL AND is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can update org social_connections"
  ON public.social_connections FOR UPDATE
  USING (organization_id IS NOT NULL AND is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete social_connections"
  ON public.social_connections FOR DELETE
  USING (organization_id IS NOT NULL AND is_org_admin(auth.uid(), organization_id));

-- RLS Policies for publish_attempts
CREATE POLICY "Users can view org publish_attempts"
  ON public.publish_attempts FOR SELECT
  USING (organization_id IS NOT NULL AND is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can insert org publish_attempts"
  ON public.publish_attempts FOR INSERT
  WITH CHECK (organization_id IS NOT NULL AND is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can update org publish_attempts"
  ON public.publish_attempts FOR UPDATE
  USING (organization_id IS NOT NULL AND is_org_member(auth.uid(), organization_id));

-- Trigger for updated_at
CREATE TRIGGER update_social_connections_updated_at
  BEFORE UPDATE ON public.social_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();