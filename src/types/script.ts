// ============================================
// SCRIPT PURPOSE - Multi-format output
// ============================================
export type ScriptPurpose = 
  | 'ai_video'          // Video AI (VEO 3 / Minimax / etc.)
  | 'teleprompter'      // Người thật / Voice (Teleprompter + Voice-Over)
  | 'production';       // Production Script cho team

// Legacy types kept for backward compatibility with DB records
export type ScriptPurposeLegacy = ScriptPurpose | 'ai_video_veo3' | 'ai_video_minimax' | 'voiceover';

/** Normalize legacy purpose values to current ones */
export function normalizePurpose(purpose: string): ScriptPurpose {
  if (purpose === 'ai_video_veo3' || purpose === 'ai_video_minimax') return 'ai_video';
  if (purpose === 'voiceover') return 'teleprompter';
  return purpose as ScriptPurpose;
}

export const SCRIPT_PURPOSE_CONFIG: Record<ScriptPurpose, { 
  label: string; 
  description: string; 
  outputHint: string;
  blockLabel: string;
  blockLabelVi: string;
}> = {
  ai_video: {
    label: 'Video AI',
    description: 'Tạo kịch bản video AI — tự động tối ưu cho VEO 3, Minimax, và các provider khác',
    outputHint: 'Visual Direction + Character Action + Dialogue + Audio Notes',
    blockLabel: 'Prompt',
    blockLabelVi: 'Prompt',
  },
  teleprompter: {
    label: 'Quay người thật (Teleprompter)',
    description: 'Script cho quay video thật - dialogue + cue cards, không cần visual AI',
    outputHint: 'Dialogue + Cue cards + Emphasis markers',
    blockLabel: 'Đoạn',
    blockLabelVi: 'Đoạn',
  },
  voiceover: {
    label: 'Voice-Over / TTS',
    description: 'Script thu âm - clean dialogue + hướng dẫn tone',
    outputHint: 'Clean dialogue + Tone guidance + Pause markers',
    blockLabel: 'Đoạn',
    blockLabelVi: 'Đoạn',
  },
  production: {
    label: 'Production Script',
    description: 'Full script cho team sản xuất - có shot list, storyboard notes',
    outputHint: 'Camera setup + Lighting + Audio + Dialogue + Editor notes',
    blockLabel: 'Scene',
    blockLabelVi: 'Cảnh',
  },
};

// ============================================
// VIDEO TYPES - Based on global short-form video best practices
// ============================================
export type VideoType = 
  // Educational
  | 'expert_share'       // Chuyên gia chia sẻ
  | 'tutorial_howto'     // Hướng dẫn step-by-step
  | 'analyze_explain'    // Phân tích giải thích
  | 'listicle'           // Danh sách tips/tricks
  // Engagement
  | 'warning_mistake'    // Cảnh báo sai lầm
  | 'quick_qa'           // Hỏi đáp nhanh
  | 'myth_busting'       // Bóc phốt quan niệm sai
  | 'before_after'       // So sánh trước/sau
  // Entertainment
  | 'story_pov'          // Kể chuyện góc nhìn
  | 'day_in_life'        // Một ngày của...
  | 'behind_scenes'      // Hậu trường
  | 'reaction'           // Reaction/Commentary
  // Commercial
  | 'product_review'     // Review sản phẩm
  | 'case_study'         // Case study thực tế
  | 'transformation';    // Biến đổi/Kết quả

// ============================================
// CHARACTER TYPES - Based on 7 Creator Archetypes
// ============================================
export type CharacterType = 
  // Professional Experts
  | 'the_virtuoso'       // Chuyên gia kỹ thuật
  | 'the_bellwether'     // Người dẫn dắt xu hướng
  | 'the_coach'          // Người hướng dẫn
  // Creative & Entertaining
  | 'the_performer'      // Người trình diễn
  | 'the_storyteller'    // Người kể chuyện
  | 'the_iconoclast'     // Người phá vỡ khuôn mẫu
  // Technical & Analytical
  | 'the_technophile'    // Chuyên gia công nghệ
  | 'the_analyst'        // Người phân tích
  // Passionate & Relatable
  | 'the_enthusiast'     // Người đam mê
  | 'the_maker'          // Nhà sáng tạo
  // Neutral
  | 'neutral_presenter'; // Người dẫn trung tính

export type Duration = 60 | 90 | 120 | 180;

export type ContentStatus = 'draft' | 'review' | 'approved' | 'published';

