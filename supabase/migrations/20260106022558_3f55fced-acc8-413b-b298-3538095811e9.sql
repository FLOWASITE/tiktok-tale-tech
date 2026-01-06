-- Create ad_copy_performance table for tracking ad metrics
CREATE TABLE public.ad_copy_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_copy_id UUID REFERENCES public.ad_copies(id) ON DELETE CASCADE NOT NULL,
  variation_id UUID REFERENCES public.ad_copy_variations(id) ON DELETE CASCADE,
  logged_at DATE NOT NULL,
  
  -- Core metrics
  impressions INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  
  -- Engagement
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  
  -- Conversion
  leads INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  conversion_value NUMERIC(12,2) DEFAULT 0,
  
  -- Cost
  spend NUMERIC(12,2) DEFAULT 0,
  
  -- Calculated fields (stored for query performance)
  ctr NUMERIC(8,4) DEFAULT 0,
  cpc NUMERIC(10,2) DEFAULT 0,
  cpm NUMERIC(10,2) DEFAULT 0,
  conversion_rate NUMERIC(8,4) DEFAULT 0,
  roas NUMERIC(10,2) DEFAULT 0,
  engagement_rate NUMERIC(8,4) DEFAULT 0,
  
  -- Metadata
  data_source TEXT DEFAULT 'manual',
  external_ad_id TEXT,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(ad_copy_id, variation_id, logged_at)
);

-- Indexes for performance
CREATE INDEX idx_ad_copy_performance_ad_copy ON public.ad_copy_performance(ad_copy_id);
CREATE INDEX idx_ad_copy_performance_logged_at ON public.ad_copy_performance(logged_at);
CREATE INDEX idx_ad_copy_performance_variation ON public.ad_copy_performance(variation_id);

-- Enable RLS
ALTER TABLE public.ad_copy_performance ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view performance for their org ad copies" ON public.ad_copy_performance
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.ad_copies ac
      JOIN public.organization_members om ON om.organization_id = ac.organization_id
      WHERE ac.id = ad_copy_performance.ad_copy_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert performance for their org ad copies" ON public.ad_copy_performance
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ad_copies ac
      JOIN public.organization_members om ON om.organization_id = ac.organization_id
      WHERE ac.id = ad_copy_performance.ad_copy_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update performance for their org ad copies" ON public.ad_copy_performance
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.ad_copies ac
      JOIN public.organization_members om ON om.organization_id = ac.organization_id
      WHERE ac.id = ad_copy_performance.ad_copy_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete performance for their org ad copies" ON public.ad_copy_performance
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.ad_copies ac
      JOIN public.organization_members om ON om.organization_id = ac.organization_id
      WHERE ac.id = ad_copy_performance.ad_copy_id
        AND om.user_id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_ad_copy_performance_updated_at
  BEFORE UPDATE ON public.ad_copy_performance
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();