-- Create ad_copy_benchmarks table for performance prediction
CREATE TABLE public.ad_copy_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  industry TEXT,
  objective TEXT,
  
  -- Benchmark metrics
  avg_ctr NUMERIC(8,4),
  avg_cpc NUMERIC(12,2),
  avg_cpm NUMERIC(12,2),
  avg_conversion_rate NUMERIC(8,4),
  avg_roas NUMERIC(10,2),
  
  -- Sample size
  sample_count INTEGER DEFAULT 0,
  
  -- Metadata
  period_start DATE,
  period_end DATE,
  data_source TEXT DEFAULT 'internal',
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(platform, industry, objective)
);

-- Enable RLS
ALTER TABLE public.ad_copy_benchmarks ENABLE ROW LEVEL SECURITY;

-- Create policy for read access (benchmarks are public reference data)
CREATE POLICY "Benchmarks are readable by authenticated users"
ON public.ad_copy_benchmarks
FOR SELECT
TO authenticated
USING (true);

-- Seed with industry benchmarks (VND currency)
INSERT INTO public.ad_copy_benchmarks (platform, industry, objective, avg_ctr, avg_cpc, avg_cpm, avg_conversion_rate, avg_roas, sample_count, data_source) VALUES
  ('meta_feed', 'ecommerce', 'conversions', 1.20, 5000, 45000, 2.50, 4.20, 1000, 'industry_report'),
  ('meta_feed', 'education', 'leads', 0.90, 8000, 35000, 3.20, 3.50, 800, 'industry_report'),
  ('meta_feed', 'beauty', 'awareness', 1.50, 4000, 40000, 1.80, 3.80, 950, 'industry_report'),
  ('meta_feed', 'retail', 'traffic', 1.10, 4500, 38000, 2.00, 3.60, 1200, 'industry_report'),
  ('meta_story', 'ecommerce', 'conversions', 1.40, 4200, 42000, 2.80, 4.50, 850, 'industry_report'),
  ('meta_story', 'beauty', 'awareness', 1.80, 3500, 35000, 2.00, 4.00, 700, 'industry_report'),
  ('meta_reels', 'beauty', 'awareness', 2.20, 3000, 30000, 1.50, 3.50, 600, 'industry_report'),
  ('meta_reels', 'ecommerce', 'conversions', 1.80, 3800, 38000, 2.20, 4.00, 750, 'industry_report'),
  ('google_rsa', 'ecommerce', 'traffic', 3.50, 3000, 25000, 3.50, 5.00, 1500, 'industry_report'),
  ('google_rsa', 'education', 'leads', 2.80, 6000, 32000, 4.00, 4.50, 900, 'industry_report'),
  ('google_rsa', 'services', 'conversions', 2.50, 5500, 28000, 3.80, 4.80, 1100, 'industry_report'),
  ('google_display', 'ecommerce', 'awareness', 0.50, 2000, 15000, 0.80, 2.50, 2000, 'industry_report'),
  ('tiktok', 'beauty', 'awareness', 2.00, 2000, 15000, 1.20, 3.20, 500, 'industry_report'),
  ('tiktok', 'ecommerce', 'conversions', 1.60, 2500, 18000, 1.80, 3.80, 650, 'industry_report'),
  ('tiktok', 'entertainment', 'awareness', 2.50, 1500, 12000, 0.80, 2.80, 400, 'industry_report'),
  ('zalo_oa', 'retail', 'messages', 1.50, 4000, 30000, 3.00, 4.00, 600, 'industry_report'),
  ('zalo_oa', 'ecommerce', 'traffic', 1.30, 3500, 28000, 2.50, 3.80, 550, 'industry_report'),
  ('zalo_message', 'retail', 'conversions', 2.00, 3000, 25000, 4.50, 5.50, 450, 'industry_report'),
  ('zalo_message', 'services', 'leads', 1.80, 3200, 27000, 4.00, 5.00, 400, 'industry_report'),
  ('zalo_article', 'education', 'traffic', 1.20, 2500, 22000, 2.00, 3.00, 350, 'industry_report'),
  ('linkedin', 'b2b', 'leads', 0.45, 25000, 85000, 2.50, 3.50, 300, 'industry_report'),
  ('linkedin', 'education', 'awareness', 0.35, 20000, 75000, 1.50, 2.80, 250, 'industry_report');