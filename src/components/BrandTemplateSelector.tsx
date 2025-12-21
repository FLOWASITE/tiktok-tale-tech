import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  Package,
  Factory,
  Leaf,
  Truck,
  Shield,
  Users
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
