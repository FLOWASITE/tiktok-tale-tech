-- =============================================
-- Industry Park v2.1 - Phase 1: Database Schema
-- =============================================

-- 1. Bảng lưu rules chung toàn cầu (global base)
CREATE TABLE industry_global_packs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    industry_code VARCHAR(50) UNIQUE NOT NULL,
    category_id UUID REFERENCES industry_categories(id),
    target_audience VARCHAR(10) DEFAULT 'both',
    global_brand_voice JSONB DEFAULT '{}',
    global_terminology JSONB DEFAULT '{"forbidden_terms_global":[],"preferred_terms":{},"forbidden_words_by_lang":{}}',
    global_compliance_rules JSONB DEFAULT '[]',
    global_claim_restrictions JSONB DEFAULT '[]',
    global_argument_patterns JSONB DEFAULT '{"valid_patterns":[],"forbidden_patterns":[]}',
    global_system_rules JSONB DEFAULT '[]',
    risk_guidelines JSONB DEFAULT '{"high_risk_keywords":[],"scoring_weights":{},"risk_thresholds":{}}',
    related_industries TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    version TEXT DEFAULT '1.0',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Bảng lưu resolved profiles đã merge cho từng jurisdiction
CREATE TABLE industry_jurisdiction_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    global_pack_id UUID REFERENCES industry_global_packs(id) ON DELETE CASCADE,
    jurisdiction_code VARCHAR(10) NOT NULL,
    resolved_rules JSONB NOT NULL DEFAULT '{}',
    validity_status VARCHAR(20) DEFAULT 'current',
    last_verified_date DATE,
    disclaimer TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(global_pack_id, jurisdiction_code)
);

-- 3. Bảng translations - Source of truth cho đa ngôn ngữ
CREATE TABLE industry_pack_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    global_pack_id UUID REFERENCES industry_global_packs(id) ON DELETE CASCADE,
    language_code VARCHAR(10) NOT NULL,
    name TEXT NOT NULL,
    short_name TEXT,
    preferred_terms TEXT[] DEFAULT '{}',
    forbidden_terms TEXT[] DEFAULT '{}',
    glossary JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(global_pack_id, language_code)
);

-- 4. Thêm columns vào brand_templates cho v2.1 linking
ALTER TABLE brand_templates 
ADD COLUMN IF NOT EXISTS global_pack_id UUID REFERENCES industry_global_packs(id),
ADD COLUMN IF NOT EXISTS jurisdiction_code VARCHAR(10) DEFAULT 'VN';

-- 5. Tạo indexes cho performance
CREATE INDEX idx_global_packs_code ON industry_global_packs(industry_code);
CREATE INDEX idx_global_packs_category ON industry_global_packs(category_id);
CREATE INDEX idx_global_packs_active ON industry_global_packs(is_active) WHERE is_active = true;

CREATE INDEX idx_jurisdiction_profiles_code ON industry_jurisdiction_profiles(jurisdiction_code);
CREATE INDEX idx_jurisdiction_profiles_global_pack ON industry_jurisdiction_profiles(global_pack_id);
CREATE INDEX idx_jurisdiction_profiles_status ON industry_jurisdiction_profiles(validity_status);
CREATE INDEX idx_resolved_rules_gin ON industry_jurisdiction_profiles USING GIN(resolved_rules);

CREATE INDEX idx_pack_translations_lang ON industry_pack_translations(language_code);
CREATE INDEX idx_pack_translations_global_pack ON industry_pack_translations(global_pack_id);

CREATE INDEX idx_brand_templates_global_pack ON brand_templates(global_pack_id);
CREATE INDEX idx_brand_templates_jurisdiction ON brand_templates(jurisdiction_code);

-- 6. Enable RLS
ALTER TABLE industry_global_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE industry_jurisdiction_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE industry_pack_translations ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies - Read access cho authenticated users
CREATE POLICY "Allow read access to global packs"
ON industry_global_packs FOR SELECT
TO authenticated
USING (is_active = true);

CREATE POLICY "Allow admin full access to global packs"
ON industry_global_packs FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

CREATE POLICY "Allow read access to jurisdiction profiles"
ON industry_jurisdiction_profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow admin full access to jurisdiction profiles"
ON industry_jurisdiction_profiles FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

CREATE POLICY "Allow read access to pack translations"
ON industry_pack_translations FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow admin full access to pack translations"
ON industry_pack_translations FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- 8. Trigger update updated_at
CREATE OR REPLACE FUNCTION update_industry_v2_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_global_packs_updated_at
    BEFORE UPDATE ON industry_global_packs
    FOR EACH ROW
    EXECUTE FUNCTION update_industry_v2_updated_at();

CREATE TRIGGER trigger_jurisdiction_profiles_updated_at
    BEFORE UPDATE ON industry_jurisdiction_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_industry_v2_updated_at();

CREATE TRIGGER trigger_pack_translations_updated_at
    BEFORE UPDATE ON industry_pack_translations
    FOR EACH ROW
    EXECUTE FUNCTION update_industry_v2_updated_at();