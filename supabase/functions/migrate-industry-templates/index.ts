import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Industry templates data from BrandTemplateSelector.tsx
const INDUSTRY_TEMPLATES = {
  // === NHÓM TÀI CHÍNH ===
  'Tài chính & Kế toán': {
    code: 'accounting',
    category: 'finance',
    target_audience: 'B2B',
    short_name: 'Tài chính & Kế toán',
    brand_positioning: 'Đối tác tài chính đáng tin cậy, mang đến sự an tâm và minh bạch cho doanh nghiệp',
    tone_of_voice: ['professional', 'authoritative', 'empathetic'],
    formality_level: 'formal',
    language_style: ['simple', 'direct'],
    allow_emoji: false,
    preferred_words: ['đảm bảo', 'chính xác', 'uy tín', 'minh bạch', 'tối ưu', 'chuyên nghiệp'],
    forbidden_words: ['siêu', 'khủng', 'cực kỳ', 'hot', 'sốc'],
  },
  'Ngân hàng & Tín dụng': {
    code: 'banking',
    category: 'finance',
    target_audience: 'both',
    short_name: 'Ngân hàng',
    brand_positioning: 'Đối tác tài chính vững chắc, đồng hành phát triển bền vững cùng khách hàng',
    tone_of_voice: ['professional', 'authoritative', 'empathetic'],
    formality_level: 'formal',
    language_style: ['simple', 'direct'],
    allow_emoji: false,
    preferred_words: ['an toàn', 'lãi suất ưu đãi', 'tiện lợi', 'bảo mật', 'hỗ trợ 24/7', 'uy tín'],
    forbidden_words: ['rủi ro', 'nợ xấu', 'lừa đảo', 'siêu lợi nhuận'],
  },
  'Bảo hiểm': {
    code: 'insurance',
    category: 'finance',
    target_audience: 'both',
    short_name: 'Bảo hiểm',
    brand_positioning: 'Bảo vệ toàn diện, an tâm cho mọi giai đoạn cuộc sống',
    tone_of_voice: ['professional', 'empathetic', 'authoritative'],
    formality_level: 'formal',
    language_style: ['simple', 'emotional'],
    allow_emoji: false,
    preferred_words: ['bảo vệ', 'an tâm', 'chi trả nhanh', 'toàn diện', 'đồng hành', 'tin cậy'],
    forbidden_words: ['rủi ro cao', 'tai nạn', 'chết', 'siêu rẻ'],
  },
  'Crypto & Fintech': {
    code: 'crypto_fintech',
    category: 'finance',
    target_audience: 'both',
    short_name: 'Crypto & Fintech',
    brand_positioning: 'Công nghệ tài chính tiên phong, đầu tư thông minh cho tương lai',
    tone_of_voice: ['professional', 'educational', 'inspirational'],
    formality_level: 'semi_formal',
    language_style: ['technical', 'data_driven'],
    allow_emoji: false,
    preferred_words: ['blockchain', 'phi tập trung', 'minh bạch', 'bảo mật', 'tối ưu', 'đổi mới'],
    forbidden_words: ['làm giàu nhanh', 'cam kết lợi nhuận', 'không rủi ro', 'x100'],
  },

  // === NHÓM CÔNG NGHỆ ===
  'Công nghệ thông tin': {
    code: 'it',
    category: 'technology',
    target_audience: 'B2B',
    short_name: 'Công nghệ',
    brand_positioning: 'Đổi mới công nghệ, tối ưu hóa quy trình, tăng tốc chuyển đổi số',
    tone_of_voice: ['professional', 'inspirational', 'educational'],
    formality_level: 'semi_formal',
    language_style: ['technical', 'direct'],
    allow_emoji: false,
    preferred_words: ['giải pháp', 'tối ưu', 'hiệu quả', 'đổi mới', 'tự động hóa', 'thông minh'],
    forbidden_words: ['cổ điển', 'thủ công'],
  },
  'Viễn thông': {
    code: 'telecom',
    category: 'technology',
    target_audience: 'both',
    short_name: 'Viễn thông',
    brand_positioning: 'Kết nối không giới hạn, công nghệ tiên phong, phủ sóng mọi nơi',
    tone_of_voice: ['professional', 'inspirational', 'friendly'],
    formality_level: 'semi_formal',
    language_style: ['simple', 'direct'],
    allow_emoji: false,
    preferred_words: ['tốc độ cao', 'phủ sóng rộng', 'ổn định', 'không giới hạn', '5G', 'kết nối'],
    forbidden_words: ['chậm', 'mất sóng', 'đắt'],
  },
  'Game & Giải trí số': {
    code: 'gaming',
    category: 'technology',
    target_audience: 'B2C',
    short_name: 'Game & Giải trí',
    brand_positioning: 'Trải nghiệm giải trí đỉnh cao, thế giới ảo không giới hạn',
    tone_of_voice: ['playful', 'inspirational', 'friendly'],
    formality_level: 'casual',
    language_style: ['storytelling', 'emotional'],
    allow_emoji: true,
    preferred_words: ['đỉnh cao', 'huyền thoại', 'chiến thắng', 'level up', 'exclusive', 'siêu phẩm'],
    forbidden_words: ['nhàm chán', 'lag', 'hack'],
  },
  'Startup & Khởi nghiệp': {
    code: 'startup',
    category: 'technology',
    target_audience: 'B2B',
    short_name: 'Startup',
    brand_positioning: 'Đồng hành startup, từ ý tưởng đến thành công vươn tầm',
    tone_of_voice: ['inspirational', 'conversational', 'playful'],
    formality_level: 'casual',
    language_style: ['storytelling', 'emotional'],
    allow_emoji: true,
    preferred_words: ['đột phá', 'tăng trưởng', 'scale', 'MVP', 'pivot', 'disrupt', 'hustle'],
    forbidden_words: ['thất bại', 'rủi ro', 'cháy tiền'],
  },

  // === NHÓM BÁN HÀNG ===
  'Thương mại điện tử': {
    code: 'ecommerce',
    category: 'commerce',
    target_audience: 'B2C',
    short_name: 'E-commerce',
    brand_positioning: 'Mua sắm thông minh, tiện lợi với sản phẩm chất lượng và dịch vụ tận tâm',
    tone_of_voice: ['friendly', 'conversational', 'playful'],
    formality_level: 'casual',
    language_style: ['simple', 'direct'],
    allow_emoji: true,
    preferred_words: ['ưu đãi', 'chính hãng', 'miễn phí', 'nhanh chóng', 'tiết kiệm', 'chất lượng'],
    forbidden_words: ['đắt', 'chờ lâu'],
  },
  'Bán lẻ': {
    code: 'retail',
    category: 'commerce',
    target_audience: 'B2C',
    short_name: 'Bán lẻ',
    brand_positioning: 'Mua sắm tiện lợi, sản phẩm đa dạng, giá cạnh tranh cho mọi khách hàng',
    tone_of_voice: ['friendly', 'conversational', 'playful'],
    formality_level: 'casual',
    language_style: ['simple', 'direct'],
    allow_emoji: true,
    preferred_words: ['khuyến mãi', 'tiết kiệm', 'đa dạng', 'tiện lợi', 'chính hãng', 'ưu đãi'],
    forbidden_words: ['đắt đỏ', 'khan hiếm', 'hết hàng'],
  },
  'Nhập khẩu & Xuất khẩu': {
    code: 'import_export',
    category: 'commerce',
    target_audience: 'B2B',
    short_name: 'Xuất nhập khẩu',
    brand_positioning: 'Cầu nối thương mại quốc tế, logistics toàn cầu, thủ tục nhanh gọn',
    tone_of_voice: ['professional', 'authoritative', 'educational'],
    formality_level: 'formal',
    language_style: ['technical', 'data_driven'],
    allow_emoji: false,
    preferred_words: ['FOB', 'CIF', 'thông quan', 'container', 'chứng nhận', 'hải quan'],
    forbidden_words: ['chậm trễ', 'rủi ro', 'phạt'],
  },

  // === NHÓM DỊCH VỤ ===
  'Y tế & Sức khỏe': {
    code: 'healthcare',
    category: 'services',
    target_audience: 'both',
    short_name: 'Y tế',
    brand_positioning: 'Chăm sóc sức khỏe toàn diện với sự tận tâm và chuyên môn cao',
    tone_of_voice: ['professional', 'empathetic', 'authoritative'],
    formality_level: 'formal',
    language_style: ['simple', 'direct'],
    allow_emoji: false,
    preferred_words: ['an toàn', 'chăm sóc', 'tận tâm', 'chuyên môn', 'tin cậy', 'hiệu quả'],
    forbidden_words: ['rẻ', 'nhanh chóng', 'dễ dàng'],
  },
  'Giáo dục & Đào tạo': {
    code: 'education',
    category: 'services',
    target_audience: 'both',
    short_name: 'Giáo dục',
    brand_positioning: 'Đồng hành phát triển năng lực, khai phá tiềm năng mỗi cá nhân',
    tone_of_voice: ['educational', 'inspirational', 'empathetic'],
    formality_level: 'semi_formal',
    language_style: ['simple', 'storytelling'],
    allow_emoji: true,
    preferred_words: ['học hỏi', 'phát triển', 'tiến bộ', 'thành công', 'kiến thức', 'kỹ năng'],
    forbidden_words: ['thất bại', 'khó khăn'],
  },
  'Luật & Pháp lý': {
    code: 'legal',
    category: 'services',
    target_audience: 'B2B',
    short_name: 'Pháp lý',
    brand_positioning: 'Bảo vệ quyền lợi khách hàng với sự chuyên nghiệp và tận tâm',
    tone_of_voice: ['professional', 'authoritative', 'empathetic'],
    formality_level: 'formal',
    language_style: ['technical', 'direct'],
    allow_emoji: false,
    preferred_words: ['bảo vệ', 'pháp lý', 'quyền lợi', 'chuyên môn', 'tư vấn', 'hỗ trợ'],
    forbidden_words: ['dễ dàng', 'nhanh chóng', 'rẻ'],
  },
  'Tư vấn & Dịch vụ chuyên nghiệp': {
    code: 'consulting',
    category: 'services',
    target_audience: 'B2B',
    short_name: 'Tư vấn',
    brand_positioning: 'Đối tác chiến lược, giải pháp tối ưu cho doanh nghiệp vươn xa',
    tone_of_voice: ['professional', 'authoritative', 'educational'],
    formality_level: 'formal',
    language_style: ['technical', 'data_driven'],
    allow_emoji: false,
    preferred_words: ['chiến lược', 'tối ưu hóa', 'ROI', 'KPI', 'insight', 'tư vấn'],
    forbidden_words: ['dễ dàng', 'miễn phí', 'nhanh chóng'],
  },
  'HR & Tuyển dụng': {
    code: 'hr',
    category: 'services',
    target_audience: 'B2B',
    short_name: 'HR & Tuyển dụng',
    brand_positioning: 'Kết nối nhân tài với cơ hội, xây dựng đội ngũ xuất sắc',
    tone_of_voice: ['professional', 'empathetic', 'friendly'],
    formality_level: 'semi_formal',
    language_style: ['simple', 'emotional'],
    allow_emoji: true,
    preferred_words: ['cơ hội', 'phát triển', 'đội ngũ', 'văn hóa', 'đãi ngộ', 'thăng tiến'],
    forbidden_words: ['áp lực', 'OT', 'khắc nghiệt'],
  },

  // === NHÓM LIFESTYLE ===
  'F&B (Nhà hàng, Quán cà phê)': {
    code: 'fnb',
    category: 'lifestyle',
    target_audience: 'B2C',
    short_name: 'F&B',
    brand_positioning: 'Không gian ẩm thực tinh tế, nơi mỗi món ăn là một trải nghiệm đáng nhớ',
    tone_of_voice: ['friendly', 'inspirational', 'playful'],
    formality_level: 'casual',
    language_style: ['storytelling', 'emotional'],
    allow_emoji: true,
    preferred_words: ['ngon', 'tươi', 'đặc biệt', 'thưởng thức', 'hương vị', 'tinh tế'],
    forbidden_words: ['rẻ nhất', 'bình dân'],
  },
  'Du lịch & Khách sạn': {
    code: 'travel',
    category: 'lifestyle',
    target_audience: 'B2C',
    short_name: 'Du lịch',
    brand_positioning: 'Kiến tạo hành trình khám phá, mang đến trải nghiệm du lịch đáng nhớ',
    tone_of_voice: ['friendly', 'inspirational', 'playful'],
    formality_level: 'casual',
    language_style: ['storytelling', 'emotional'],
    allow_emoji: true,
    preferred_words: ['khám phá', 'trải nghiệm', 'tuyệt vời', 'đẳng cấp', 'nghỉ dưỡng', 'thư giãn'],
    forbidden_words: ['rẻ tiền', 'bình thường'],
  },
  'Thời trang & Làm đẹp': {
    code: 'fashion',
    category: 'lifestyle',
    target_audience: 'B2C',
    short_name: 'Thời trang',
    brand_positioning: 'Tôn vinh vẻ đẹp cá nhân, định hình phong cách riêng biệt',
    tone_of_voice: ['inspirational', 'playful', 'friendly'],
    formality_level: 'casual',
    language_style: ['emotional', 'storytelling'],
    allow_emoji: true,
    preferred_words: ['sang trọng', 'độc đáo', 'thời thượng', 'tự tin', 'rạng rỡ', 'quyến rũ'],
    forbidden_words: ['bình dân', 'lỗi mốt'],
  },
  'Mỹ phẩm & Chăm sóc da': {
    code: 'beauty',
    category: 'lifestyle',
    target_audience: 'B2C',
    short_name: 'Mỹ phẩm',
    brand_positioning: 'Tôn vinh vẻ đẹp tự nhiên, chăm sóc từ gốc rễ làn da',
    tone_of_voice: ['inspirational', 'friendly', 'empathetic'],
    formality_level: 'casual',
    language_style: ['emotional', 'storytelling'],
    allow_emoji: true,
    preferred_words: ['rạng rỡ', 'tự nhiên', 'dưỡng ẩm', 'căng mướt', 'an toàn', 'thuần chay'],
    forbidden_words: ['hóa chất', 'nhân tạo', 'tẩy trắng'],
  },
  'Fitness & Thể thao': {
    code: 'fitness',
    category: 'lifestyle',
    target_audience: 'B2C',
    short_name: 'Fitness',
    brand_positioning: 'Khơi dậy sức mạnh nội tại, chinh phục mọi giới hạn bản thân',
    tone_of_voice: ['inspirational', 'friendly', 'playful'],
    formality_level: 'casual',
    language_style: ['emotional', 'direct'],
    allow_emoji: true,
    preferred_words: ['khỏe mạnh', 'chinh phục', 'năng lượng', 'vượt giới hạn', 'body goal', 'transform'],
    forbidden_words: ['béo', 'xấu', 'yếu đuối'],
  },
  'Pet & Thú cưng': {
    code: 'pet',
    category: 'lifestyle',
    target_audience: 'B2C',
    short_name: 'Pet & Thú cưng',
    brand_positioning: 'Chăm sóc toàn diện cho thành viên bốn chân yêu thương',
    tone_of_voice: ['friendly', 'playful', 'empathetic'],
    formality_level: 'casual',
    language_style: ['emotional', 'storytelling'],
    allow_emoji: true,
    preferred_words: ['yêu thương', 'boss', 'sen', 'đáng yêu', 'dinh dưỡng', 'chăm sóc'],
    forbidden_words: ['bỏ rơi', 'bệnh', 'chết'],
  },

  // === NHÓM BẤT ĐỘNG SẢN & XÂY DỰNG ===
  'Bất động sản': {
    code: 'realestate',
    category: 'realestate',
    target_audience: 'both',
    short_name: 'Bất động sản',
    brand_positioning: 'Đối tác bất động sản uy tín, đồng hành cùng giấc mơ an cư',
    tone_of_voice: ['professional', 'authoritative', 'inspirational'],
    formality_level: 'semi_formal',
    language_style: ['direct', 'data_driven'],
    allow_emoji: false,
    preferred_words: ['đẳng cấp', 'vị trí vàng', 'tiện ích', 'đầu tư', 'giá trị', 'phát triển'],
    forbidden_words: ['rẻ', 'tạm bợ'],
  },
  'Xây dựng & Nội thất': {
    code: 'construction',
    category: 'realestate',
    target_audience: 'both',
    short_name: 'Xây dựng',
    brand_positioning: 'Kiến tạo không gian sống hoàn hảo với chất lượng và thẩm mỹ',
    tone_of_voice: ['professional', 'inspirational', 'authoritative'],
    formality_level: 'semi_formal',
    language_style: ['simple', 'storytelling'],
    allow_emoji: false,
    preferred_words: ['chất lượng', 'bền vững', 'tinh tế', 'thiết kế', 'sang trọng', 'hiện đại'],
    forbidden_words: ['tạm bợ', 'rẻ tiền'],
  },
  'Nội thất & Trang trí': {
    code: 'interior',
    category: 'realestate',
    target_audience: 'B2C',
    short_name: 'Nội thất',
    brand_positioning: 'Không gian sống hoàn hảo, phản ánh cá tính và gu thẩm mỹ riêng',
    tone_of_voice: ['inspirational', 'professional', 'friendly'],
    formality_level: 'semi_formal',
    language_style: ['emotional', 'storytelling'],
    allow_emoji: false,
    preferred_words: ['tinh tế', 'phong cách', 'tối giản', 'cao cấp', 'thiết kế', 'không gian'],
    forbidden_words: ['rẻ tiền', 'bình dân', 'cũ kỹ'],
  },

  // === NHÓM SẢN XUẤT & LOGISTICS ===
  'Sản xuất & Công nghiệp': {
    code: 'manufacturing',
    category: 'manufacturing',
    target_audience: 'B2B',
    short_name: 'Sản xuất',
    brand_positioning: 'Giải pháp sản xuất tiên tiến, tối ưu chi phí vận hành công nghiệp',
    tone_of_voice: ['professional', 'authoritative', 'educational'],
    formality_level: 'formal',
    language_style: ['technical', 'data_driven'],
    allow_emoji: false,
    preferred_words: ['ISO', 'tiêu chuẩn', 'năng suất', 'tự động hóa', 'hiệu quả', 'chất lượng'],
    forbidden_words: ['thủ công', 'lỗi thời', 'rẻ tiền'],
  },
  'Nông nghiệp': {
    code: 'agriculture',
    category: 'manufacturing',
    target_audience: 'both',
    short_name: 'Nông nghiệp',
    brand_positioning: 'Nông nghiệp bền vững, sản phẩm sạch, hướng tới tương lai xanh',
    tone_of_voice: ['educational', 'empathetic', 'inspirational'],
    formality_level: 'semi_formal',
    language_style: ['simple', 'storytelling'],
    allow_emoji: true,
    preferred_words: ['organic', 'tự nhiên', 'bền vững', 'sạch', 'an toàn', 'VietGAP'],
    forbidden_words: ['hóa chất', 'thuốc trừ sâu', 'biến đổi gen'],
  },
  'Logistics & Vận tải': {
    code: 'logistics',
    category: 'manufacturing',
    target_audience: 'B2B',
    short_name: 'Logistics',
    brand_positioning: 'Vận chuyển nhanh chóng, an toàn, đúng hẹn mọi lúc mọi nơi',
    tone_of_voice: ['professional', 'authoritative', 'friendly'],
    formality_level: 'semi_formal',
    language_style: ['simple', 'direct'],
    allow_emoji: false,
    preferred_words: ['đúng hẹn', 'an toàn', 'theo dõi', 'toàn quốc', 'nhanh chóng', 'tiết kiệm'],
    forbidden_words: ['chậm trễ', 'thất lạc', 'hư hỏng'],
  },
  'Automotive': {
    code: 'automotive',
    category: 'manufacturing',
    target_audience: 'both',
    short_name: 'Ô tô & Xe máy',
    brand_positioning: 'Công nghệ di chuyển hiện đại, phong cách và đẳng cấp',
    tone_of_voice: ['professional', 'inspirational', 'authoritative'],
    formality_level: 'semi_formal',
    language_style: ['technical', 'emotional'],
    allow_emoji: false,
    preferred_words: ['động cơ mạnh mẽ', 'tiết kiệm nhiên liệu', 'an toàn', 'công nghệ', 'đẳng cấp', 'hiện đại'],
    forbidden_words: ['cũ', 'lỗi thời', 'tốn xăng'],
  },

  // === NHÓM KHÁC ===
  'Marketing & Truyền thông': {
    code: 'marketing',
    category: 'other',
    target_audience: 'B2B',
    short_name: 'Marketing',
    brand_positioning: 'Sáng tạo không giới hạn, kết nối thương hiệu với khách hàng',
    tone_of_voice: ['inspirational', 'playful', 'conversational'],
    formality_level: 'casual',
    language_style: ['storytelling', 'emotional'],
    allow_emoji: true,
    preferred_words: ['sáng tạo', 'độc đáo', 'viral', 'xu hướng', 'kết nối', 'tăng trưởng'],
    forbidden_words: ['nhàm chán', 'cũ kỹ'],
  },
  'Sự kiện & Hội nghị': {
    code: 'events',
    category: 'other',
    target_audience: 'both',
    short_name: 'Sự kiện',
    brand_positioning: 'Kiến tạo sự kiện đáng nhớ, trải nghiệm hoàn hảo từ A-Z',
    tone_of_voice: ['friendly', 'playful', 'inspirational'],
    formality_level: 'casual',
    language_style: ['emotional', 'storytelling'],
    allow_emoji: true,
    preferred_words: ['ấn tượng', 'hoành tráng', 'độc đáo', 'trọn gói', 'chuyên nghiệp', 'kỷ niệm'],
    forbidden_words: ['đơn giản', 'bình thường', 'nhàm chán'],
  },
  'Dịch vụ gia đình': {
    code: 'home_services',
    category: 'other',
    target_audience: 'B2C',
    short_name: 'Dịch vụ gia đình',
    brand_positioning: 'Giải pháp tiện ích cho mọi gia đình Việt, an tâm mỗi ngày',
    tone_of_voice: ['friendly', 'empathetic', 'conversational'],
    formality_level: 'casual',
    language_style: ['simple', 'emotional'],
    allow_emoji: true,
    preferred_words: ['tiện lợi', 'an tâm', 'uy tín', 'sạch sẽ', 'chuyên nghiệp', 'nhanh chóng'],
    forbidden_words: ['bẩn', 'chậm', 'đắt đỏ'],
  },
  'Mẹ & Bé': {
    code: 'mother_baby',
    category: 'other',
    target_audience: 'B2C',
    short_name: 'Mẹ & Bé',
    brand_positioning: 'Đồng hành nuôi dưỡng thế hệ tương lai với tình yêu thương',
    tone_of_voice: ['empathetic', 'educational', 'friendly'],
    formality_level: 'casual',
    language_style: ['emotional', 'storytelling'],
    allow_emoji: true,
    preferred_words: ['an toàn', 'organic', 'dinh dưỡng', 'yêu thương', 'phát triển', 'bảo vệ'],
    forbidden_words: ['hóa chất', 'độc hại', 'nguy hiểm'],
  },
};

