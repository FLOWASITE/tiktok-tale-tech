-- Phase 3: AI Prediction & Optimization

-- 1. Bảng lưu creative scores cho mỗi variation
CREATE TABLE public.ad_copy_creative_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variation_id UUID NOT NULL REFERENCES public.ad_copy_variations(id) ON DELETE CASCADE,
  
  -- Overall score
  overall_score INTEGER CHECK (overall_score BETWEEN 0 AND 100),
  grade TEXT CHECK (grade IN ('A+', 'A', 'B', 'C', 'D', 'F')),
  
  -- Component scores (0-100)
  headline_score INTEGER CHECK (headline_score BETWEEN 0 AND 100),
  primary_text_score INTEGER CHECK (primary_text_score BETWEEN 0 AND 100),
  cta_score INTEGER CHECK (cta_score BETWEEN 0 AND 100),
  emotional_appeal_score INTEGER CHECK (emotional_appeal_score BETWEEN 0 AND 100),
  clarity_score INTEGER CHECK (clarity_score BETWEEN 0 AND 100),
  urgency_score INTEGER CHECK (urgency_score BETWEEN 0 AND 100),
  relevance_score INTEGER CHECK (relevance_score BETWEEN 0 AND 100),
  
  -- Detailed breakdown (JSON)
  score_breakdown JSONB,
  
  -- AI Analysis
  strengths TEXT[],
  weaknesses TEXT[],
  optimization_priority TEXT,
  
  -- Metadata
  model_version TEXT DEFAULT 'v1',
  scored_at TIMESTAMPTZ DEFAULT now(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE
);

-- 2. Bảng lưu prediction history để tracking accuracy
CREATE TABLE public.ad_copy_prediction_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variation_id UUID NOT NULL REFERENCES public.ad_copy_variations(id) ON DELETE CASCADE,
  
  -- Predicted values
  predicted_ctr NUMERIC,
  predicted_cpc NUMERIC,
  predicted_cpm NUMERIC,
  predicted_conversion_rate NUMERIC,
  predicted_roas NUMERIC,
  confidence_score INTEGER CHECK (confidence_score BETWEEN 0 AND 100),
  
  -- Actual values (filled in later from performance data)
  actual_ctr NUMERIC,
  actual_cpc NUMERIC,
  actual_cpm NUMERIC,
  actual_conversion_rate NUMERIC,
  actual_roas NUMERIC,
  
  -- Accuracy metrics
  accuracy_score NUMERIC,
  
  -- Metadata
  prediction_factors JSONB,
  predicted_at TIMESTAMPTZ DEFAULT now(),
  validated_at TIMESTAMPTZ,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE
);

-- 3. Bảng AI optimization suggestions
CREATE TABLE public.ad_copy_optimization_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variation_id UUID NOT NULL REFERENCES public.ad_copy_variations(id) ON DELETE CASCADE,
  
  -- Suggestion details
  field TEXT NOT NULL CHECK (field IN ('headline', 'primary_text', 'description', 'cta')),
  original_text TEXT,
  suggested_text TEXT NOT NULL,
  
  -- Impact prediction
  predicted_improvement NUMERIC,
  improvement_metric TEXT,
  confidence TEXT CHECK (confidence IN ('low', 'medium', 'high')),
  
  -- Reasoning
  reason TEXT NOT NULL,
  technique TEXT,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'dismissed', 'tested')),
  applied_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.ad_copy_creative_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_copy_prediction_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_copy_optimization_suggestions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ad_copy_creative_scores
CREATE POLICY "Users can view creative scores in their organization"
ON public.ad_copy_creative_scores FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert creative scores in their organization"
ON public.ad_copy_creative_scores FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update creative scores in their organization"
ON public.ad_copy_creative_scores FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete creative scores in their organization"
ON public.ad_copy_creative_scores FOR DELETE
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  )
);

-- RLS Policies for ad_copy_prediction_history
CREATE POLICY "Users can view prediction history in their organization"
ON public.ad_copy_prediction_history FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert prediction history in their organization"
ON public.ad_copy_prediction_history FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update prediction history in their organization"
ON public.ad_copy_prediction_history FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  )
);

-- RLS Policies for ad_copy_optimization_suggestions
CREATE POLICY "Users can view optimization suggestions in their organization"
ON public.ad_copy_optimization_suggestions FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert optimization suggestions in their organization"
ON public.ad_copy_optimization_suggestions FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update optimization suggestions in their organization"
ON public.ad_copy_optimization_suggestions FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete optimization suggestions in their organization"
ON public.ad_copy_optimization_suggestions FOR DELETE
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  )
);

