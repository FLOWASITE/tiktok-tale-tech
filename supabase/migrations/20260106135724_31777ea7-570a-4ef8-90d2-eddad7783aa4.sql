-- =====================================================
-- PHASE 1: CREATIVE INTELLIGENCE
-- Tables: ad_swipe_files, marketing_calendar, competitor_profiles
-- =====================================================

-- 1. Swipe File Library
CREATE TABLE public.ad_swipe_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Source info
  source_type TEXT NOT NULL CHECK (source_type IN ('manual', 'competitor', 'internal', 'meta_library')),
  source_url TEXT,
  competitor_name TEXT,
  
  -- Platform & Category
  platform TEXT NOT NULL,
  industry TEXT,
  objective TEXT,
  
  -- Creative content
  screenshot_url TEXT,
  video_url TEXT,
  primary_text TEXT,
  headline TEXT,
  description TEXT,
  cta_button TEXT,
  
  -- Quality & Organization
  performance_tier TEXT CHECK (performance_tier IN ('A', 'B', 'C')),
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  is_favorite BOOLEAN DEFAULT false,
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for ad_swipe_files
ALTER TABLE public.ad_swipe_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view swipe files in their org"
  ON public.ad_swipe_files FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert swipe files in their org"
  ON public.ad_swipe_files FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update swipe files in their org"
  ON public.ad_swipe_files FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete swipe files in their org"
  ON public.ad_swipe_files FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

-- Indexes
CREATE INDEX idx_swipe_files_org ON public.ad_swipe_files(organization_id);
CREATE INDEX idx_swipe_files_platform ON public.ad_swipe_files(platform);
CREATE INDEX idx_swipe_files_tags ON public.ad_swipe_files USING GIN(tags);

-- Trigger for updated_at
CREATE TRIGGER update_swipe_files_updated_at
  BEFORE UPDATE ON public.ad_swipe_files
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

-- 2. Marketing Calendar
CREATE TABLE public.marketing_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Event info
  event_name TEXT NOT NULL,
  event_name_vi TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN ('holiday', 'shopping', 'industry', 'trending')),
  
  -- Date range
  start_date DATE NOT NULL,
  end_date DATE,
  
  -- Targeting
  country_code TEXT DEFAULT 'VN',
  industries TEXT[] DEFAULT '{}',
  
  -- Suggestions
  suggested_themes TEXT[] DEFAULT '{}',
  suggested_keywords TEXT[] DEFAULT '{}',
  urgency_level INTEGER DEFAULT 1 CHECK (urgency_level BETWEEN 1 AND 5),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for marketing_calendar (public read, admin write)
ALTER TABLE public.marketing_calendar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read marketing calendar"
  ON public.marketing_calendar FOR SELECT
  USING (is_active = true);

-- Pre-populate Vietnam events for 2025
INSERT INTO public.marketing_calendar (event_name, event_name_vi, event_type, start_date, end_date, suggested_themes, urgency_level) VALUES
('Tet Nguyen Dan', 'Tết Nguyên Đán', 'holiday', '2025-01-29', '2025-02-04', ARRAY['Tết sum vầy', 'Năm mới an khang', 'Lộc đầu năm', 'Xuân về'], 5),
('Valentine Day', 'Valentine', 'holiday', '2025-02-14', '2025-02-14', ARRAY['Yêu thương', 'Quà tặng người thương', 'Romantic', 'For Your Love'], 4),
('International Womens Day', 'Quốc tế Phụ nữ 8/3', 'holiday', '2025-03-08', '2025-03-08', ARRAY['Tôn vinh phái đẹp', 'Quà tặng 8/3', 'For Her', 'Tri ân phụ nữ'], 4),
('Reunification Day', 'Giải phóng miền Nam 30/4', 'holiday', '2025-04-30', '2025-04-30', ARRAY['Đại lễ 30/4', 'Nghỉ lễ dài ngày'], 3),
('Labour Day', 'Quốc tế Lao động 1/5', 'holiday', '2025-05-01', '2025-05-01', ARRAY['Nghỉ lễ', 'Du lịch lễ'], 3),
('Childrens Day', 'Quốc tế Thiếu nhi 1/6', 'holiday', '2025-06-01', '2025-06-01', ARRAY['Quà cho bé', 'Vui cùng con', 'For Kids'], 3),
('Back to School', 'Mùa tựu trường', 'industry', '2025-08-15', '2025-09-05', ARRAY['Sẵn sàng năm học mới', 'Tựu trường', 'Back to School Sale'], 4),
('National Day', 'Quốc khánh 2/9', 'holiday', '2025-09-02', '2025-09-02', ARRAY['Mừng Quốc khánh', 'Đại lễ 2/9'], 3),
('Mid Autumn Festival', 'Tết Trung Thu', 'holiday', '2025-10-06', '2025-10-06', ARRAY['Đêm hội trăng rằm', 'Bánh trung thu', 'Vui Tết Trung Thu'], 4),
('Vietnam Womens Day', 'Phụ nữ Việt Nam 20/10', 'holiday', '2025-10-20', '2025-10-20', ARRAY['Tôn vinh người phụ nữ', 'Tri ân phái đẹp', 'Quà 20/10'], 4),
('Singles Day 11.11', 'Ngày độc thân 11/11', 'shopping', '2025-11-11', '2025-11-11', ARRAY['Sale khủng 11.11', 'Siêu sale', 'Flash sale', 'Biggest Sale'], 5),
('Vietnamese Teachers Day', 'Ngày Nhà giáo 20/11', 'holiday', '2025-11-20', '2025-11-20', ARRAY['Tri ân thầy cô', 'Quà 20/11', 'Tôn sư trọng đạo'], 3),
('Black Friday', 'Black Friday', 'shopping', '2025-11-28', '2025-11-28', ARRAY['Giảm giá sốc', 'Deal hot', 'Limited offer', 'Biggest Discount'], 5),
('Double 12', 'Siêu sale 12.12', 'shopping', '2025-12-12', '2025-12-12', ARRAY['Cuối năm sale lớn', 'Last chance', '12.12 Mega Sale'], 5),
('Christmas', 'Giáng Sinh', 'holiday', '2025-12-24', '2025-12-25', ARRAY['Merry Christmas', 'Quà Noel', 'Holiday spirit', 'Giáng sinh an lành'], 4),
('Year End Sale', 'Sale cuối năm', 'shopping', '2025-12-26', '2025-12-31', ARRAY['Dọn kho cuối năm', 'Last sale of year', 'Year End Clearance'], 4);

-- 3. Competitor Profiles
CREATE TABLE public.competitor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Basic info
  competitor_name TEXT NOT NULL,
  website_url TEXT,
  industry TEXT,
  notes TEXT,
  
  -- Social handles (for future expansion)
  facebook_page_id TEXT,
  instagram_handle TEXT,
  tiktok_handle TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for competitor_profiles
ALTER TABLE public.competitor_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view competitors in their org"
  ON public.competitor_profiles FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can manage competitors in their org"
  ON public.competitor_profiles FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

-- Indexes
CREATE INDEX idx_competitor_profiles_org ON public.competitor_profiles(organization_id);

-- Trigger for updated_at
CREATE TRIGGER update_competitor_profiles_updated_at
  BEFORE UPDATE ON public.competitor_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();