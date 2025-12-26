-- Create curated_events table for seasonal/industry events
CREATE TABLE public.curated_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  end_date DATE,
  event_type TEXT NOT NULL DEFAULT 'holiday',
  country_code TEXT DEFAULT 'VN',
  industries TEXT[] DEFAULT '{}',
  suggested_topics TEXT[] DEFAULT '{}',
  suggested_angles TEXT[] DEFAULT '{}',
  priority INTEGER DEFAULT 3,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create curated_news table for industry news
CREATE TABLE public.curated_news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  summary TEXT,
  source_url TEXT,
  news_date DATE DEFAULT CURRENT_DATE,
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '7 days'),
  industries TEXT[] DEFAULT '{}',
  relevance_score INTEGER DEFAULT 50,
  suggested_angles TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.curated_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curated_news ENABLE ROW LEVEL SECURITY;

-- RLS Policies for curated_events
CREATE POLICY "Admins can manage all curated_events"
ON public.curated_events FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Org admins can manage org curated_events"
ON public.curated_events FOR ALL
USING (organization_id IS NOT NULL AND is_org_admin(auth.uid(), organization_id))
WITH CHECK (organization_id IS NOT NULL AND is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org members can view org curated_events"
ON public.curated_events FOR SELECT
USING (
  (organization_id IS NULL AND is_active = true) OR 
  (organization_id IS NOT NULL AND is_org_member(auth.uid(), organization_id))
);

-- RLS Policies for curated_news
CREATE POLICY "Admins can manage all curated_news"
ON public.curated_news FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Org admins can manage org curated_news"
ON public.curated_news FOR ALL
USING (organization_id IS NOT NULL AND is_org_admin(auth.uid(), organization_id))
WITH CHECK (organization_id IS NOT NULL AND is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org members can view org curated_news"
ON public.curated_news FOR SELECT
USING (
  (organization_id IS NULL AND is_active = true) OR 
  (organization_id IS NOT NULL AND is_org_member(auth.uid(), organization_id))
);

-- Create indexes
CREATE INDEX idx_curated_events_date ON public.curated_events(event_date);
CREATE INDEX idx_curated_events_org ON public.curated_events(organization_id);
CREATE INDEX idx_curated_news_expires ON public.curated_news(expires_at);
CREATE INDEX idx_curated_news_org ON public.curated_news(organization_id);

-- Add updated_at trigger for curated_events
CREATE TRIGGER update_curated_events_updated_at
BEFORE UPDATE ON public.curated_events
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_updated_at();

-- Seed data: Vietnamese events for 2025
INSERT INTO public.curated_events (name, description, event_date, end_date, event_type, industries, suggested_topics, suggested_angles, priority) VALUES
('Tết Nguyên Đán 2025', 'Năm Ất Tỵ - Tết cổ truyền Việt Nam', '2025-01-29', '2025-02-02', 'holiday', '{}', 
  ARRAY['Khuyến mãi Tết', 'Quà tặng Tết', 'Lời chúc năm mới', 'Review sản phẩm Tết'],
  ARRAY['Tri ân khách hàng cuối năm', 'Checklist mua sắm Tết', 'Trend Tết 2025'], 5),

('Valentine 2025', 'Ngày lễ tình nhân', '2025-02-14', NULL, 'holiday', '{}',
  ARRAY['Quà Valentine', 'Date ideas', 'Self-love content'],
  ARRAY['Quà tặng theo budget', 'Valentine cho người độc thân', 'Couple goals'], 4),

('Quốc tế Phụ nữ 8/3', 'Ngày Quốc tế Phụ nữ', '2025-03-08', NULL, 'holiday', '{}',
  ARRAY['Quà 8/3', 'Tribute phụ nữ', 'Women empowerment'],
  ARRAY['Câu chuyện phụ nữ thành công', 'Self-care tips', 'Tri ân khách hàng nữ'], 5),

('Giỗ Tổ Hùng Vương', 'Ngày Giỗ Tổ Hùng Vương - 10/3 Âm lịch', '2025-04-07', NULL, 'holiday', '{}',
  ARRAY['Văn hóa Việt', 'Du lịch Phú Thọ', 'Truyền thống dân tộc'],
  ARRAY['Nhìn lại lịch sử', 'Sản phẩm mang đậm bản sắc Việt'], 3),

('Giải phóng miền Nam 30/4', 'Ngày Giải phóng miền Nam, thống nhất đất nước', '2025-04-30', NULL, 'holiday', '{}',
  ARRAY['Lịch sử Việt Nam', 'Du lịch trong nước', 'Kỳ nghỉ lễ'],
  ARRAY['Ưu đãi nghỉ lễ', 'Kế hoạch du lịch 30/4-1/5'], 4),

('Quốc tế Lao động 1/5', 'Ngày Quốc tế Lao động', '2025-05-01', NULL, 'holiday', '{}',
  ARRAY['Tri ân người lao động', 'Work-life balance', 'Career tips'],
  ARRAY['Chăm sóc sức khỏe người lao động', 'Cân bằng công việc'], 3),

('Ngày của Mẹ', 'Mother''s Day', '2025-05-11', NULL, 'holiday', '{}',
  ARRAY['Quà tặng mẹ', 'Tribute mẹ', 'Family content'],
  ARRAY['Những điều con muốn nói', 'Quà tặng ý nghĩa cho mẹ'], 4),

('Ngày của Cha', 'Father''s Day', '2025-06-15', NULL, 'holiday', '{}',
  ARRAY['Quà tặng cha', 'Tribute cha', 'Family bonding'],
  ARRAY['Món quà ý nghĩa cho cha', 'Hoạt động gia đình'], 3),

('Quốc khánh 2/9', 'Ngày Quốc khánh Việt Nam', '2025-09-02', NULL, 'holiday', '{}',
  ARRAY['Tự hào Việt Nam', 'Du lịch nghỉ lễ', 'Văn hóa dân tộc'],
  ARRAY['Ưu đãi mừng Quốc khánh', 'Sản phẩm Việt Nam'], 4),

('Trung Thu 2025', 'Tết Trung Thu - Rằm tháng 8 Âm lịch', '2025-10-06', NULL, 'holiday', '{}',
  ARRAY['Bánh Trung Thu', 'Quà tặng Trung Thu', 'Family content', 'Đèn lồng'],
  ARRAY['Trung Thu cho doanh nghiệp', 'Quà tặng khách hàng'], 4),

('Ngày Phụ nữ Việt Nam 20/10', 'Ngày Phụ nữ Việt Nam', '2025-10-20', NULL, 'holiday', '{}',
  ARRAY['Quà 20/10', 'Tribute phụ nữ Việt', 'Beauty content'],
  ARRAY['Tri ân khách hàng nữ', 'Câu chuyện phụ nữ Việt'], 5),

('Halloween', 'Lễ hội Halloween', '2025-10-31', NULL, 'holiday', '{}',
  ARRAY['Halloween party', 'Costume ideas', 'Spooky content'],
  ARRAY['Ưu đãi Halloween', 'Content viral theo trend'], 3),

('Singles Day 11/11', 'Ngày Độc thân - Đại hội mua sắm', '2025-11-11', NULL, 'campaign', '{}',
  ARRAY['Flash sale', 'Deal sốc', 'Self-treat'],
  ARRAY['Săn deal 11/11', 'Tự thưởng bản thân'], 5),

('Black Friday', 'Ngày hội mua sắm Black Friday', '2025-11-28', NULL, 'campaign', '{}',
  ARRAY['Giảm giá Black Friday', 'Deal hot', 'Shopping guide'],
  ARRAY['Checklist Black Friday', 'So sánh giá các sàn'], 5),

('Giáng Sinh', 'Lễ Giáng Sinh - Christmas', '2025-12-25', NULL, 'holiday', '{}',
  ARRAY['Quà Giáng Sinh', 'Decor Noel', 'Year-end content'],
  ARRAY['Gift guide theo budget', 'Ý tưởng tiệc Giáng Sinh'], 5),

('Tất Niên 2025', 'Tổng kết năm - Year End', '2025-12-31', NULL, 'campaign', '{}',
  ARRAY['Year in review', 'Thank you customers', 'New year goals'],
  ARRAY['Tổng kết thành tựu', 'Tri ân khách hàng cuối năm'], 5);