export interface ScriptAnalysisCache {
  hookScore: number;
  clarityScore: number;
  viralPotential: number;
  pacingScore: number;
  ctaEffectiveness: number;
  overallScore: number;
  emotionalArc?: { prompt: number; emotion: string; intensity: number }[];
  suggestions?: {
    type: 'hook' | 'clarity' | 'pacing' | 'cta' | 'engagement';
    priority: 'high' | 'medium' | 'low';
    message: string;
    promptNumber?: number;
  }[];
  strengths?: string[];
  weaknesses?: string[];
}

export interface Script {
  id: string;
  title: string;
  topic: string;
  duration: Duration;
  video_type: VideoType;
  character_type: CharacterType;
  script_purpose: ScriptPurpose;
  content: string;
  status: ContentStatus;
  voice_region?: VoiceRegion;
  dialogue_style?: DialogueStyle;
  brand_template_id?: string;
  user_id: string | null;
  organization_id?: string | null;
  industry_template_id?: string | null;
  industry_template_version?: string | null;
  campaign_id?: string | null;
  // Analysis cache - using unknown for JSON compatibility
  analysis_cache?: unknown;
  analyzed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export const STATUS_CONFIG: Record<ContentStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  draft: { label: 'Nháp', variant: 'secondary' },
  review: { label: 'Chờ duyệt', variant: 'outline' },
  approved: { label: 'Đã duyệt', variant: 'default' },
  published: { label: 'Đã đăng', variant: 'default' },
};

export interface HookDetails {
  opening_line: string;
  visual_direction?: string;
  text_overlay?: string;
  framework?: string;
  psychology_reason?: string;
}

export type TopicAngle = 
  | 'beginner'
  | 'expert'
  | 'quick_tips'
  | 'myth_busting'
  | 'data_driven';

export const TOPIC_ANGLE_LABELS: Record<TopicAngle, { label: string; description: string; icon: string; tooltip: string }> = {
  beginner: { label: 'Beginner', description: 'Giải thích từ cơ bản', icon: 'GraduationCap', tooltip: 'Phù hợp cho người mới — giải thích khái niệm từ A-Z, dễ hiểu, không dùng thuật ngữ phức tạp' },
  expert: { label: 'Expert', description: 'Deep dive nâng cao', icon: 'BrainCircuit', tooltip: 'Dành cho người có kinh nghiệm — chia sẻ insight chuyên sâu, case study, chiến lược nâng cao' },
  quick_tips: { label: 'Quick Tips', description: 'Dễ áp dụng ngay', icon: 'Zap', tooltip: 'Nội dung ngắn gọn, thực tế — 3-5 tips có thể áp dụng ngay, tiết kiệm thời gian người xem' },
  myth_busting: { label: 'Myth-bust', description: 'Bóc sai lầm phổ biến', icon: 'ShieldAlert', tooltip: 'Bóc trần những quan niệm sai lầm — tạo bất ngờ, tăng tương tác bằng "sự thật trái ngược"' },
  data_driven: { label: 'Data-driven', description: 'Có số liệu minh chứng', icon: 'BarChart3', tooltip: 'Dựa trên dữ liệu & nghiên cứu — tăng uy tín với con số cụ thể, biểu đồ, thống kê' },
};

export interface ScriptFormData {
  topic: string;
  duration: Duration;
  video_type: VideoType;
  character_type: CharacterType;
  script_purpose: ScriptPurpose;
  voice_region: VoiceRegion;
  dialogue_style: DialogueStyle;
  brandTemplateId?: string;
  brandVoiceVariantId?: string;
  hook?: HookDetails;
  angle?: TopicAngle;
  topicHistoryId?: string;
  campaignId?: string;
}

// ============================================
// VIDEO TYPE LABELS & CATEGORIES
// ============================================
export type VideoTypeCategory = 'educational' | 'engagement' | 'entertainment' | 'commercial';

export const VIDEO_TYPE_CATEGORIES: Record<VideoTypeCategory, { label: string; icon: string }> = {
  educational: { label: 'Giáo dục', icon: '📚' },
  engagement: { label: 'Tương tác', icon: '🎯' },
  entertainment: { label: 'Giải trí', icon: '🎬' },
  commercial: { label: 'Thương mại', icon: '💼' },
};

export const VIDEO_TYPE_LABELS: Record<VideoType, string> = {
  // Educational
  expert_share: 'Chuyên gia chia sẻ',
  tutorial_howto: 'Hướng dẫn How-to',
  analyze_explain: 'Phân tích giải thích',
  listicle: 'Danh sách Tips',
  // Engagement
  warning_mistake: 'Cảnh báo sai lầm',
  quick_qa: 'Hỏi đáp nhanh',
  myth_busting: 'Bóc phốt quan niệm',
  before_after: 'So sánh Trước/Sau',
  // Entertainment
  story_pov: 'Kể chuyện POV',
  day_in_life: 'Một ngày của...',
  behind_scenes: 'Hậu trường BTS',
  reaction: 'Reaction/Commentary',
  // Commercial
  product_review: 'Review sản phẩm',
  case_study: 'Case Study',
  transformation: 'Biến đổi/Kết quả',
};

