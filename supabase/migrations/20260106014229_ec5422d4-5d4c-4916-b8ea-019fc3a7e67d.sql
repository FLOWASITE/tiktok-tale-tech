-- Create ENUMs for Ad Copy system
CREATE TYPE ad_platform AS ENUM ('meta_feed', 'meta_story', 'meta_reels', 'google_rsa', 'google_display', 'tiktok', 'zalo', 'linkedin');
CREATE TYPE ad_objective AS ENUM ('traffic', 'conversions', 'engagement', 'awareness', 'leads', 'app_installs', 'video_views', 'messages');
CREATE TYPE ad_funnel_stage AS ENUM ('awareness', 'consideration', 'conversion', 'retention');

-- Main ad_copies table
CREATE TABLE ad_copies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  platform ad_platform NOT NULL DEFAULT 'meta_feed',
  objective ad_objective NOT NULL DEFAULT 'traffic',
  landing_url TEXT,
  brand_template_id UUID REFERENCES brand_templates(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'published')),
  audience_brief TEXT,
  product_id UUID REFERENCES brand_products(id) ON DELETE SET NULL,
  persona_id UUID REFERENCES customer_personas(id) ON DELETE SET NULL,
  funnel_stage ad_funnel_stage DEFAULT 'awareness',
  industry_template_id UUID REFERENCES industry_templates(id) ON DELETE SET NULL,
  industry_template_version TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ad copy variations table
CREATE TABLE ad_copy_variations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_copy_id UUID REFERENCES ad_copies(id) ON DELETE CASCADE NOT NULL,
  variation_label TEXT NOT NULL DEFAULT 'A',
  -- Meta Ads fields
  primary_text TEXT,
  headline TEXT,
  description TEXT,
  cta_button TEXT DEFAULT 'learn_more',
  -- Google RSA fields  
  headlines JSONB DEFAULT '[]',
  descriptions JSONB DEFAULT '[]',
  -- Common fields
  char_counts JSONB DEFAULT '{}',
  policy_warnings JSONB DEFAULT '[]',
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(ad_copy_id, variation_label)
);

-- Enable RLS
ALTER TABLE ad_copies ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_copy_variations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ad_copies
CREATE POLICY "Users can read own org ad_copies" ON ad_copies
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert ad_copies" ON ad_copies
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own org ad_copies" ON ad_copies
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own org ad_copies" ON ad_copies
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for ad_copy_variations
CREATE POLICY "Users can manage variations of own ad_copies" ON ad_copy_variations
  FOR ALL USING (
    ad_copy_id IN (
      SELECT id FROM ad_copies WHERE organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
      )
    )
  );

-- Indexes
CREATE INDEX idx_ad_copies_org ON ad_copies(organization_id);
CREATE INDEX idx_ad_copies_user ON ad_copies(user_id);
CREATE INDEX idx_ad_copies_platform ON ad_copies(platform);
CREATE INDEX idx_ad_copies_status ON ad_copies(status);
CREATE INDEX idx_ad_copy_variations_ad ON ad_copy_variations(ad_copy_id);

-- Updated at trigger
CREATE TRIGGER set_ad_copies_updated_at
  BEFORE UPDATE ON ad_copies
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();