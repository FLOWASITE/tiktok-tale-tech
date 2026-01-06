-- Add campaign_id to ad_copies table
ALTER TABLE public.ad_copies
ADD COLUMN campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX idx_ad_copies_campaign ON public.ad_copies(campaign_id);