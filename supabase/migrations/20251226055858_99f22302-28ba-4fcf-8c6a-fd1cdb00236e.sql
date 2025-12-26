-- Create table to track topic-to-content relationships
-- One topic can be used to create multiple contents (multichannel, script, carousel)
CREATE TABLE public.topic_content_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic_history_id UUID NOT NULL REFERENCES public.topic_history(id) ON DELETE CASCADE,
  content_id UUID NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('multichannel', 'script', 'carousel')),
  content_title TEXT,
  content_status TEXT DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  organization_id UUID REFERENCES public.organizations(id),
  user_id UUID
);

-- Enable RLS
ALTER TABLE public.topic_content_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies for viewing
CREATE POLICY "Users can view own topic_content_links"
ON public.topic_content_links
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can view org topic_content_links"
ON public.topic_content_links
FOR SELECT
USING (organization_id IS NOT NULL AND is_org_member(auth.uid(), organization_id));

-- RLS Policies for inserting
CREATE POLICY "Users can insert own topic_content_links"
ON public.topic_content_links
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert org topic_content_links"
ON public.topic_content_links
FOR INSERT
WITH CHECK (organization_id IS NULL OR is_org_member(auth.uid(), organization_id));

-- RLS Policies for updating
CREATE POLICY "Users can update own topic_content_links"
ON public.topic_content_links
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can update org topic_content_links"
ON public.topic_content_links
FOR UPDATE
USING (organization_id IS NOT NULL AND is_org_member(auth.uid(), organization_id));

-- RLS Policies for deleting
CREATE POLICY "Users can delete own topic_content_links"
ON public.topic_content_links
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Org admins can delete org topic_content_links"
ON public.topic_content_links
FOR DELETE
USING (organization_id IS NOT NULL AND is_org_admin(auth.uid(), organization_id));

-- Indexes for performance
CREATE INDEX idx_topic_content_links_topic ON public.topic_content_links(topic_history_id);
CREATE INDEX idx_topic_content_links_content ON public.topic_content_links(content_id, content_type);
CREATE INDEX idx_topic_content_links_org ON public.topic_content_links(organization_id);
CREATE INDEX idx_topic_content_links_user ON public.topic_content_links(user_id);