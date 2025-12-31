// Journey Stage Types for Product-Persona Messaging

export type JourneyStage = 'awareness' | 'consideration' | 'decision' | 'loyalty';

export type EmotionalTone = 'curiosity' | 'urgency' | 'trust' | 'delight' | 'empathy' | 'authority';

export interface JourneyStageMessaging {
  id: string;
  mapping_id: string;
  journey_stage: JourneyStage;
  
  // Core Messaging Content
  headline: string | null;
  hook: string | null;
  key_message: string | null;
  
  // Focus Areas
  pain_points_focus: string[];
  benefits_highlight: string[];
  
  // CTA & Tone
  cta_template: string | null;
  emotional_tone: EmotionalTone | null;
  
  // Objection & Content
  objection_response: string | null;
  content_types: string[];
  avoid_messages: string[];
  
  // Ownership
  organization_id: string | null;
  user_id: string | null;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface JourneyStageMessagingFormData {
  headline: string;
  hook: string;
  key_message: string;
  pain_points_focus: string[];
  benefits_highlight: string[];
  cta_template: string;
  emotional_tone: EmotionalTone | null;
  objection_response: string;
  content_types: string[];
  avoid_messages: string[];
}

export const JOURNEY_STAGES: JourneyStage[] = ['awareness', 'consideration', 'decision', 'loyalty'];

export const EMOTIONAL_TONES: EmotionalTone[] = ['curiosity', 'urgency', 'trust', 'delight', 'empathy', 'authority'];

export const JOURNEY_STAGE_CONFIG: Record<JourneyStage, {
  label: string;
  labelEn: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
  defaultTone: EmotionalTone;
  suggestedContentTypes: string[];
  ctaExamples: string[];
}> = {
  awareness: {
    label: 'Nhận biết',
    labelEn: 'Awareness',
    icon: 'Eye',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    description: 'Khách hàng mới biết đến vấn đề hoặc brand',
    defaultTone: 'curiosity',
    suggestedContentTypes: ['educational', 'entertaining', 'inspirational', 'storytelling'],
    ctaExamples: ['Tìm hiểu thêm', 'Xem ngay', 'Khám phá', 'Đọc tiếp'],
  },
  consideration: {
    label: 'Cân nhắc',
    labelEn: 'Consideration',
    icon: 'Scale',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    description: 'Khách hàng đang so sánh và đánh giá các lựa chọn',
    defaultTone: 'trust',
    suggestedContentTypes: ['comparison', 'testimonial', 'case_study', 'demo', 'how_to'],
    ctaExamples: ['So sánh ngay', 'Xem đánh giá', 'Nhận tư vấn', 'Đặt lịch demo'],
  },
  decision: {
    label: 'Quyết định',
    labelEn: 'Decision',
    icon: 'CheckCircle',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    description: 'Khách hàng sẵn sàng mua, cần thúc đẩy hành động',
    defaultTone: 'urgency',
    suggestedContentTypes: ['promotional', 'pricing', 'guarantee', 'offer', 'limited_time'],
    ctaExamples: ['Mua ngay', 'Đăng ký', 'Nhận ưu đãi', 'Bắt đầu ngay'],
  },
  loyalty: {
    label: 'Trung thành',
    labelEn: 'Loyalty',
    icon: 'Heart',
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    description: 'Khách hàng đã mua, cần giữ chân và upsell',
    defaultTone: 'delight',
    suggestedContentTypes: ['loyalty', 'exclusive', 'community', 'referral', 'upsell'],
    ctaExamples: ['Ưu đãi VIP', 'Nâng cấp', 'Giới thiệu bạn bè', 'Nhận quà tặng'],
  },
};

export const EMOTIONAL_TONE_CONFIG: Record<EmotionalTone, {
  label: string;
  labelEn: string;
  description: string;
  icon: string;
}> = {
  curiosity: {
    label: 'Tò mò',
    labelEn: 'Curiosity',
    description: 'Kích thích sự tò mò, muốn tìm hiểu thêm',
    icon: 'HelpCircle',
  },
  urgency: {
    label: 'Khẩn cấp',
    labelEn: 'Urgency',
    description: 'Tạo cảm giác cấp bách, cần hành động ngay',
    icon: 'Clock',
  },
  trust: {
    label: 'Tin tưởng',
    labelEn: 'Trust',
    description: 'Xây dựng niềm tin, uy tín và độ tin cậy',
    icon: 'Shield',
  },
  delight: {
    label: 'Vui vẻ',
    labelEn: 'Delight',
    description: 'Tạo cảm giác vui vẻ, hài lòng và thích thú',
    icon: 'Smile',
  },
  empathy: {
    label: 'Đồng cảm',
    labelEn: 'Empathy',
    description: 'Thể hiện sự thấu hiểu, chia sẻ với khách hàng',
    icon: 'Heart',
  },
  authority: {
    label: 'Uy quyền',
    labelEn: 'Authority',
    description: 'Thể hiện chuyên môn, vị thế dẫn đầu ngành',
    icon: 'Award',
  },
};

export const CONTENT_TYPE_OPTIONS = [
  { value: 'educational', label: 'Giáo dục', description: 'Chia sẻ kiến thức, hướng dẫn' },
  { value: 'entertaining', label: 'Giải trí', description: 'Nội dung vui vẻ, thú vị' },
  { value: 'inspirational', label: 'Truyền cảm hứng', description: 'Động lực, câu chuyện thành công' },
  { value: 'storytelling', label: 'Kể chuyện', description: 'Câu chuyện thương hiệu, khách hàng' },
  { value: 'comparison', label: 'So sánh', description: 'So sánh sản phẩm, giải pháp' },
  { value: 'testimonial', label: 'Đánh giá', description: 'Nhận xét từ khách hàng' },
  { value: 'case_study', label: 'Case study', description: 'Phân tích trường hợp cụ thể' },
  { value: 'demo', label: 'Demo', description: 'Giới thiệu sản phẩm, tính năng' },
  { value: 'how_to', label: 'Hướng dẫn', description: 'Cách sử dụng, tips & tricks' },
  { value: 'promotional', label: 'Khuyến mãi', description: 'Ưu đãi, giảm giá' },
  { value: 'pricing', label: 'Bảng giá', description: 'Thông tin giá cả, gói dịch vụ' },
  { value: 'guarantee', label: 'Cam kết', description: 'Bảo hành, đảm bảo chất lượng' },
  { value: 'offer', label: 'Ưu đãi', description: 'Quà tặng, bonus đặc biệt' },
  { value: 'limited_time', label: 'Giới hạn thời gian', description: 'Deal có thời hạn' },
  { value: 'loyalty', label: 'Loyalty', description: 'Chương trình khách hàng thân thiết' },
  { value: 'exclusive', label: 'Độc quyền', description: 'Nội dung dành riêng cho VIP' },
  { value: 'community', label: 'Cộng đồng', description: 'Xây dựng cộng đồng, kết nối' },
  { value: 'referral', label: 'Giới thiệu', description: 'Chương trình giới thiệu bạn bè' },
  { value: 'upsell', label: 'Upsell', description: 'Nâng cấp, cross-sell sản phẩm' },
];

export const DEFAULT_MESSAGING_FORM: JourneyStageMessagingFormData = {
  headline: '',
  hook: '',
  key_message: '',
  pain_points_focus: [],
  benefits_highlight: [],
  cta_template: '',
  emotional_tone: null,
  objection_response: '',
  content_types: [],
  avoid_messages: [],
};

// Helper to get default messaging for a stage
export function getDefaultMessagingForStage(stage: JourneyStage): Partial<JourneyStageMessagingFormData> {
  const config = JOURNEY_STAGE_CONFIG[stage];
  return {
    emotional_tone: config.defaultTone,
    content_types: config.suggestedContentTypes.slice(0, 2),
    cta_template: config.ctaExamples[0] || '',
  };
}
