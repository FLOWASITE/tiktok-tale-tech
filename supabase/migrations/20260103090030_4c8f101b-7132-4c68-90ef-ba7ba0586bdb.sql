-- Create table for storing image generation history per channel
CREATE TABLE public.channel_image_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES public.multi_channel_contents(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  image_url TEXT NOT NULL,
  prompt TEXT,
  aspect_ratio TEXT,
  is_selected BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  organization_id UUID REFERENCES public.organizations(id)
);

-- Index for quick lookup by content and channel
CREATE INDEX idx_image_history_content_channel ON public.channel_image_history(content_id, channel);
CREATE INDEX idx_image_history_org ON public.channel_image_history(organization_id);

-- Enable RLS
ALTER TABLE public.channel_image_history ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their org's image history"
ON public.channel_image_history FOR SELECT
USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can create image history in their org"
ON public.channel_image_history FOR INSERT
WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can update their org's image history"
ON public.channel_image_history FOR UPDATE
USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can delete their org's image history"
ON public.channel_image_history FOR DELETE
USING (public.is_org_member(auth.uid(), organization_id));