Deno.serve(withPerf({ functionName: 'migrate-industry-templates', slowThresholdMs: 120000 }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting industry templates migration...');

    // Get Vietnam country ID
    const { data: countries, error: countryError } = await supabase
      .from('countries')
      .select('id, code')
      .in('code', ['VN', 'US']);

    if (countryError) throw countryError;

    const vietnamId = countries?.find(c => c.code === 'VN')?.id;
    if (!vietnamId) throw new Error('Vietnam country not found');

    console.log('Vietnam country ID:', vietnamId);

    // Get category IDs
    const { data: categories, error: categoryError } = await supabase
      .from('industry_categories')
      .select('id, code');

    if (categoryError) throw categoryError;

    const categoryMap = new Map(categories?.map(c => [c.code, c.id]) || []);
    console.log('Category map:', Object.fromEntries(categoryMap));

    // Migrate each industry template
    const results = { success: 0, errors: [] as string[] };

    for (const [industryName, template] of Object.entries(INDUSTRY_TEMPLATES)) {
      try {
        const categoryId = categoryMap.get(template.category);
        
        // Insert industry template
        const { data: inserted, error: insertError } = await supabase
          .from('industry_templates')
          .insert({
            country_id: vietnamId,
            category_id: categoryId || null,
            code: template.code,
            target_audience: template.target_audience,
            brand_voice: {
              tone_of_voice: template.tone_of_voice,
              formality_level: template.formality_level,
              language_style: template.language_style,
              allow_emoji: template.allow_emoji,
            },
            channel_settings: {},
            is_active: true,
          })
          .select('id')
          .single();

        if (insertError) {
          // If duplicate, try to get existing
          if (insertError.code === '23505') {
            const { data: existing } = await supabase
              .from('industry_templates')
              .select('id')
              .eq('country_id', vietnamId)
              .eq('code', template.code)
              .single();
            
            if (existing) {
              // Update translation
              await supabase
                .from('industry_template_translations')
                .upsert({
                  industry_template_id: existing.id,
                  language_code: 'vi',
                  name: industryName,
                  short_name: template.short_name,
                  brand_positioning: template.brand_positioning,
                  preferred_words: template.preferred_words,
                  forbidden_words: template.forbidden_words,
                });
              results.success++;
              continue;
            }
          }
          throw insertError;
        }

        // Insert Vietnamese translation
        const { error: translationError } = await supabase
          .from('industry_template_translations')
          .insert({
            industry_template_id: inserted.id,
            language_code: 'vi',
            name: industryName,
            short_name: template.short_name,
            brand_positioning: template.brand_positioning,
            preferred_words: template.preferred_words,
            forbidden_words: template.forbidden_words,
          });

        if (translationError) throw translationError;

        results.success++;
        console.log(`✓ Migrated: ${industryName}`);
      } catch (err) {
        const errorMsg = `Failed to migrate ${industryName}: ${err instanceof Error ? err.message : 'Unknown error'}`;
        console.error(errorMsg);
        results.errors.push(errorMsg);
      }
    }

    console.log('Migration completed:', results);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Migration completed. ${results.success} templates migrated.`,
        details: results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Migration error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));