export const VIDEO_TYPE_BY_CATEGORY: Record<VideoTypeCategory, VideoType[]> = {
  educational: ['expert_share', 'tutorial_howto', 'analyze_explain', 'listicle'],
  engagement: ['warning_mistake', 'quick_qa', 'myth_busting', 'before_after'],
  entertainment: ['story_pov', 'day_in_life', 'behind_scenes', 'reaction'],
  commercial: ['product_review', 'case_study', 'transformation'],
};

// ============================================
// CHARACTER TYPE LABELS & CATEGORIES
// ============================================
export type CharacterCategory = 'professional' | 'creative' | 'technical' | 'passionate' | 'neutral';

export const CHARACTER_CATEGORIES: Record<CharacterCategory, { label: string; icon: string }> = {
  professional: { label: 'Chuyên nghiệp', icon: '👔' },
  creative: { label: 'Sáng tạo', icon: '🎨' },
  technical: { label: 'Kỹ thuật', icon: '⚙️' },
  passionate: { label: 'Đam mê', icon: '❤️' },
  neutral: { label: 'Trung tính', icon: '🎭' },
};

export const CHARACTER_TYPE_LABELS: Record<CharacterType, string> = {
  // Professional
  the_virtuoso: 'Chuyên gia kỹ thuật',
  the_bellwether: 'Người dẫn xu hướng',
  the_coach: 'Người hướng dẫn',
  // Creative
  the_performer: 'Người trình diễn',
  the_storyteller: 'Người kể chuyện',
  the_iconoclast: 'Người phá khuôn',
  // Technical
  the_technophile: 'Tech Expert',
  the_analyst: 'Người phân tích',
  // Passionate
  the_enthusiast: 'Người đam mê',
  the_maker: 'Nhà sáng tạo',
  // Neutral
  neutral_presenter: 'Người dẫn trung tính',
};

export const CHARACTER_BY_CATEGORY: Record<CharacterCategory, CharacterType[]> = {
  professional: ['the_virtuoso', 'the_bellwether', 'the_coach'],
  creative: ['the_performer', 'the_storyteller', 'the_iconoclast'],
  technical: ['the_technophile', 'the_analyst'],
  passionate: ['the_enthusiast', 'the_maker'],
  neutral: ['neutral_presenter'],
};

export const DURATION_LABELS: Record<Duration, string> = {
  60: '1 phút (60 giây)',
  90: '1.5 phút (90 giây)',
  120: '2 phút (120 giây)',
  180: '3 phút (180 giây)',
};

// ============================================
// VOICE REGION - Giọng vùng miền
// ============================================
export type VoiceRegion = 'northern' | 'central' | 'southern';

export const VOICE_REGION_CONFIG: Record<VoiceRegion, {
  label: string;
  description: string;
  dialect_notes: string;
  example_phrases: string[];
}> = {
  northern: {
    label: 'Giọng miền Bắc',
    description: 'Giọng Hà Nội chuẩn, phát âm rõ ràng',
    dialect_notes: 'Phân biệt rõ phụ âm đầu (r/d, tr/ch, s/x), dấu thanh chuẩn, ngữ điệu điềm đạm',
    example_phrases: ['Tôi nghĩ rằng...', 'Điều này thực sự quan trọng...', 'Các bạn thân mến...']
  },
  central: {
    label: 'Giọng miền Trung',
    description: 'Giọng Huế/Đà Nẵng, đậm đà bản sắc',
    dialect_notes: 'Ngữ điệu đặc trưng mềm mại, phát âm mềm hơn, dấu sắc và nặng đặc thù',
    example_phrases: ['Tui thấy rằng...', 'Bởi rứa mà...', 'Chi rứa bây...']
  },
  southern: {
    label: 'Giọng miền Nam',
    description: 'Giọng Sài Gòn tự nhiên, thân thiện',
    dialect_notes: 'Không phân biệt r/g, tr/ch, s/x, dấu hỏi/ngã ít phân biệt, ngữ điệu trầm bổng',
    example_phrases: ['Mình thấy là...', 'Cái này hay lắm nha...', 'Đúng hông các bạn...']
  }
};

// ============================================
// DIALOGUE STYLE - Phong cách hội thoại
// ============================================
export type DialogueStyle = 'monologue' | 'conversational' | 'internal' | 'narrative';

