
-- Create hook_templates table for system hooks
CREATE TABLE public.hook_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework TEXT NOT NULL,
  name TEXT NOT NULL,
  opening_line TEXT NOT NULL,
  visual_direction TEXT,
  text_overlay TEXT,
  psychology_reason TEXT,
  engagement_level TEXT DEFAULT 'medium',
  platforms TEXT[] DEFAULT '{}',
  industries TEXT[] DEFAULT '{}',
  duration_fit TEXT[] DEFAULT '{}',
  compatible_tones TEXT[] DEFAULT '{}',
  compatible_formality TEXT[] DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create user_saved_hooks table
CREATE TABLE public.user_saved_hooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  organization_id UUID,
  hook_template_id UUID REFERENCES public.hook_templates(id) ON DELETE SET NULL,
  brand_template_id UUID REFERENCES public.brand_templates(id) ON DELETE SET NULL,
  framework TEXT NOT NULL,
  original_opening_line TEXT NOT NULL,
  customized_opening_line TEXT,
  visual_direction TEXT,
  text_overlay TEXT,
  collection_name TEXT,
  notes TEXT,
  is_favorite BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.hook_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_saved_hooks ENABLE ROW LEVEL SECURITY;

-- RLS for hook_templates (public read, admin write)
CREATE POLICY "Anyone can view active hook_templates"
  ON public.hook_templates FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage hook_templates"
  ON public.hook_templates FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS for user_saved_hooks