-- Indexes
CREATE INDEX idx_creative_scores_variation ON public.ad_copy_creative_scores(variation_id);
CREATE INDEX idx_creative_scores_org ON public.ad_copy_creative_scores(organization_id);
CREATE INDEX idx_prediction_history_variation ON public.ad_copy_prediction_history(variation_id);
CREATE INDEX idx_prediction_history_org ON public.ad_copy_prediction_history(organization_id);
CREATE INDEX idx_optimization_suggestions_variation ON public.ad_copy_optimization_suggestions(variation_id);
CREATE INDEX idx_optimization_suggestions_status ON public.ad_copy_optimization_suggestions(status);
CREATE INDEX idx_optimization_suggestions_org ON public.ad_copy_optimization_suggestions(organization_id);

-- Seed comprehensive Vietnam market benchmarks
INSERT INTO public.ad_copy_benchmarks (platform, industry, objective, avg_ctr, avg_cpc, avg_cpm, avg_conversion_rate, avg_roas, sample_count, data_source) VALUES
-- Facebook Feed
('facebook_feed', 'e-commerce', 'conversions', 1.2, 3500, 28000, 2.5, 4.2, 5000, 'vietnam_market_2025'),
('facebook_feed', 'e-commerce', 'traffic', 1.5, 2800, 22000, 1.8, 3.5, 4500, 'vietnam_market_2025'),
('facebook_feed', 'education', 'lead_generation', 0.9, 5000, 35000, 3.2, NULL, 2000, 'vietnam_market_2025'),
('facebook_feed', 'education', 'conversions', 0.8, 6000, 40000, 2.0, 3.0, 1800, 'vietnam_market_2025'),
('facebook_feed', 'finance', 'traffic', 0.7, 8000, 42000, 1.8, 3.5, 1500, 'vietnam_market_2025'),
('facebook_feed', 'finance', 'lead_generation', 0.6, 12000, 55000, 2.5, NULL, 1200, 'vietnam_market_2025'),
('facebook_feed', 'healthcare', 'awareness', 1.0, 4500, 32000, 1.5, 2.8, 2500, 'vietnam_market_2025'),
('facebook_feed', 'real_estate', 'lead_generation', 0.5, 15000, 60000, 1.2, NULL, 1000, 'vietnam_market_2025'),
('facebook_feed', 'beauty', 'conversions', 1.4, 3000, 25000, 3.0, 4.5, 4000, 'vietnam_market_2025'),
('facebook_feed', 'fashion', 'conversions', 1.3, 3200, 26000, 2.8, 4.0, 3800, 'vietnam_market_2025'),
('facebook_feed', 'food_beverage', 'awareness', 1.6, 2500, 20000, 2.0, 3.2, 3500, 'vietnam_market_2025'),
('facebook_feed', 'technology', 'traffic', 0.9, 5500, 38000, 1.5, 3.8, 2200, 'vietnam_market_2025'),

-- Facebook Stories
('facebook_stories', 'e-commerce', 'conversions', 1.0, 4000, 30000, 2.2, 3.8, 3000, 'vietnam_market_2025'),
('facebook_stories', 'beauty', 'awareness', 1.3, 3500, 27000, 1.8, 3.5, 2500, 'vietnam_market_2025'),
('facebook_stories', 'fashion', 'traffic', 1.2, 3800, 28000, 2.0, 3.6, 2800, 'vietnam_market_2025'),

-- Instagram Feed
('instagram_feed', 'e-commerce', 'conversions', 1.1, 3800, 30000, 2.3, 4.0, 4000, 'vietnam_market_2025'),
('instagram_feed', 'beauty', 'conversions', 1.5, 3200, 26000, 3.2, 4.8, 3500, 'vietnam_market_2025'),
('instagram_feed', 'fashion', 'conversions', 1.4, 3400, 27000, 3.0, 4.5, 3200, 'vietnam_market_2025'),
('instagram_feed', 'food_beverage', 'awareness', 1.8, 2800, 22000, 2.2, 3.5, 2800, 'vietnam_market_2025'),
('instagram_feed', 'lifestyle', 'traffic', 1.6, 3000, 24000, 1.8, 3.2, 2600, 'vietnam_market_2025'),

-- Instagram Stories/Reels
('instagram_reels', 'beauty', 'awareness', 2.0, 2500, 20000, 2.5, 4.0, 3000, 'vietnam_market_2025'),
('instagram_reels', 'fashion', 'traffic', 1.8, 2800, 22000, 2.2, 3.8, 2800, 'vietnam_market_2025'),
('instagram_reels', 'e-commerce', 'conversions', 1.5, 3500, 28000, 2.8, 4.2, 2500, 'vietnam_market_2025'),

