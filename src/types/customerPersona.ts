// Content preferences for AI-enhanced content generation
export interface ContentPreferences {
  format?: 'short' | 'medium' | 'long';
  visual?: boolean;
  storytelling?: boolean;
  data_driven?: boolean;
  emotional?: boolean;
  practical?: boolean;
}

export interface CustomerPersona {
  id: string;
  brand_template_id: string;
  organization_id?: string | null;
  user_id?: string | null;
  
  // Basic Info
  name: string;
  avatar_emoji: string;
  is_primary: boolean;
  
  // Demographics
  age_range?: string | null;
  gender?: 'male' | 'female' | 'all' | null;
  location?: string | null;
  income_level?: 'low' | 'medium' | 'high' | 'very_high' | null;
  occupation?: string | null;
  
  // Psychographics
  pain_points: string[];
  desires: string[];
  objections: string[];
  values: string[];
  interests: string[];
  
  // Buying Behavior
  buying_triggers: string[];
  information_sources: string[];
  preferred_channels: string[];
  typical_funnel_stage?: FunnelStage | null;
  
  // AI Enhancement fields (matches industry_personas)
  communication_style?: string | null;
  response_tone_hints?: string[] | null;
  content_preferences?: ContentPreferences | null;
  persona_prompt_hints?: string | null;
  
  // Industry Persona Link
  source_industry_persona_id?: string | null;
  is_customized?: boolean | null;
  
  created_at?: string;
  updated_at?: string;
}

export type FunnelStage = 'tofu' | 'mofu' | 'bofu';

export const FUNNEL_STAGES: { value: FunnelStage; label: string; description: string; color: string }[] = [
  { value: 'tofu', label: 'TOFU', description: 'Nhận biết', color: 'blue' },
  { value: 'mofu', label: 'MOFU', description: 'Cân nhắc', color: 'amber' },
  { value: 'bofu', label: 'BOFU', description: 'Quyết định', color: 'emerald' },
];

export const INCOME_LEVELS = [
  { value: 'low', label: 'Thu nhập thấp' },
  { value: 'medium', label: 'Thu nhập trung bình' },
  { value: 'high', label: 'Thu nhập cao' },
  { value: 'very_high', label: 'Thu nhập rất cao' },
];

export const AGE_RANGES = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'];

export const GENDER_OPTIONS = [
  { value: 'male', label: 'Nam' },
  { value: 'female', label: 'Nữ' },
  { value: 'all', label: 'Tất cả' },
];

export const AVATAR_EMOJIS = ['👤', '👩‍💼', '👨‍💼', '👩‍💻', '👨‍💻', '👩‍🔧', '👨‍🏫', '👩‍⚕️', '🧑‍🍳', '👩‍🎨', '👨‍🔬', '👩‍🌾', '🧑‍💼', '👷', '💼'];

// Communication styles for AI-enhanced personas
export const COMMUNICATION_STYLES = [
  { value: 'direct', label: 'Trực tiếp', description: 'Đi thẳng vào vấn đề, không vòng vo' },
  { value: 'emotional', label: 'Cảm xúc', description: 'Kết nối qua câu chuyện và cảm xúc' },
  { value: 'analytical', label: 'Phân tích', description: 'Dựa trên data, logic và bằng chứng' },
  { value: 'consultative', label: 'Tư vấn', description: 'Hỏi đáp, tìm hiểu nhu cầu trước' },
  { value: 'storytelling', label: 'Kể chuyện', description: 'Dùng narrative và case study' },
] as const;

export const RESPONSE_TONE_HINTS = [
  { value: 'empathetic', label: 'Đồng cảm' },
  { value: 'solution-oriented', label: 'Hướng giải pháp' },
  { value: 'authoritative', label: 'Chuyên gia' },
  { value: 'friendly', label: 'Thân thiện' },
  { value: 'urgent', label: 'Khẩn cấp' },
  { value: 'reassuring', label: 'Trấn an' },
  { value: 'motivating', label: 'Động viên' },
  { value: 'educational', label: 'Giáo dục' },
] as const;

export const CONTENT_FORMAT_OPTIONS = [
  { value: 'short', label: 'Ngắn gọn', description: 'Dưới 100 từ' },
  { value: 'medium', label: 'Vừa phải', description: '100-300 từ' },
  { value: 'long', label: 'Chi tiết', description: 'Trên 300 từ' },
] as const;

export const getDefaultContentPreferences = (): ContentPreferences => ({
  format: 'medium',
  visual: true,
  storytelling: false,
  data_driven: false,
  emotional: false,
  practical: true,
});

