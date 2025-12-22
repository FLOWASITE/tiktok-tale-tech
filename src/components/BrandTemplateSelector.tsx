import { Card } from '@/components/ui/card';
import { 
  Briefcase, 
  Building2, 
  Coffee, 
  Code, 
  GraduationCap, 
  Heart, 
  Plane, 
  ShoppingCart,
  Megaphone,
  Scale,
  Hammer,
  Sparkles,
  Store,
  Factory,
  Leaf,
  Truck,
  Shield,
  Users,
  Landmark,
  Smartphone,
  Gamepad2,
  Palette,
  Dumbbell,
  Sofa,
  Ship,
  Rocket,
  Bitcoin,
  UsersRound,
  PartyPopper,
  Home,
  Baby,
  PawPrint,
  Car
} from 'lucide-react';

interface IndustryTemplate {
  name: string;
  icon: React.ReactNode;
  brand_positioning: string;
  tone_of_voice: string[];
  formality_level: string;
  language_style: string[];
  allow_emoji: boolean;
  preferred_words: string[];
  forbidden_words: string[];
}

export const INDUSTRY_TEMPLATES: Record<string, IndustryTemplate> = {
  // === NHÓM TÀI CHÍNH ===
  'Tài chính & Kế toán': {
    name: 'Tài chính & Kế toán',
    icon: <Briefcase className="w-5 h-5" />,
    brand_positioning: 'Đối tác tài chính đáng tin cậy, mang đến sự an tâm và minh bạch cho doanh nghiệp',
    tone_of_voice: ['professional', 'authoritative', 'empathetic'],
    formality_level: 'formal',
    language_style: ['simple', 'direct'],
    allow_emoji: false,
    preferred_words: ['đảm bảo', 'chính xác', 'uy tín', 'minh bạch', 'tối ưu', 'chuyên nghiệp'],
    forbidden_words: ['siêu', 'khủng', 'cực kỳ', 'hot', 'sốc'],
  },
  'Ngân hàng & Tín dụng': {
    name: 'Ngân hàng',
    icon: <Landmark className="w-5 h-5" />,
    brand_positioning: 'Đối tác tài chính vững chắc, đồng hành phát triển bền vững cùng khách hàng',
    tone_of_voice: ['professional', 'authoritative', 'empathetic'],
    formality_level: 'formal',
    language_style: ['simple', 'direct'],
    allow_emoji: false,
    preferred_words: ['an toàn', 'lãi suất ưu đãi', 'tiện lợi', 'bảo mật', 'hỗ trợ 24/7', 'uy tín'],
    forbidden_words: ['rủi ro', 'nợ xấu', 'lừa đảo', 'siêu lợi nhuận'],
  },
  'Bảo hiểm': {
    name: 'Bảo hiểm',
    icon: <Shield className="w-5 h-5" />,
    brand_positioning: 'Bảo vệ toàn diện, an tâm cho mọi giai đoạn cuộc sống',
    tone_of_voice: ['professional', 'empathetic', 'authoritative'],
    formality_level: 'formal',
    language_style: ['simple', 'emotional'],
    allow_emoji: false,
    preferred_words: ['bảo vệ', 'an tâm', 'chi trả nhanh', 'toàn diện', 'đồng hành', 'tin cậy'],
    forbidden_words: ['rủi ro cao', 'tai nạn', 'chết', 'siêu rẻ'],
  },
  'Crypto & Fintech': {
    name: 'Crypto & Fintech',
    icon: <Bitcoin className="w-5 h-5" />,
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
    name: 'Công nghệ',
    icon: <Code className="w-5 h-5" />,
    brand_positioning: 'Đổi mới công nghệ, tối ưu hóa quy trình, tăng tốc chuyển đổi số',
    tone_of_voice: ['professional', 'inspirational', 'educational'],
    formality_level: 'semi_formal',
    language_style: ['technical', 'direct'],
    allow_emoji: false,
    preferred_words: ['giải pháp', 'tối ưu', 'hiệu quả', 'đổi mới', 'tự động hóa', 'thông minh'],
    forbidden_words: ['cổ điển', 'thủ công'],
  },
  'Viễn thông': {
    name: 'Viễn thông',
    icon: <Smartphone className="w-5 h-5" />,
    brand_positioning: 'Kết nối không giới hạn, công nghệ tiên phong, phủ sóng mọi nơi',
    tone_of_voice: ['professional', 'inspirational', 'friendly'],
    formality_level: 'semi_formal',
    language_style: ['simple', 'direct'],
    allow_emoji: false,
    preferred_words: ['tốc độ cao', 'phủ sóng rộng', 'ổn định', 'không giới hạn', '5G', 'kết nối'],
    forbidden_words: ['chậm', 'mất sóng', 'đắt'],
  },
  'Game & Giải trí số': {
    name: 'Game & Giải trí',
    icon: <Gamepad2 className="w-5 h-5" />,
    brand_positioning: 'Trải nghiệm giải trí đỉnh cao, thế giới ảo không giới hạn',
    tone_of_voice: ['playful', 'inspirational', 'friendly'],
    formality_level: 'casual',
    language_style: ['storytelling', 'emotional'],
    allow_emoji: true,
    preferred_words: ['đỉnh cao', 'huyền thoại', 'chiến thắng', 'level up', 'exclusive', 'siêu phẩm'],
    forbidden_words: ['nhàm chán', 'lag', 'hack'],
  },
  'Startup & Khởi nghiệp': {
    name: 'Startup',
    icon: <Rocket className="w-5 h-5" />,
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
    name: 'E-commerce',
    icon: <ShoppingCart className="w-5 h-5" />,
    brand_positioning: 'Mua sắm thông minh, tiện lợi với sản phẩm chất lượng và dịch vụ tận tâm',
    tone_of_voice: ['friendly', 'conversational', 'playful'],
    formality_level: 'casual',
    language_style: ['simple', 'direct'],
    allow_emoji: true,
    preferred_words: ['ưu đãi', 'chính hãng', 'miễn phí', 'nhanh chóng', 'tiết kiệm', 'chất lượng'],
    forbidden_words: ['đắt', 'chờ lâu'],
  },
  'Bán lẻ': {
    name: 'Bán lẻ',
    icon: <Store className="w-5 h-5" />,
    brand_positioning: 'Mua sắm tiện lợi, sản phẩm đa dạng, giá cạnh tranh cho mọi khách hàng',
    tone_of_voice: ['friendly', 'conversational', 'playful'],
    formality_level: 'casual',
    language_style: ['simple', 'direct'],
    allow_emoji: true,
    preferred_words: ['khuyến mãi', 'tiết kiệm', 'đa dạng', 'tiện lợi', 'chính hãng', 'ưu đãi'],
    forbidden_words: ['đắt đỏ', 'khan hiếm', 'hết hàng'],
  },
  'Nhập khẩu & Xuất khẩu': {
    name: 'Xuất nhập khẩu',
    icon: <Ship className="w-5 h-5" />,
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
    name: 'Y tế',
    icon: <Heart className="w-5 h-5" />,
    brand_positioning: 'Chăm sóc sức khỏe toàn diện với sự tận tâm và chuyên môn cao',
    tone_of_voice: ['professional', 'empathetic', 'authoritative'],
    formality_level: 'formal',
    language_style: ['simple', 'direct'],
    allow_emoji: false,
    preferred_words: ['an toàn', 'chăm sóc', 'tận tâm', 'chuyên môn', 'tin cậy', 'hiệu quả'],
    forbidden_words: ['rẻ', 'nhanh chóng', 'dễ dàng'],
  },
  'Giáo dục & Đào tạo': {
    name: 'Giáo dục',
    icon: <GraduationCap className="w-5 h-5" />,
    brand_positioning: 'Đồng hành phát triển năng lực, khai phá tiềm năng mỗi cá nhân',
    tone_of_voice: ['educational', 'inspirational', 'empathetic'],
    formality_level: 'semi_formal',
    language_style: ['simple', 'storytelling'],
    allow_emoji: true,
    preferred_words: ['học hỏi', 'phát triển', 'tiến bộ', 'thành công', 'kiến thức', 'kỹ năng'],
    forbidden_words: ['thất bại', 'khó khăn'],
  },
  'Luật & Pháp lý': {
    name: 'Pháp lý',
    icon: <Scale className="w-5 h-5" />,
    brand_positioning: 'Bảo vệ quyền lợi khách hàng với sự chuyên nghiệp và tận tâm',
    tone_of_voice: ['professional', 'authoritative', 'empathetic'],
    formality_level: 'formal',
    language_style: ['technical', 'direct'],
    allow_emoji: false,
    preferred_words: ['bảo vệ', 'pháp lý', 'quyền lợi', 'chuyên môn', 'tư vấn', 'hỗ trợ'],
    forbidden_words: ['dễ dàng', 'nhanh chóng', 'rẻ'],
  },
  'Tư vấn & Dịch vụ chuyên nghiệp': {
    name: 'Tư vấn',
    icon: <Users className="w-5 h-5" />,
    brand_positioning: 'Đối tác chiến lược, giải pháp tối ưu cho doanh nghiệp vươn xa',
    tone_of_voice: ['professional', 'authoritative', 'educational'],
    formality_level: 'formal',
    language_style: ['technical', 'data_driven'],
    allow_emoji: false,
    preferred_words: ['chiến lược', 'tối ưu hóa', 'ROI', 'KPI', 'insight', 'tư vấn'],
    forbidden_words: ['dễ dàng', 'miễn phí', 'nhanh chóng'],
  },
  'HR & Tuyển dụng': {
    name: 'HR & Tuyển dụng',
    icon: <UsersRound className="w-5 h-5" />,
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
    name: 'F&B',
    icon: <Coffee className="w-5 h-5" />,
    brand_positioning: 'Không gian ẩm thực tinh tế, nơi mỗi món ăn là một trải nghiệm đáng nhớ',
    tone_of_voice: ['friendly', 'inspirational', 'playful'],
    formality_level: 'casual',
    language_style: ['storytelling', 'emotional'],
    allow_emoji: true,
    preferred_words: ['ngon', 'tươi', 'đặc biệt', 'thưởng thức', 'hương vị', 'tinh tế'],
    forbidden_words: ['rẻ nhất', 'bình dân'],
  },
  'Du lịch & Khách sạn': {
    name: 'Du lịch',
    icon: <Plane className="w-5 h-5" />,
    brand_positioning: 'Kiến tạo hành trình khám phá, mang đến trải nghiệm du lịch đáng nhớ',
    tone_of_voice: ['friendly', 'inspirational', 'playful'],
    formality_level: 'casual',
    language_style: ['storytelling', 'emotional'],
    allow_emoji: true,
    preferred_words: ['khám phá', 'trải nghiệm', 'tuyệt vời', 'đẳng cấp', 'nghỉ dưỡng', 'thư giãn'],
    forbidden_words: ['rẻ tiền', 'bình thường'],
  },
  'Thời trang & Làm đẹp': {
    name: 'Thời trang',
    icon: <Sparkles className="w-5 h-5" />,
    brand_positioning: 'Tôn vinh vẻ đẹp cá nhân, định hình phong cách riêng biệt',
    tone_of_voice: ['inspirational', 'playful', 'friendly'],
    formality_level: 'casual',
    language_style: ['emotional', 'storytelling'],
    allow_emoji: true,
    preferred_words: ['sang trọng', 'độc đáo', 'thời thượng', 'tự tin', 'rạng rỡ', 'quyến rũ'],
    forbidden_words: ['bình dân', 'lỗi mốt'],
  },
  'Mỹ phẩm & Chăm sóc da': {
    name: 'Mỹ phẩm',
    icon: <Palette className="w-5 h-5" />,
    brand_positioning: 'Tôn vinh vẻ đẹp tự nhiên, chăm sóc từ gốc rễ làn da',
    tone_of_voice: ['inspirational', 'friendly', 'empathetic'],
    formality_level: 'casual',
    language_style: ['emotional', 'storytelling'],
    allow_emoji: true,
    preferred_words: ['rạng rỡ', 'tự nhiên', 'dưỡng ẩm', 'căng mướt', 'an toàn', 'thuần chay'],
    forbidden_words: ['hóa chất', 'nhân tạo', 'tẩy trắng'],
  },
  'Fitness & Thể thao': {
    name: 'Fitness',
    icon: <Dumbbell className="w-5 h-5" />,
    brand_positioning: 'Khơi dậy sức mạnh nội tại, chinh phục mọi giới hạn bản thân',
    tone_of_voice: ['inspirational', 'friendly', 'playful'],
    formality_level: 'casual',
    language_style: ['emotional', 'direct'],
    allow_emoji: true,
    preferred_words: ['khỏe mạnh', 'chinh phục', 'năng lượng', 'vượt giới hạn', 'body goal', 'transform'],
    forbidden_words: ['béo', 'xấu', 'yếu đuối'],
  },
  'Pet & Thú cưng': {
    name: 'Pet & Thú cưng',
    icon: <PawPrint className="w-5 h-5" />,
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
    name: 'Bất động sản',
    icon: <Building2 className="w-5 h-5" />,
    brand_positioning: 'Đối tác bất động sản uy tín, đồng hành cùng giấc mơ an cư',
    tone_of_voice: ['professional', 'authoritative', 'inspirational'],
    formality_level: 'semi_formal',
    language_style: ['direct', 'data_driven'],
    allow_emoji: false,
    preferred_words: ['đẳng cấp', 'vị trí vàng', 'tiện ích', 'đầu tư', 'giá trị', 'phát triển'],
    forbidden_words: ['rẻ', 'tạm bợ'],
  },
  'Xây dựng & Nội thất': {
    name: 'Xây dựng',
    icon: <Hammer className="w-5 h-5" />,
    brand_positioning: 'Kiến tạo không gian sống hoàn hảo với chất lượng và thẩm mỹ',
    tone_of_voice: ['professional', 'inspirational', 'authoritative'],
    formality_level: 'semi_formal',
    language_style: ['simple', 'storytelling'],
    allow_emoji: false,
    preferred_words: ['chất lượng', 'bền vững', 'tinh tế', 'thiết kế', 'sang trọng', 'hiện đại'],
    forbidden_words: ['tạm bợ', 'rẻ tiền'],
  },
  'Nội thất & Trang trí': {
    name: 'Nội thất',
    icon: <Sofa className="w-5 h-5" />,
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
    name: 'Sản xuất',
    icon: <Factory className="w-5 h-5" />,
    brand_positioning: 'Giải pháp sản xuất tiên tiến, tối ưu chi phí vận hành công nghiệp',
    tone_of_voice: ['professional', 'authoritative', 'educational'],
    formality_level: 'formal',
    language_style: ['technical', 'data_driven'],
    allow_emoji: false,
    preferred_words: ['ISO', 'tiêu chuẩn', 'năng suất', 'tự động hóa', 'hiệu quả', 'chất lượng'],
    forbidden_words: ['thủ công', 'lỗi thời', 'rẻ tiền'],
  },
  'Nông nghiệp': {
    name: 'Nông nghiệp',
    icon: <Leaf className="w-5 h-5" />,
    brand_positioning: 'Nông nghiệp bền vững, sản phẩm sạch, hướng tới tương lai xanh',
    tone_of_voice: ['educational', 'empathetic', 'inspirational'],
    formality_level: 'semi_formal',
    language_style: ['simple', 'storytelling'],
    allow_emoji: true,
    preferred_words: ['organic', 'tự nhiên', 'bền vững', 'sạch', 'an toàn', 'VietGAP'],
    forbidden_words: ['hóa chất', 'thuốc trừ sâu', 'biến đổi gen'],
  },
  'Logistics & Vận tải': {
    name: 'Logistics',
    icon: <Truck className="w-5 h-5" />,
    brand_positioning: 'Vận chuyển nhanh chóng, an toàn, đúng hẹn mọi lúc mọi nơi',
    tone_of_voice: ['professional', 'authoritative', 'friendly'],
    formality_level: 'semi_formal',
    language_style: ['simple', 'direct'],
    allow_emoji: false,
    preferred_words: ['đúng hẹn', 'an toàn', 'theo dõi', 'toàn quốc', 'nhanh chóng', 'tiết kiệm'],
    forbidden_words: ['chậm trễ', 'thất lạc', 'hư hỏng'],
  },
  'Automotive': {
    name: 'Ô tô & Xe máy',
    icon: <Car className="w-5 h-5" />,
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
    name: 'Marketing',
    icon: <Megaphone className="w-5 h-5" />,
    brand_positioning: 'Sáng tạo không giới hạn, kết nối thương hiệu với khách hàng',
    tone_of_voice: ['inspirational', 'playful', 'conversational'],
    formality_level: 'casual',
    language_style: ['storytelling', 'emotional'],
    allow_emoji: true,
    preferred_words: ['sáng tạo', 'độc đáo', 'viral', 'xu hướng', 'kết nối', 'tăng trưởng'],
    forbidden_words: ['nhàm chán', 'cũ kỹ'],
  },
  'Sự kiện & Hội nghị': {
    name: 'Sự kiện',
    icon: <PartyPopper className="w-5 h-5" />,
    brand_positioning: 'Kiến tạo sự kiện đáng nhớ, trải nghiệm hoàn hảo từ A-Z',
    tone_of_voice: ['friendly', 'playful', 'inspirational'],
    formality_level: 'casual',
    language_style: ['emotional', 'storytelling'],
    allow_emoji: true,
    preferred_words: ['ấn tượng', 'hoành tráng', 'độc đáo', 'trọn gói', 'chuyên nghiệp', 'kỷ niệm'],
    forbidden_words: ['đơn giản', 'bình thường', 'nhàm chán'],
  },
  'Dịch vụ gia đình': {
    name: 'Dịch vụ gia đình',
    icon: <Home className="w-5 h-5" />,
    brand_positioning: 'Giải pháp tiện ích cho mọi gia đình Việt, an tâm mỗi ngày',
    tone_of_voice: ['friendly', 'empathetic', 'conversational'],
    formality_level: 'casual',
    language_style: ['simple', 'emotional'],
    allow_emoji: true,
    preferred_words: ['tiện lợi', 'an tâm', 'uy tín', 'sạch sẽ', 'chuyên nghiệp', 'nhanh chóng'],
    forbidden_words: ['bẩn', 'chậm', 'đắt đỏ'],
  },
  'Mẹ & Bé': {
    name: 'Mẹ & Bé',
    icon: <Baby className="w-5 h-5" />,
    brand_positioning: 'Đồng hành nuôi dưỡng thế hệ tương lai với tình yêu thương',
    tone_of_voice: ['empathetic', 'educational', 'friendly'],
    formality_level: 'casual',
    language_style: ['emotional', 'storytelling'],
    allow_emoji: true,
    preferred_words: ['an toàn', 'organic', 'dinh dưỡng', 'yêu thương', 'phát triển', 'bảo vệ'],
    forbidden_words: ['hóa chất', 'độc hại', 'nguy hiểm'],
  },
};

interface BrandTemplateSelectorProps {
  onSelect: (template: IndustryTemplate & { industry: string }) => void;
  selectedIndustry?: string;
}

export function BrandTemplateSelector({ onSelect, selectedIndustry }: BrandTemplateSelectorProps) {
  const industries = Object.keys(INDUSTRY_TEMPLATES);

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Chọn ngành để bắt đầu với cài đặt sẵn phù hợp:
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {industries.map((industry) => {
          const template = INDUSTRY_TEMPLATES[industry];
          const isSelected = selectedIndustry === industry;
          
          return (
            <Card
              key={industry}
              className={`p-3 cursor-pointer transition-all hover:border-primary/50 hover:shadow-sm ${
                isSelected ? 'border-primary bg-primary/5 ring-1 ring-primary' : ''
              }`}
              onClick={() => onSelect({ ...template, industry })}
            >
              <div className="flex flex-col items-center gap-2 text-center">
                <div className={`p-2 rounded-full ${isSelected ? 'bg-primary/10 text-primary' : 'bg-muted'}`}>
                  {template.icon}
                </div>
                <span className="text-xs font-medium line-clamp-2">{template.name}</span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
