-- Phase 4: Meta Ads API Integration

-- 1. Expand social_connections for Meta Ads
ALTER TABLE public.social_connections
  ADD COLUMN IF NOT EXISTS ad_account_id TEXT,
  ADD COLUMN IF NOT EXISTS ad_account_name TEXT,
  ADD COLUMN IF NOT EXISTS business_id TEXT,
  ADD COLUMN IF NOT EXISTS app_id TEXT,
  ADD COLUMN IF NOT EXISTS connection_type TEXT DEFAULT 'social';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_social_connections_type 
  ON public.social_connections(connection_type);

CREATE INDEX IF NOT EXISTS idx_social_connections_org_type 
  ON public.social_connections(organization_id, connection_type);

-- 2. Create ad_sync_configs table
CREATE TABLE IF NOT EXISTS public.ad_sync_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_copy_id UUID NOT NULL REFERENCES public.ad_copies(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES public.social_connections(id) ON DELETE SET NULL,
  
  -- External ad info
  external_ad_id TEXT NOT NULL,
  external_campaign_id TEXT,
  external_adset_id TEXT,
  external_ad_name TEXT,
  
  -- Sync settings
  sync_enabled BOOLEAN DEFAULT true,
  sync_frequency TEXT DEFAULT 'daily' CHECK (sync_frequency IN ('hourly', 'daily', 'manual')),
  last_synced_at TIMESTAMPTZ,
  next_sync_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'syncing', 'success', 'error')),
  last_error TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(ad_copy_id, external_ad_id)
);

-- Enable RLS
ALTER TABLE public.ad_sync_configs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ad_sync_configs
CREATE POLICY "Users can view their org's sync configs"
  ON public.ad_sync_configs FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can create sync configs in their org"
  ON public.ad_sync_configs FOR INSERT
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can update their org's sync configs"
  ON public.ad_sync_configs FOR UPDATE
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can delete their org's sync configs"
  ON public.ad_sync_configs FOR DELETE
  USING (public.is_org_member(auth.uid(), organization_id));

-- Indexes for ad_sync_configs
CREATE INDEX idx_ad_sync_configs_ad_copy ON public.ad_sync_configs(ad_copy_id);
CREATE INDEX idx_ad_sync_configs_org ON public.ad_sync_configs(organization_id);
CREATE INDEX idx_ad_sync_configs_enabled ON public.ad_sync_configs(sync_enabled, sync_status);
CREATE INDEX idx_ad_sync_configs_next_sync ON public.ad_sync_configs(next_sync_at) WHERE sync_enabled = true;

-- 3. Add columns to ad_copy_performance
ALTER TABLE public.ad_copy_performance
  ADD COLUMN IF NOT EXISTS sync_config_id UUID REFERENCES public.ad_sync_configs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS raw_api_response JSONB;

-- Index for sync_config_id
CREATE INDEX IF NOT EXISTS idx_ad_copy_performance_sync_config 
  ON public.ad_copy_performance(sync_config_id);

-- 4. Trigger for updated_at on ad_sync_configs
CREATE TRIGGER update_ad_sync_configs_updated_at
  BEFORE UPDATE ON public.ad_sync_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

-- 5. Function to calculate next sync time
CREATE OR REPLACE FUNCTION public.calculate_next_sync_at(frequency TEXT)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  CASE frequency
    WHEN 'hourly' THEN RETURN now() + INTERVAL '1 hour';
    WHEN 'daily' THEN RETURN now() + INTERVAL '1 day';
    ELSE RETURN NULL;
  END CASE;
END;
$$;