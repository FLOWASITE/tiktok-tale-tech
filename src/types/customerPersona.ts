// Content preferences for AI-enhanced content generation
export interface ContentPreferences {
  format?: 'short' | 'medium' | 'long';
  visual?: boolean;
  storytelling?: boolean;
  data_driven?: boolean;
  emotional?: boolean;
  practical?: boolean;
}

// Journey step for customer journey mapping
export interface JourneyStep {
  stage: JourneyStage;
  touchpoints: string[];
  content_type: string;
}

export type JourneyStage = 'awareness' | 'consideration' | 'decision' | 'loyalty';

// Partial persona overrides for country variants
export interface PersonaOverrides {
  pain_points?: string[];
  desires?: string[];
  objections?: string[];
  occupation?: string;
  income_level?: string;
  communication_style?: string;
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
  
  // Extended Demographics (NEW)
  education_level?: 'high_school' | 'college' | 'bachelor' | 'master' | 'phd' | null;
  family_status?: 'single' | 'married' | 'married_with_kids' | null;
  device_usage?: 'mobile-first' | 'desktop-first' | 'balanced' | null;
  tech_savviness?: 'low' | 'medium' | 'high' | null;
  
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
  
  // Behavioral Insights (NEW)
  buying_motivation?: string[] | null;
  
  // Journey Map (NEW)
  journey_map?: JourneyStep[] | null;
  
  // Priority & Segment (NEW)
  priority_score?: number | null; // 1-5
  segment_size?: number | null; // percentage
  
  // AI Enhancement fields
  communication_style?: string | null;
  response_tone_hints?: string[] | null;
  content_preferences?: ContentPreferences | null;
  persona_prompt_hints?: string | null;
  
  // Visual (NEW)
  avatar_url?: string | null;
  color_theme?: string | null; // hex color
  
  // Country Variants (NEW)
  country_variants?: Record<string, Partial<PersonaOverrides>> | null;
  
  // Data Source & Confidence (NEW)
  data_source?: string | null;
  confidence_level?: 'low' | 'medium' | 'high' | null;
  last_researched_date?: string | null;
  
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

// =============================================
// NEW CONSTANTS FOR EXTENDED FIELDS
// =============================================

export const EDUCATION_LEVELS = [
  { value: 'high_school', label: 'THPT' },
  { value: 'college', label: 'Cao đẳng' },
  { value: 'bachelor', label: 'Đại học' },
  { value: 'master', label: 'Thạc sĩ' },
  { value: 'phd', label: 'Tiến sĩ' },
] as const;

export const FAMILY_STATUSES = [
  { value: 'single', label: 'Độc thân' },
  { value: 'married', label: 'Đã kết hôn' },
  { value: 'married_with_kids', label: 'Có con nhỏ' },
] as const;

export const DEVICE_USAGES = [
  { value: 'mobile-first', label: 'Chủ yếu Mobile', icon: 'Smartphone' },
  { value: 'desktop-first', label: 'Chủ yếu Desktop', icon: 'Monitor' },
  { value: 'balanced', label: 'Cân bằng', icon: 'Laptop' },
] as const;

export const TECH_SAVVINESS_LEVELS = [
  { value: 'low', label: 'Thấp', description: 'Cần hướng dẫn đơn giản, step-by-step' },
  { value: 'medium', label: 'Trung bình', description: 'Tự làm được các task cơ bản' },
  { value: 'high', label: 'Cao', description: 'Thành thạo công nghệ, prefer automation' },
] as const;

export const BUYING_MOTIVATIONS = [
  { value: 'price-sensitive', label: 'Nhạy cảm về giá', icon: 'BadgeDollarSign' },
  { value: 'quality-driven', label: 'Ưu tiên chất lượng', icon: 'Award' },
  { value: 'trust-based', label: 'Dựa trên niềm tin', icon: 'ShieldCheck' },
  { value: 'convenience', label: 'Tiện lợi', icon: 'Zap' },
  { value: 'status', label: 'Thể hiện status', icon: 'Crown' },
  { value: 'necessity', label: 'Nhu cầu thiết yếu', icon: 'Heart' },
] as const;

export const CONFIDENCE_LEVELS = [
  { value: 'low', label: 'Thấp', description: 'Dựa trên giả định', color: 'destructive' },
  { value: 'medium', label: 'Trung bình', description: 'Có data sơ bộ', color: 'secondary' },
  { value: 'high', label: 'Cao', description: 'Đã validate với khách hàng thực', color: 'default' },
] as const;

export const JOURNEY_STAGES: { value: JourneyStage; label: string; description: string; icon: string; color: string }[] = [
  { value: 'awareness', label: 'Nhận biết', description: 'Khách hàng biết đến bạn', icon: 'Eye', color: 'blue' },
  { value: 'consideration', label: 'Cân nhắc', description: 'Đang so sánh, tìm hiểu', icon: 'Scale', color: 'amber' },
  { value: 'decision', label: 'Quyết định', description: 'Sẵn sàng mua', icon: 'CheckCircle', color: 'emerald' },
  { value: 'loyalty', label: 'Trung thành', description: 'Khách hàng quay lại', icon: 'Heart', color: 'rose' },
];

export const JOURNEY_TOUCHPOINTS = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'zalo', label: 'Zalo' },
  { value: 'website', label: 'Website' },
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS' },
  { value: 'call', label: 'Điện thoại' },
  { value: 'instore', label: 'Cửa hàng' },
  { value: 'referral', label: 'Giới thiệu' },
  { value: 'google', label: 'Google Search' },
] as const;