-- Google RSA
('google_rsa', 'e-commerce', 'conversions', 3.5, 4500, NULL, 4.0, 5.5, 8000, 'vietnam_market_2025'),
('google_rsa', 'e-commerce', 'traffic', 4.0, 3800, NULL, 3.5, 5.0, 7500, 'vietnam_market_2025'),
('google_rsa', 'education', 'lead_generation', 3.0, 6000, NULL, 3.8, NULL, 3000, 'vietnam_market_2025'),
('google_rsa', 'finance', 'lead_generation', 2.5, 10000, NULL, 2.0, NULL, 2000, 'vietnam_market_2025'),
('google_rsa', 'healthcare', 'traffic', 3.2, 5500, NULL, 2.5, 4.0, 2500, 'vietnam_market_2025'),
('google_rsa', 'real_estate', 'lead_generation', 2.8, 15000, NULL, 1.2, NULL, 1200, 'vietnam_market_2025'),
('google_rsa', 'technology', 'conversions', 3.0, 7000, NULL, 3.0, 4.5, 2800, 'vietnam_market_2025'),
('google_rsa', 'legal', 'lead_generation', 2.2, 20000, NULL, 1.5, NULL, 800, 'vietnam_market_2025'),

-- TikTok
('tiktok', 'beauty', 'traffic', 2.0, 2000, 18000, 1.5, 3.0, 3000, 'vietnam_market_2025'),
('tiktok', 'beauty', 'conversions', 1.8, 2500, 20000, 2.0, 3.5, 2800, 'vietnam_market_2025'),
('tiktok', 'fashion', 'conversions', 1.8, 2500, 22000, 2.0, 3.8, 4000, 'vietnam_market_2025'),
('tiktok', 'fashion', 'awareness', 2.2, 1800, 16000, 1.5, 3.0, 3500, 'vietnam_market_2025'),
('tiktok', 'e-commerce', 'conversions', 1.5, 3000, 25000, 2.2, 4.0, 5000, 'vietnam_market_2025'),
('tiktok', 'food_beverage', 'awareness', 2.5, 1500, 14000, 1.2, 2.5, 3200, 'vietnam_market_2025'),
('tiktok', 'entertainment', 'traffic', 3.0, 1200, 12000, 1.0, 2.0, 4000, 'vietnam_market_2025'),
('tiktok', 'education', 'lead_generation', 1.2, 4000, 30000, 2.5, NULL, 1500, 'vietnam_market_2025'),

-- Zalo OA
('zalo_oa', NULL, 'messages', 1.5, 3000, 25000, NULL, NULL, 2500, 'vietnam_market_2025'),
('zalo_oa', 'e-commerce', 'conversions', 1.2, 3500, 28000, 2.0, 3.5, 2000, 'vietnam_market_2025'),
('zalo_oa', 'retail', 'traffic', 1.4, 2800, 22000, 1.5, 3.0, 1800, 'vietnam_market_2025'),
('zalo_oa', 'finance', 'lead_generation', 0.8, 6000, 40000, 1.8, NULL, 1200, 'vietnam_market_2025'),

-- YouTube
('youtube', 'e-commerce', 'awareness', 0.8, 5000, 35000, 1.0, 3.0, 3000, 'vietnam_market_2025'),
('youtube', 'technology', 'traffic', 1.0, 4500, 32000, 1.2, 3.5, 2500, 'vietnam_market_2025'),
('youtube', 'education', 'lead_generation', 0.7, 6500, 40000, 2.0, NULL, 2000, 'vietnam_market_2025'),
('youtube', 'entertainment', 'awareness', 1.5, 3000, 25000, 0.8, 2.0, 3500, 'vietnam_market_2025'),

-- LinkedIn
('linkedin', 'b2b', 'lead_generation', 0.5, 25000, 80000, 2.5, NULL, 800, 'vietnam_market_2025'),
('linkedin', 'technology', 'traffic', 0.6, 20000, 70000, 1.8, NULL, 1000, 'vietnam_market_2025'),
('linkedin', 'education', 'awareness', 0.7, 18000, 65000, 1.5, NULL, 900, 'vietnam_market_2025'),
('linkedin', 'finance', 'lead_generation', 0.4, 30000, 90000, 2.0, NULL, 600, 'vietnam_market_2025')
ON CONFLICT DO NOTHING;