// Templates for quick-start persona creation
export const PERSONA_TEMPLATES: Record<string, Partial<CustomerPersona>[]> = {
  'B2B': [
    {
      name: 'Giám đốc Marketing Mai',
      avatar_emoji: '👩‍💼',
      age_range: '35-44',
      gender: 'female',
      income_level: 'high',
      occupation: 'Marketing Director',
      pain_points: ['Khó đo lường ROI marketing', 'Thiếu insight về khách hàng', 'Budget hạn chế'],
      desires: ['Tăng lead quality', 'Chứng minh ROI cho board', 'Xây dựng brand awareness'],
      objections: ['Chi phí cao', 'Không có thời gian implement', 'Cần proof trước khi quyết định'],
      typical_funnel_stage: 'mofu',
    },
    {
      name: 'Chủ doanh nghiệp Hùng',
      avatar_emoji: '👨‍💼',
      age_range: '35-44',
      gender: 'male',
      income_level: 'very_high',
      occupation: 'CEO / Founder',
      pain_points: ['Thiếu thời gian', 'Khó tìm partner uy tín', 'Cần scale nhanh'],
      desires: ['Tăng doanh thu', 'Mở rộng thị trường', 'Tối ưu vận hành'],
      objections: ['Đã từng thất bại với service tương tự', 'Không rõ value proposition'],
      typical_funnel_stage: 'bofu',
    },
  ],
  'B2C': [
    {
      name: 'Nhân viên văn phòng Linh',
      avatar_emoji: '👩‍💻',
      age_range: '25-34',
      gender: 'female',
      income_level: 'medium',
      occupation: 'Nhân viên văn phòng',
      pain_points: ['Thời gian eo hẹp', 'Muốn cân bằng công việc - cuộc sống', 'Áp lực tài chính'],
      desires: ['Tiết kiệm thời gian', 'Sản phẩm chất lượng giá hợp lý', 'Trải nghiệm mua hàng tốt'],
      objections: ['Giá cao hơn đối thủ', 'Chưa biết thương hiệu', 'Review không đủ thuyết phục'],
      typical_funnel_stage: 'tofu',
    },
    {
      name: 'Phụ huynh Minh',
      avatar_emoji: '👨‍👧',
      age_range: '35-44',
      gender: 'all',
      income_level: 'high',
      occupation: 'Phụ huynh có con nhỏ',
      pain_points: ['Lo lắng cho con cái', 'Khó tìm sản phẩm an toàn', 'Thiếu thông tin đáng tin cậy'],
      desires: ['Sản phẩm an toàn cho con', 'Tiết kiệm chi phí gia đình', 'Được tư vấn rõ ràng'],
      objections: ['Cần nghiên cứu kỹ trước khi mua', 'Ưu tiên thương hiệu đã biết'],
      typical_funnel_stage: 'mofu',
    },
  ],
};

// Marketing frameworks for topic generation
export const MARKETING_FRAMEWORKS = {
  PAS: {
    name: 'Problem-Agitate-Solution',
    description: 'Nêu vấn đề → Làm nóng vấn đề → Đưa giải pháp',
    patterns: [
      '{Problem}? Đây là cách {Brand} giải quyết',
      '3 sai lầm {Persona} hay mắc về {Topic} (và cách tránh)',
      '{Pain Point} đang ảnh hưởng đến bạn như thế nào?',
    ],
    bestFor: ['tofu', 'education', 'awareness'],
  },
  BAB: {
    name: 'Before-After-Bridge',
    description: 'Trạng thái trước → Trạng thái sau → Cầu nối',
    patterns: [
      'Từ {Before State} đến {After State}: Hành trình của {Customer}',
      '{Customer Type} đã thay đổi {Metric} như thế nào với {Solution}',
      'Case study: Từ {Problem} đến {Success}',
    ],
    bestFor: ['mofu', 'conversion', 'expertise'],
  },
  AIDA: {
    name: 'Attention-Interest-Desire-Action',
    description: 'Thu hút → Quan tâm → Mong muốn → Hành động',
    patterns: [
      '⚡ {Shock stat} - {Interest hook} - {Desire trigger}',
      'Bạn có biết? {Surprising fact} → {Solution}',
      '{Number}% {Audience} đang làm sai điều này',
    ],
    bestFor: ['bofu', 'conversion', 'engagement'],
  },
  '4U': {
    name: 'Useful-Urgent-Unique-Ultra-specific',
    description: 'Hữu ích, Khẩn cấp, Độc đáo, Cực kỳ cụ thể',
    patterns: [
      '[{Timeframe}] {Specific number} cách {Action} cho {Specific persona}',
      '{Persona}: {Number} điều BẮT BUỘC phải biết trong {Year}',
      'Hướng dẫn chi tiết từ A-Z: {Specific topic} cho {Persona}',
    ],
    bestFor: ['tofu', 'education', 'engagement'],
  },
  PASTOR: {
    name: 'Problem-Amplify-Story-Transformation-Offer-Response',
    description: 'Framework storytelling dài cho content conversion',
    patterns: [
      'Câu chuyện {Customer}: Từ {Problem} đến {Transformation}',
      'Vì sao {Brand} ra đời? Câu chuyện đằng sau sứ mệnh',
    ],
    bestFor: ['mofu', 'bofu', 'awareness'],
  },
};