export const JOURNEY_CONTENT_TYPES = [
  { value: 'educational', label: 'Giáo dục', description: 'Tips, hướng dẫn, kiến thức' },
  { value: 'entertaining', label: 'Giải trí', description: 'Meme, trend, câu chuyện vui' },
  { value: 'inspirational', label: 'Truyền cảm hứng', description: 'Story, case study' },
  { value: 'promotional', label: 'Khuyến mãi', description: 'Ưu đãi, deal, flash sale' },
  { value: 'testimonial', label: 'Đánh giá', description: 'Review, feedback khách hàng' },
  { value: 'comparison', label: 'So sánh', description: 'So sánh sản phẩm, tính năng' },
  { value: 'pricing', label: 'Giá & CTA', description: 'Bảng giá, kêu gọi hành động' },
  { value: 'loyalty', label: 'Chăm sóc', description: 'Ưu đãi VIP, loyalty program' },
] as const;

export const PRIORITY_LABELS = [
  { value: 1, label: 'Rất thấp', color: 'muted' },
  { value: 2, label: 'Thấp', color: 'secondary' },
  { value: 3, label: 'Trung bình', color: 'default' },
  { value: 4, label: 'Cao', color: 'primary' },
  { value: 5, label: 'Rất cao', color: 'destructive' },
] as const;

// =============================================
// EXISTING CONSTANTS
// =============================================

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
  { value: 'short', label: 'Ngắn gọn', description: 'Dưới 100 từ', icon: 'Zap' },
  { value: 'medium', label: 'Vừa phải', description: '100-300 từ', icon: 'FileText' },
  { value: 'long', label: 'Chi tiết', description: 'Trên 300 từ', icon: 'ScrollText' },
] as const;

// Content preference options for personas
export const CONTENT_PREFERENCE_OPTIONS = [
  { key: 'visual', label: 'Hình ảnh', description: 'Ưa thích nội dung có hình ảnh minh họa', icon: 'Image' },
  { key: 'storytelling', label: 'Kể chuyện', description: 'Thích nội dung dạng câu chuyện, narrative', icon: 'BookOpen' },
  { key: 'data_driven', label: 'Dữ liệu', description: 'Thích nội dung có số liệu, thống kê', icon: 'BarChart3' },
  { key: 'emotional', label: 'Cảm xúc', description: 'Phản hồi tốt với nội dung tạo cảm xúc', icon: 'Heart' },
  { key: 'practical', label: 'Thực tế', description: 'Ưa thích hướng dẫn cụ thể, áp dụng được ngay', icon: 'CheckSquare' },
] as const;

export const getDefaultContentPreferences = (): ContentPreferences => ({
  format: 'medium',
  visual: true,
  storytelling: false,
  data_driven: false,
  emotional: false,
  practical: true,
});

export const getDefaultJourneyMap = (): JourneyStep[] => [
  { stage: 'awareness', touchpoints: ['facebook', 'tiktok'], content_type: 'educational' },
  { stage: 'consideration', touchpoints: ['website', 'zalo'], content_type: 'testimonial' },
  { stage: 'decision', touchpoints: ['call', 'website'], content_type: 'pricing' },
  { stage: 'loyalty', touchpoints: ['email', 'zalo'], content_type: 'loyalty' },
];

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
      education_level: 'master',
      device_usage: 'balanced',
      tech_savviness: 'high',
      buying_motivation: ['quality-driven', 'trust-based'],
      priority_score: 4,
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
      education_level: 'bachelor',
      device_usage: 'mobile-first',
      tech_savviness: 'medium',
      buying_motivation: ['convenience', 'trust-based'],
      priority_score: 5,
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
      education_level: 'bachelor',
      device_usage: 'mobile-first',
      tech_savviness: 'medium',
      buying_motivation: ['price-sensitive', 'convenience'],
      priority_score: 3,
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
      education_level: 'bachelor',
      family_status: 'married_with_kids',
      device_usage: 'mobile-first',
      tech_savviness: 'medium',
      buying_motivation: ['quality-driven', 'trust-based'],
      priority_score: 4,
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
