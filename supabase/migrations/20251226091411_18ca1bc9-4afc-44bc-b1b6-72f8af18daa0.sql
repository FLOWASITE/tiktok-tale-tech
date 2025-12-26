-- Create trending_topics table to cache trending data
CREATE TABLE public.trending_topics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  brand_template_id UUID REFERENCES public.brand_templates(id) ON DELETE SET NULL,
  topic TEXT NOT NULL,
  category TEXT,
  velocity_score INTEGER DEFAULT 50, -- 0-100, how fast it's growing
  peak_status TEXT DEFAULT 'rising', -- rising, peaking, declining
  peak_prediction TEXT, -- e.g. "2 days", "this week"
  source TEXT DEFAULT 'ai', -- ai, manual, imported
  related_keywords TEXT[] DEFAULT '{}',
  engagement_potential INTEGER DEFAULT 50, -- 0-100
  competition_level TEXT DEFAULT 'medium', -- low, medium, high
  suggested_angles TEXT[] DEFAULT '{}',
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '24 hours'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_trending_topics_org ON public.trending_topics(organization_id);
CREATE INDEX idx_trending_topics_expires ON public.trending_topics(expires_at);
CREATE INDEX idx_trending_topics_velocity ON public.trending_topics(velocity_score DESC);

-- Enable RLS
ALTER TABLE public.trending_topics ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view org trending_topics"
ON public.trending_topics FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can insert org trending_topics"
ON public.trending_topics FOR INSERT
WITH CHECK (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can update org trending_topics"
ON public.trending_topics FOR UPDATE
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete trending_topics"
ON public.trending_topics FOR DELETE
USING (is_org_admin(auth.uid(), organization_id));

-- Create function to update timestamps
CREATE TRIGGER update_trending_topics_updated_at
BEFORE UPDATE ON public.trending_topics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();