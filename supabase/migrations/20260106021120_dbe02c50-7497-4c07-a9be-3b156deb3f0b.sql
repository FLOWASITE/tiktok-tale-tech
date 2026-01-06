-- A/B Test configuration table
CREATE TABLE public.ad_copy_ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  ad_copy_id UUID REFERENCES public.ad_copies(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  hypothesis TEXT,
  test_variable TEXT NOT NULL DEFAULT 'full_copy', -- 'headline' | 'primary_text' | 'cta' | 'full_copy'
  variation_ids UUID[] NOT NULL,
  winner_variation_id UUID REFERENCES public.ad_copy_variations(id) ON DELETE SET NULL,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  status TEXT DEFAULT 'draft', -- 'draft' | 'running' | 'paused' | 'completed'
  metrics_to_track TEXT[] DEFAULT '{"ctr", "conversions"}',
  confidence_threshold NUMERIC DEFAULT 95,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- A/B Test Results table
CREATE TABLE public.ad_copy_ab_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ab_test_id UUID REFERENCES public.ad_copy_ab_tests(id) ON DELETE CASCADE NOT NULL,
  variation_id UUID REFERENCES public.ad_copy_variations(id) ON DELETE CASCADE NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  spend NUMERIC(12,2) DEFAULT 0,
  ctr NUMERIC(8,4) GENERATED ALWAYS AS (
    CASE WHEN impressions > 0 THEN clicks::NUMERIC / impressions * 100 ELSE 0 END
  ) STORED,
  conversion_rate NUMERIC(8,4) GENERATED ALWAYS AS (
    CASE WHEN clicks > 0 THEN conversions::NUMERIC / clicks * 100 ELSE 0 END
  ) STORED,
  cpc NUMERIC(10,2) GENERATED ALWAYS AS (
    CASE WHEN clicks > 0 THEN spend / clicks ELSE 0 END
  ) STORED,
  logged_at DATE NOT NULL DEFAULT CURRENT_DATE,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(ab_test_id, variation_id, logged_at)
);

-- Enable RLS
ALTER TABLE public.ad_copy_ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_copy_ab_results ENABLE ROW LEVEL SECURITY;

-- RLS policies for ab_tests
CREATE POLICY "Users can view their org ab tests"
  ON public.ad_copy_ab_tests FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create ab tests in their org"
  ON public.ad_copy_ab_tests FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update their org ab tests"
  ON public.ad_copy_ab_tests FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their org ab tests"
  ON public.ad_copy_ab_tests FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

-- RLS policies for ab_results
CREATE POLICY "Users can view ab results for their org tests"
  ON public.ad_copy_ab_results FOR SELECT
  USING (ab_test_id IN (
    SELECT id FROM public.ad_copy_ab_tests WHERE organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can insert ab results for their org tests"
  ON public.ad_copy_ab_results FOR INSERT
  WITH CHECK (ab_test_id IN (
    SELECT id FROM public.ad_copy_ab_tests WHERE organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can update ab results for their org tests"
  ON public.ad_copy_ab_results FOR UPDATE
  USING (ab_test_id IN (
    SELECT id FROM public.ad_copy_ab_tests WHERE organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can delete ab results for their org tests"
  ON public.ad_copy_ab_results FOR DELETE
  USING (ab_test_id IN (
    SELECT id FROM public.ad_copy_ab_tests WHERE organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  ));

-- Indexes
CREATE INDEX idx_ab_tests_ad_copy ON public.ad_copy_ab_tests(ad_copy_id);
CREATE INDEX idx_ab_tests_org ON public.ad_copy_ab_tests(organization_id);
CREATE INDEX idx_ab_results_test ON public.ad_copy_ab_results(ab_test_id);
CREATE INDEX idx_ab_results_variation ON public.ad_copy_ab_results(variation_id);