export const DIALOGUE_STYLE_CONFIG: Record<DialogueStyle, {
  label: string;
  description: string;
  prompt_instruction: string;
}> = {
  monologue: {
    label: 'Độc thoại',
    description: 'Nói liên tục như presentation',
    prompt_instruction: 'Nói liên tục như đang thuyết trình, không xen kẽ câu hỏi, giữ flow mạch lạc'
  },
  conversational: {
    label: 'Trò chuyện',
    description: 'Như đang nói chuyện với người xem',
    prompt_instruction: 'Xen kẽ câu hỏi tu từ như "bạn thấy sao?", "đúng không?", "bạn có từng gặp trường hợp này chưa?" để tăng engagement'
  },
  internal: {
    label: 'Suy tư nội tâm',
    description: 'Suy nghĩ bên trong, chiêm nghiệm',
    prompt_instruction: 'Giọng điệu như đang tự vấn, suy tư, có pause sâu, câu ngắn, như đang chia sẻ suy nghĩ cá nhân sâu sắc'
  },
  narrative: {
    label: 'Kể chuyện',
    description: 'Kể lại câu chuyện, sự kiện',
    prompt_instruction: 'Kể chuyện với timeline rõ ràng, có nhân vật, bối cảnh, biến cố, dùng ngôn ngữ vivid và descriptive'
  }
};

// ============================================
// EXTENDED TONE OPTIONS
// ============================================
export const EXTENDED_TONE_OPTIONS: Record<string, {
  label: string;
  description: string;
  style_hints: string[];
}> = {
  // Existing core tones
  expert: { 
    label: 'Chuyên gia', 
    description: 'Uy tín, am hiểu sâu',
    style_hints: ['Dùng thuật ngữ chuyên môn', 'Đưa ví dụ thực tế', 'Không nói "có lẽ"']
  },
  calm: { 
    label: 'Điềm tĩnh', 
    description: 'Bình thản, không vội vàng',
    style_hints: ['Nhịp chậm', 'Pause có chủ đích', 'Giọng đều']
  },
  confident: { 
    label: 'Tự tin', 
    description: 'Chắc chắn, quyết đoán',
    style_hints: ['Câu khẳng định', 'Không lưỡng lự', 'Dùng "chắc chắn", "tuyệt đối"']
  },
  friendly: { 
    label: 'Thân thiện', 
    description: 'Gần gũi, dễ tiếp cận',
    style_hints: ['Dùng "bạn ơi", "nha"', 'Emoji trong text overlay', 'Giọng ấm']
  },
  professional: { 
    label: 'Chuyên nghiệp', 
    description: 'Lịch sự, formal',
    style_hints: ['Xưng "tôi"', 'Câu hoàn chỉnh', 'Không slang']
  },
  inspiring: { 
    label: 'Truyền cảm hứng', 
    description: 'Động viên, khích lệ',
    style_hints: ['Dùng "bạn có thể"', 'Nhấn mạnh tiềm năng', 'Kết thúc tích cực']
  },
  educational: { 
    label: 'Giáo dục', 
    description: 'Giảng dạy, giải thích',
    style_hints: ['Step-by-step', 'Ví dụ minh họa', 'Checkpoint hỏi lại']
  },
  // New extended tones
  authoritative: { 
    label: 'Uy quyền', 
    description: 'Giọng lãnh đạo, quyết đoán',
    style_hints: ['Không nói "có lẽ"', 'Dùng câu khẳng định', 'Tone commanding']
  },
  warm: {
    label: 'Ấm áp',
    description: 'Thân thiện, quan tâm',
    style_hints: ['Dùng "bạn ơi"', 'Câu hỏi quan tâm', 'Empathy']
  },
  energetic: {
    label: 'Năng động',
    description: 'Nhanh, sôi nổi, truyền cảm hứng',
    style_hints: ['Câu ngắn', 'Nhiều động từ mạnh', 'Nhịp nhanh']
  },
  contemplative: {
    label: 'Suy tư',
    description: 'Chậm rãi, sâu lắng',
    style_hints: ['Pause dài', 'Câu hỏi tu từ', 'Reflection']
  },
  urgent: {
    label: 'Cấp bách',
    description: 'Nhấn mạnh tính quan trọng',
    style_hints: ['Dùng "ngay", "bây giờ"', 'Cảnh báo hậu quả', 'FOMO']
  },
  playful: {
    label: 'Vui nhộn',
    description: 'Hài hước nhẹ nhàng',
    style_hints: ['Ví dụ hài', 'Wordplay', 'Tone light-hearted']
  }
};
