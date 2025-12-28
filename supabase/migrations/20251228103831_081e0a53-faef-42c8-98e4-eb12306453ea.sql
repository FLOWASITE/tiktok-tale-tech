-- Add new columns to brand_templates for enhanced brand information

-- Brand Identity & Story
ALTER TABLE brand_templates ADD COLUMN IF NOT EXISTS mission TEXT;
ALTER TABLE brand_templates ADD COLUMN IF NOT EXISTS vision TEXT;
ALTER TABLE brand_templates ADD COLUMN IF NOT EXISTS unique_value_proposition TEXT;
ALTER TABLE brand_templates ADD COLUMN IF NOT EXISTS tagline TEXT;

-- Target Market
ALTER TABLE brand_templates ADD COLUMN IF NOT EXISTS target_age_range TEXT;
ALTER TABLE brand_templates ADD COLUMN IF NOT EXISTS target_gender TEXT;
ALTER TABLE brand_templates ADD COLUMN IF NOT EXISTS market_segment TEXT;
ALTER TABLE brand_templates ADD COLUMN IF NOT EXISTS target_locations TEXT[] DEFAULT '{}';

-- Content Strategy
ALTER TABLE brand_templates ADD COLUMN IF NOT EXISTS brand_hashtags TEXT[] DEFAULT '{}';
ALTER TABLE brand_templates ADD COLUMN IF NOT EXISTS signature_phrases TEXT[] DEFAULT '{}';
ALTER TABLE brand_templates ADD COLUMN IF NOT EXISTS cta_templates TEXT[] DEFAULT '{}';
ALTER TABLE brand_templates ADD COLUMN IF NOT EXISTS evergreen_themes TEXT[] DEFAULT '{}';

-- Brand Assets
ALTER TABLE brand_templates ADD COLUMN IF NOT EXISTS secondary_colors TEXT[] DEFAULT '{}';
ALTER TABLE brand_templates ADD COLUMN IF NOT EXISTS image_style TEXT;

-- Competitor Analysis
ALTER TABLE brand_templates ADD COLUMN IF NOT EXISTS main_competitors TEXT[] DEFAULT '{}';
ALTER TABLE brand_templates ADD COLUMN IF NOT EXISTS competitive_advantages TEXT[] DEFAULT '{}';