CREATE POLICY "Users can view own saved hooks"
  ON public.user_saved_hooks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view org saved hooks"
  ON public.user_saved_hooks FOR SELECT
  USING (organization_id IS NOT NULL AND is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can insert own saved hooks"
  ON public.user_saved_hooks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert org saved hooks"
  ON public.user_saved_hooks FOR INSERT
  WITH CHECK (organization_id IS NULL OR is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can update own saved hooks"
  ON public.user_saved_hooks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update org saved hooks"
  ON public.user_saved_hooks FOR UPDATE
  USING (organization_id IS NOT NULL AND is_org_member(auth.uid(), organization_id));

CREATE POLICY "Users can delete own saved hooks"
  ON public.user_saved_hooks FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Org admins can delete org saved hooks"
  ON public.user_saved_hooks FOR DELETE
  USING (organization_id IS NOT NULL AND is_org_admin(auth.uid(), organization_id));

-- Triggers for updated_at
CREATE TRIGGER update_hook_templates_updated_at
  BEFORE UPDATE ON public.hook_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_saved_hooks_updated_at
  BEFORE UPDATE ON public.user_saved_hooks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert 50+ hook templates
INSERT INTO public.hook_templates (framework, name, opening_line, visual_direction, text_overlay, psychology_reason, engagement_level, platforms, industries, duration_fit, compatible_tones, compatible_formality, sort_order) VALUES
-- Question Hooks
('question', 'Curiosity Gap', 'Bạn có biết vì sao 90% người thất bại trong việc này?', 'Speaker nhìn thẳng camera, vẻ mặt nghiêm túc', '90% THẤT BẠI', 'Kích thích tò mò + FOMO, người xem muốn biết lý do', 'high', ARRAY['tiktok','youtube_shorts','reels'], ARRAY['finance','education','business'], ARRAY['30s','60s'], ARRAY['professional','serious','educational'], ARRAY['formal','neutral'], 1),
('question', 'Direct Challenge', 'Bạn đang làm sai điều này mà không hề biết?', 'Close-up mặt với ánh sáng dramatic', 'SAI LẦM LỚN NHẤT', 'Tạo cảm giác không chắc chắn, muốn kiểm tra bản thân', 'high', ARRAY['tiktok','youtube_shorts','reels'], ARRAY['health','lifestyle','education'], ARRAY['30s','60s'], ARRAY['serious','direct'], ARRAY['neutral','casual'], 2),
('question', 'Secret Reveal', 'Muốn biết bí mật mà 1% người thành công không chia sẻ?', 'Speaker thì thầm, cử chỉ bí mật', 'BÍ MẬT 1%', 'Tạo cảm giác exclusive, được tiết lộ thông tin quý', 'high', ARRAY['tiktok','youtube_shorts'], ARRAY['business','finance','self-improvement'], ARRAY['60s','90s'], ARRAY['mysterious','exclusive'], ARRAY['casual','neutral'], 3),
('question', 'Pain Point', 'Bạn có đang gặp vấn đề này không?', 'Speaker chỉ vào camera', 'VẤN ĐỀ CỦA BẠN?', 'Đánh vào điểm đau, tạo sự đồng cảm', 'medium', ARRAY['tiktok','youtube_shorts','reels','facebook'], ARRAY['health','lifestyle','education'], ARRAY['30s','60s'], ARRAY['empathetic','caring'], ARRAY['casual','neutral'], 4),
('question', 'Result Promise', 'Bạn muốn đạt được [X] trong [Y] ngày?', 'Speaker với background thành công', 'KẾT QUẢ TRONG X NGÀY', 'Hứa hẹn kết quả cụ thể, rõ ràng', 'high', ARRAY['tiktok','youtube_shorts','reels'], ARRAY['fitness','education','business'], ARRAY['60s','90s'], ARRAY['motivational','confident'], ARRAY['casual','neutral'], 5),

-- Bold Statement Hooks
('bold_statement', 'Shock Stop', 'DỪNG LẠI! Đây là sai lầm lớn nhất bạn đang mắc phải', 'Speaker giơ tay ra hiệu dừng, zoom in nhanh', 'DỪNG LẠI!', 'Pattern interrupt, phá vỡ scroll hành vi', 'high', ARRAY['tiktok','youtube_shorts','reels'], ARRAY['finance','health','business'], ARRAY['30s','60s'], ARRAY['direct','urgent','serious'], ARRAY['casual','neutral'], 6),
('bold_statement', 'Myth Buster', 'Mọi thứ bạn biết về [X] đều sai!', 'Speaker với biểu cảm shocked', 'TẤT CẢ SAI!', 'Thách thức niềm tin, kích thích tranh luận', 'high', ARRAY['tiktok','youtube_shorts','reels'], ARRAY['education','health','science'], ARRAY['60s','90s'], ARRAY['provocative','confident'], ARRAY['casual','neutral'], 7),
('bold_statement', 'Unpopular Opinion', 'Ý kiến gây tranh cãi: [X] không quan trọng như bạn nghĩ', 'Speaker với vẻ mặt tự tin', 'Ý KIẾN GÂY TRANH CÃI', 'Tạo engagement qua comments và shares', 'high', ARRAY['tiktok','youtube_shorts'], ARRAY['lifestyle','business','tech'], ARRAY['60s','90s'], ARRAY['provocative','confident','opinionated'], ARRAY['casual'], 8),
('bold_statement', 'Authority Claim', 'Sau 10 năm trong ngành, đây là điều tôi học được', 'Speaker với credentials hiển thị', '10 NĂM KINH NGHIỆM', 'Thiết lập authority, tạo trust', 'medium', ARRAY['youtube_shorts','linkedin'], ARRAY['business','education','tech'], ARRAY['60s','90s'], ARRAY['professional','confident','educational'], ARRAY['formal','neutral'], 9),
('bold_statement', 'Warning', 'CẢNH BÁO: Đừng bao giờ làm điều này!', 'Red warning graphics, urgent tone', 'CẢNH BÁO!', 'Tạo urgency, FOMO về rủi ro', 'high', ARRAY['tiktok','youtube_shorts','reels'], ARRAY['finance','health','legal'], ARRAY['30s','60s'], ARRAY['urgent','serious','warning'], ARRAY['neutral','formal'], 10),

-- Transformation Hooks
('transformation', 'POV Change', 'POV: Bạn vừa phát hiện ra điều thay đổi cuộc sống', 'Transition effect, before/after', 'POV: THAY ĐỔI', 'Cho phép người xem hình dung bản thân trong tình huống', 'high', ARRAY['tiktok','reels'], ARRAY['lifestyle','self-improvement','fitness'], ARRAY['30s','60s'], ARRAY['inspirational','relatable'], ARRAY['casual'], 11),
('transformation', 'Before After', 'Từ [trạng thái A] đến [trạng thái B] - đây là cách', 'Split screen before/after', 'TRƯỚC → SAU', 'Visual proof of transformation builds trust', 'high', ARRAY['tiktok','youtube_shorts','reels'], ARRAY['fitness','beauty','business'], ARRAY['60s','90s'], ARRAY['inspirational','motivational'], ARRAY['casual','neutral'], 12),
('transformation', 'Day in Life', 'Một ngày của tôi với thói quen mới này', 'Vlog style, multiple clips', 'NGÀY CỦA TÔI', 'Relatable content, cho phép so sánh với bản thân', 'medium', ARRAY['tiktok','youtube_shorts','reels'], ARRAY['lifestyle','productivity','fitness'], ARRAY['60s','90s'], ARRAY['casual','authentic'], ARRAY['casual'], 13),
('transformation', 'What If', 'Điều gì sẽ xảy ra nếu bạn làm điều này mỗi ngày?', 'Time-lapse, progress visualization', 'NẾU MỖI NGÀY...', 'Kích thích imagination về possibilities', 'medium', ARRAY['tiktok','youtube_shorts','reels'], ARRAY['self-improvement','fitness','education'], ARRAY['60s','90s'], ARRAY['inspirational','curious'], ARRAY['casual','neutral'], 14),
('transformation', 'Glow Up', 'Glow up của tôi sau 30 ngày thực hiện', 'Dramatic reveal, slow motion', 'GLOW UP 30 NGÀY', 'Social proof + aspirational content', 'high', ARRAY['tiktok','reels'], ARRAY['beauty','fitness','lifestyle'], ARRAY['30s','60s'], ARRAY['inspirational','proud'], ARRAY['casual'], 15),

-- Story Hooks
('story', 'Personal Moment', 'Hôm nay tôi nhận ra điều này khi đang...', 'Speaker in casual setting, storytelling pose', 'CÂU CHUYỆN THẬT', 'Authenticity builds connection', 'medium', ARRAY['tiktok','youtube_shorts','reels'], ARRAY['lifestyle','business','self-improvement'], ARRAY['60s','90s'], ARRAY['authentic','relatable','casual'], ARRAY['casual'], 16),
('story', 'Unexpected Turn', 'Tôi không bao giờ nghĩ điều này sẽ xảy ra...', 'Dramatic pause, suspenseful music', 'KHÔNG NGỜ TỚI', 'Curiosity về twist ending', 'high', ARRAY['tiktok','youtube_shorts'], ARRAY['lifestyle','business'], ARRAY['60s','90s'], ARRAY['dramatic','storytelling'], ARRAY['casual'], 17),
('story', 'Failure to Success', 'Năm ngoái tôi thất bại thảm hại, nhưng...', 'Humble beginning visuals', 'THẤT BẠI → THÀNH CÔNG', 'Relatability + hope + inspiration', 'high', ARRAY['tiktok','youtube_shorts','linkedin'], ARRAY['business','self-improvement'], ARRAY['60s','90s'], ARRAY['honest','inspirational'], ARRAY['casual','neutral'], 18),
('story', 'Behind the Scenes', 'Đây là điều chưa ai biết về...', 'Exclusive access feeling', 'HẬU TRƯỜNG', 'Exclusive content appeal', 'medium', ARRAY['tiktok','youtube_shorts','reels'], ARRAY['business','entertainment','lifestyle'], ARRAY['60s','90s'], ARRAY['exclusive','authentic'], ARRAY['casual'], 19),
('story', 'Confession', 'Tôi phải thú nhận điều này...', 'Close-up, vulnerable expression', 'LỜI THÚ NHẬN', 'Vulnerability creates trust and connection', 'high', ARRAY['tiktok','youtube_shorts'], ARRAY['lifestyle','self-improvement'], ARRAY['60s','90s'], ARRAY['vulnerable','honest'], ARRAY['casual'], 20),

-- Number Hooks
('number', 'Top List', '5 điều bạn PHẢI biết về [X]', 'Countdown graphics, dynamic text', 'TOP 5', 'Clear structure, easy to follow', 'high', ARRAY['tiktok','youtube_shorts','reels','facebook'], ARRAY['education','tech','lifestyle'], ARRAY['60s','90s'], ARRAY['educational','informative'], ARRAY['neutral','casual'], 21),
('number', 'Percentage Shock', '97% người không biết điều này', 'Bold statistics on screen', '97%', 'Statistical authority + FOMO', 'high', ARRAY['tiktok','youtube_shorts','reels'], ARRAY['education','health','finance'], ARRAY['30s','60s'], ARRAY['shocking','informative'], ARRAY['neutral','formal'], 22),
('number', 'Time Frame', 'Chỉ cần 7 ngày để thay đổi hoàn toàn', 'Calendar animation, countdown', '7 NGÀY', 'Achievable timeline creates action', 'high', ARRAY['tiktok','youtube_shorts','reels'], ARRAY['fitness','self-improvement','education'], ARRAY['60s','90s'], ARRAY['motivational','promising'], ARRAY['casual','neutral'], 23),
('number', 'Money Value', 'Mẹo tiết kiệm 10 triệu/tháng mà ít người biết', 'Money visuals, savings graphics', '10 TRIỆU/THÁNG', 'Direct value proposition', 'high', ARRAY['tiktok','youtube_shorts','facebook'], ARRAY['finance','lifestyle'], ARRAY['60s','90s'], ARRAY['practical','valuable'], ARRAY['casual','neutral'], 24),
('number', 'Ranking', 'Đây là lý do #1 khiến bạn không thành công', 'Ranking visual, emphasis on #1', 'LÝ DO #1', 'Clear priority, focused attention', 'high', ARRAY['tiktok','youtube_shorts','reels'], ARRAY['business','self-improvement'], ARRAY['60s','90s'], ARRAY['direct','impactful'], ARRAY['casual','neutral'], 25),

-- Negative Hooks
('negative', 'Stop Doing', 'Ngừng làm điều này NGAY nếu bạn muốn [X]', 'X mark graphics, red warning', 'NGỪNG LÀM!', 'Loss aversion triggers action', 'high', ARRAY['tiktok','youtube_shorts','reels'], ARRAY['health','finance','lifestyle'], ARRAY['30s','60s'], ARRAY['urgent','warning'], ARRAY['neutral'], 26),
('negative', 'Mistake Alert', 'Sai lầm khiến 80% người mất tiền', 'Warning graphics, danger signs', 'SAI LẦM LỚN', 'Fear of loss + learning opportunity', 'high', ARRAY['tiktok','youtube_shorts','facebook'], ARRAY['finance','business'], ARRAY['60s','90s'], ARRAY['warning','educational'], ARRAY['neutral','formal'], 27),
('negative', 'Red Flag', '🚩 Red flag khi [situation]', 'Red flag emoji animation', '🚩 RED FLAG', 'Trendy format + protective instinct', 'high', ARRAY['tiktok','reels'], ARRAY['lifestyle','dating','business'], ARRAY['30s','60s'], ARRAY['trendy','protective'], ARRAY['casual'], 28),
('negative', 'Avoid This', 'Tránh xa [X] nếu bạn không muốn [Y]', 'Caution tape, warning visuals', 'TRÁNH XA!', 'Protective advice builds trust', 'medium', ARRAY['tiktok','youtube_shorts','reels'], ARRAY['health','finance','lifestyle'], ARRAY['60s','90s'], ARRAY['protective','caring'], ARRAY['casual','neutral'], 29),
('negative', 'Scam Alert', 'Đây là cách họ lừa bạn về [X]', 'Exposé style, investigation feel', 'CẢNH BÁO LỪA ĐẢO', 'Protective instinct + gratitude for warning', 'high', ARRAY['tiktok','youtube_shorts','facebook'], ARRAY['finance','tech','legal'], ARRAY['60s','90s'], ARRAY['protective','investigative'], ARRAY['neutral','formal'], 30),

-- Social Proof Hooks
('social_proof', 'Trending Now', 'Mọi người đang đổ xô thử cách này', 'Crowd reactions, trending graphics', 'ĐANG TREND', 'FOMO + social validation', 'high', ARRAY['tiktok','reels'], ARRAY['lifestyle','beauty','tech'], ARRAY['30s','60s'], ARRAY['trendy','excited'], ARRAY['casual'], 31),
('social_proof', 'Viral Method', 'Phương pháp viral này đã giúp 10,000 người', 'Testimonial clips, success stories', '10,000 NGƯỜI', 'Social proof + scale', 'high', ARRAY['tiktok','youtube_shorts','facebook'], ARRAY['education','health','business'], ARRAY['60s','90s'], ARRAY['proven','trustworthy'], ARRAY['neutral'], 32),
('social_proof', 'Expert Approved', 'Cách này được chuyên gia khuyên dùng', 'Expert credentials, professional setting', 'CHUYÊN GIA KHUYÊN', 'Authority + trust', 'medium', ARRAY['youtube_shorts','linkedin','facebook'], ARRAY['health','finance','education'], ARRAY['60s','90s'], ARRAY['professional','trustworthy'], ARRAY['formal','neutral'], 33),
('social_proof', 'Customer Story', 'Khách hàng của tôi đạt được điều này sau 30 ngày', 'Testimonial format, results display', 'KẾT QUẢ THỰC', 'Third-party validation', 'high', ARRAY['tiktok','youtube_shorts','facebook'], ARRAY['business','fitness','education'], ARRAY['60s','90s'], ARRAY['authentic','results-focused'], ARRAY['neutral','casual'], 34),
('social_proof', 'Community', 'Cộng đồng 50K người đã thử và thành công', 'Community visuals, group success', 'CỘNG ĐỒNG 50K', 'Belonging + proven results', 'medium', ARRAY['tiktok','youtube_shorts','facebook'], ARRAY['lifestyle','fitness','education'], ARRAY['60s','90s'], ARRAY['community','supportive'], ARRAY['casual'], 35),

-- Direct Address Hooks
('direct_address', 'Target Audience', 'Nếu bạn là [target], dừng scroll ngay!', 'Pointing at camera, direct eye contact', 'DÀNH CHO BẠN!', 'Personal relevance stops scrolling', 'high', ARRAY['tiktok','youtube_shorts','reels'], ARRAY['all'], ARRAY['30s','60s'], ARRAY['direct','personal'], ARRAY['casual'], 36),
('direct_address', 'Age Group', 'Đây là lời khuyên cho người trong độ tuổi [X]', 'Age-appropriate visuals', 'CHO TUỔI [X]', 'Specific targeting creates relevance', 'medium', ARRAY['tiktok','youtube_shorts','facebook'], ARRAY['health','finance','lifestyle'], ARRAY['60s','90s'], ARRAY['caring','targeted'], ARRAY['casual','neutral'], 37),
('direct_address', 'Problem Solver', 'Dành cho ai đang struggle với [X]', 'Empathetic expression, supportive tone', 'DÀNH CHO BẠN', 'Pain point targeting + promise of solution', 'high', ARRAY['tiktok','youtube_shorts','reels'], ARRAY['health','self-improvement','education'], ARRAY['60s','90s'], ARRAY['empathetic','helpful'], ARRAY['casual'], 38),
('direct_address', 'Industry Call', 'Attention: Tất cả mọi người trong ngành [X]!', 'Professional setting, industry visuals', 'CHÚ Ý!', 'Professional relevance + community feeling', 'medium', ARRAY['linkedin','youtube_shorts'], ARRAY['business','tech'], ARRAY['60s','90s'], ARRAY['professional','urgent'], ARRAY['formal','neutral'], 39),
('direct_address', 'Level Up', 'Nếu bạn đã sẵn sàng level up, xem tiếp', 'Ambitious visuals, progress imagery', 'SẴN SÀNG?', 'Self-selection of motivated audience', 'high', ARRAY['tiktok','youtube_shorts','reels'], ARRAY['business','self-improvement','fitness'], ARRAY['60s','90s'], ARRAY['motivational','ambitious'], ARRAY['casual','neutral'], 40),

-- Shocking Fact Hooks
('shocking_fact', 'Hidden Truth', 'Sự thật bị che giấu về [X] mà bạn cần biết', 'Conspiracy-style reveal, dramatic lighting', 'SỰ THẬT BỊ CHE GIẤU', 'Exclusive knowledge appeal', 'high', ARRAY['tiktok','youtube_shorts'], ARRAY['health','finance','science'], ARRAY['60s','90s'], ARRAY['investigative','shocking'], ARRAY['casual','neutral'], 41),
('shocking_fact', 'Industry Secret', 'Người trong ngành không muốn bạn biết điều này', 'Insider perspective, confidential feeling', 'BÍ MẬT NGÀNH', 'Insider knowledge + distrust of establishment', 'high', ARRAY['tiktok','youtube_shorts','facebook'], ARRAY['business','finance','health'], ARRAY['60s','90s'], ARRAY['insider','revealing'], ARRAY['casual','neutral'], 42),
('shocking_fact', 'Science Says', 'Khoa học vừa chứng minh điều này về [X]', 'Research graphics, scientific visuals', 'KHOA HỌC CHỨNG MINH', 'Scientific authority + novelty', 'high', ARRAY['tiktok','youtube_shorts','linkedin'], ARRAY['health','science','education'], ARRAY['60s','90s'], ARRAY['scientific','credible'], ARRAY['neutral','formal'], 43),
('shocking_fact', 'Statistics Reveal', 'Con số gây sốc: [X]% người [action]', 'Data visualization, infographic style', 'SỐ LIỆU GÂY SỐC', 'Data-driven credibility + surprise', 'high', ARRAY['tiktok','youtube_shorts','linkedin'], ARRAY['business','health','education'], ARRAY['60s','90s'], ARRAY['data-driven','shocking'], ARRAY['neutral','formal'], 44),
('shocking_fact', 'Comparison Shock', 'Sự khác biệt giữa [A] và [B] sẽ khiến bạn sốc', 'Split screen comparison', 'SỰ KHÁC BIỆT', 'Comparison creates clarity + surprise', 'medium', ARRAY['tiktok','youtube_shorts','reels'], ARRAY['education','tech','lifestyle'], ARRAY['60s','90s'], ARRAY['comparative','educational'], ARRAY['casual','neutral'], 45),

-- Challenge Hooks
('challenge', 'Time Challenge', 'Thử làm điều này trong 7 ngày - kết quả sẽ khiến bạn ngạc nhiên', 'Challenge graphics, countdown timer', 'THỬ THÁCH 7 NGÀY', 'Gamification + achievable goal', 'high', ARRAY['tiktok','youtube_shorts','reels'], ARRAY['fitness','self-improvement','lifestyle'], ARRAY['60s','90s'], ARRAY['challenging','motivational'], ARRAY['casual'], 46),
('challenge', 'Dare You', 'Dám thử không? 99% người không làm được điều này', 'Provocative challenge, competitive feel', 'DÁM THỬ?', 'Competitive instinct + ego challenge', 'high', ARRAY['tiktok','reels'], ARRAY['fitness','lifestyle'], ARRAY['30s','60s'], ARRAY['competitive','provocative'], ARRAY['casual'], 47),
('challenge', 'Test Yourself', 'Kiểm tra xem bạn có thuộc 1% không', 'Quiz-style, interactive feel', 'KIỂM TRA', 'Self-assessment appeal + competitive', 'high', ARRAY['tiktok','youtube_shorts','reels'], ARRAY['education','psychology','lifestyle'], ARRAY['60s','90s'], ARRAY['interactive','curious'], ARRAY['casual'], 48),
('challenge', 'Join Movement', 'Tham gia cùng 100K người đang thực hiện thử thách này', 'Community challenge, group participation', 'THAM GIA', 'Social belonging + FOMO', 'high', ARRAY['tiktok','reels'], ARRAY['fitness','lifestyle','social'], ARRAY['30s','60s'], ARRAY['community','energetic'], ARRAY['casual'], 49),
('challenge', 'Prove It', 'Hãy chứng minh tôi sai - hầu hết mọi người không thể', 'Confident challenge, debate-style', 'CHỨNG MINH TÔI SAI', 'Ego challenge + engagement driver', 'high', ARRAY['tiktok','youtube_shorts'], ARRAY['business','education','debate'], ARRAY['60s','90s'], ARRAY['confident','provocative'], ARRAY['casual'], 50),

-- Bonus: Vietnamese-specific hooks
('local', 'Việt Nam Trend', 'Trend đang hot nhất Việt Nam tuần này', 'Vietnamese context, local imagery', 'TREND VN', 'Local relevance + FOMO', 'high', ARRAY['tiktok','reels','facebook'], ARRAY['lifestyle','entertainment'], ARRAY['30s','60s'], ARRAY['trendy','local'], ARRAY['casual'], 51),
('local', 'Tết Special', 'Bí kíp [X] cho mùa Tết năm nay', 'Tết decorations, festive mood', 'TẾT NÀY', 'Seasonal relevance + cultural connection', 'high', ARRAY['tiktok','facebook','youtube_shorts'], ARRAY['lifestyle','food','family'], ARRAY['60s','90s'], ARRAY['festive','warm'], ARRAY['casual'], 52),
('local', 'Gen Z Việt', 'Gen Z Việt đang làm điều này mà không ai để ý', 'Youth culture visuals', 'GEN Z VIỆT', 'Generational identity + insider feeling', 'high', ARRAY['tiktok','reels'], ARRAY['lifestyle','tech','education'], ARRAY['30s','60s'], ARRAY['trendy','youthful'], ARRAY['casual'], 53);
