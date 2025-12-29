// =============================================
// INDUSTRY PERSONA TYPES
// Template personas at industry level for AI-enhanced content generation
// =============================================

export interface IndustryPersona {
  id: string;
  industry_template_id: string;
  
  // Basic info
  name: string;
  avatar_emoji: string;
  sort_order: number;
  is_active: boolean;
  
  // Demographics
  age_range?: string | null;
  gender?: 'male' | 'female' | 'all' | null;
  income_level?: 'low' | 'medium' | 'high' | 'very_high' | null;
  occupation?: string | null;
  location?: string | null;
  
  // Psychographics
  pain_points: string[];
  desires: string[];
  objections: string[];
  values: string[];
  interests: string[];
  
  // Buying behavior
  buying_triggers: string[];
  information_sources: string[];
  preferred_channels: string[];
  typical_funnel_stage?: 'tofu' | 'mofu' | 'bofu' | null;
  
  // AI Enhancement fields (NEW)
  communication_style?: string | null; // e.g., "direct", "emotional", "analytical"
  response_tone_hints: string[]; // e.g., ["empathetic", "solution-oriented"]
  content_preferences: ContentPreferences;
  persona_prompt_hints?: string | null; // AI instructions specific to this persona
  
  // Metadata
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ContentPreferences {
  format?: 'short' | 'medium' | 'long';
  visual?: boolean;
  storytelling?: boolean;
  data_driven?: boolean;
  emotional?: boolean;
  practical?: boolean;
}

export interface IndustryPersonaTranslation {
  id: string;
  industry_persona_id: string;
  language_code: string;
  
  // Translatable fields
  name: string;
  occupation?: string | null;
  pain_points: string[];
  desires: string[];
  objections: string[];
  persona_prompt_hints?: string | null;
  
  created_at?: string;
  updated_at?: string;
}

// =============================================
// CONSTANTS FOR AI ENHANCEMENT FIELDS
// =============================================

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

// =============================================
// PERSONA TEMPLATES PER INDUSTRY TYPE
// =============================================

export const INDUSTRY_PERSONA_TEMPLATES: Record<string, Partial<IndustryPersona>[]> = {
  'B2B': [
    {
      name: 'Decision Maker',
      avatar_emoji: '👔',
      age_range: '35-44',
      gender: 'all',
      income_level: 'very_high',
      occupation: 'C-Level / Director',
      pain_points: ['Thiếu thời gian', 'Cần ROI rõ ràng', 'Rủi ro khi đổi vendor'],
      desires: ['Tăng hiệu quả', 'Giảm chi phí', 'Competitive advantage'],
      objections: ['Chi phí cao', 'Khó integrate', 'Track record chưa đủ'],
      typical_funnel_stage: 'bofu',
      communication_style: 'analytical',
      response_tone_hints: ['authoritative', 'solution-oriented'],
      content_preferences: { format: 'short', data_driven: true, practical: true },
      persona_prompt_hints: 'Focus on ROI, efficiency gains, and risk mitigation. Use data and case studies.',
    },
    {
      name: 'Implementer',
      avatar_emoji: '💻',
      age_range: '25-34',
      gender: 'all',
      income_level: 'high',
      occupation: 'Manager / Specialist',
      pain_points: ['Công cụ phức tạp', 'Thiếu support', 'Khó training team'],
      desires: ['Easy to use', 'Good documentation', 'Responsive support'],
      objections: ['Learning curve cao', 'Thiếu integration', 'Pricing không flexible'],
      typical_funnel_stage: 'mofu',
      communication_style: 'consultative',
      response_tone_hints: ['friendly', 'educational'],
      content_preferences: { format: 'medium', practical: true, visual: true },
      persona_prompt_hints: 'Focus on ease of use, step-by-step guides, and practical tips.',
    },
  ],
  'B2C': [
    {
      name: 'Value Seeker',
      avatar_emoji: '🛍️',
      age_range: '25-34',
      gender: 'all',
      income_level: 'medium',
      occupation: 'Nhân viên văn phòng',
      pain_points: ['Budget hạn chế', 'Sợ mua phải hàng kém', 'Không có thời gian research'],
      desires: ['Giá tốt nhất', 'Chất lượng đảm bảo', 'Mua nhanh gọn'],
      objections: ['Giá cao hơn đối thủ', 'Chưa biết brand', 'Ship chậm'],
      typical_funnel_stage: 'tofu',
      communication_style: 'direct',
      response_tone_hints: ['friendly', 'reassuring'],
      content_preferences: { format: 'short', visual: true, emotional: true },
      persona_prompt_hints: 'Emphasize value for money, social proof, and quick benefits.',
    },
    {
      name: 'Premium Buyer',
      avatar_emoji: '💎',
      age_range: '35-44',
      gender: 'all',
      income_level: 'very_high',
      occupation: 'Doanh nhân / Professional',
      pain_points: ['Thiếu thời gian', 'Khó tìm quality', 'Dịch vụ kém'],
      desires: ['Premium experience', 'Personalized service', 'Exclusive benefits'],
      objections: ['Không thấy sự khác biệt', 'Thiếu exclusivity'],
      typical_funnel_stage: 'bofu',
      communication_style: 'consultative',
      response_tone_hints: ['authoritative', 'empathetic'],
      content_preferences: { format: 'medium', storytelling: true, emotional: true },
      persona_prompt_hints: 'Focus on exclusivity, premium experience, and personalized attention.',
    },
  ],
};

// =============================================
// HELPER FUNCTIONS
// =============================================

export const getDefaultContentPreferences = (): ContentPreferences => ({
  format: 'medium',
  visual: true,
  storytelling: false,
  data_driven: false,
  emotional: false,
  practical: true,
});

export const createEmptyIndustryPersona = (industryTemplateId: string): Omit<IndustryPersona, 'id' | 'created_at' | 'updated_at'> => ({
  industry_template_id: industryTemplateId,
  name: '',
  avatar_emoji: '👤',
  sort_order: 0,
  is_active: true,
  pain_points: [],
  desires: [],
  objections: [],
  values: [],
  interests: [],
  buying_triggers: [],
  information_sources: [],
  preferred_channels: [],
  response_tone_hints: [],
  content_preferences: getDefaultContentPreferences(),
});
