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

export interface Script {
  id: string;
  title: string;
  topic: string;
  duration: Duration;
  video_type: VideoType;
  character_type: CharacterType;
  content: string;
  status: ContentStatus;
  user_id: string | null;
  industry_template_id?: string | null;
  industry_template_version?: string | null;
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

export const TOPIC_ANGLE_LABELS: Record<TopicAngle, { label: string; description: string; icon: string }> = {
  beginner: { label: 'Beginner', description: 'Giải thích từ cơ bản', icon: '🎓' },
  expert: { label: 'Expert', description: 'Deep dive nâng cao', icon: '👔' },
  quick_tips: { label: 'Quick Tips', description: 'Dễ áp dụng ngay', icon: '⚡' },
  myth_busting: { label: 'Myth-bust', description: 'Bóc sai lầm phổ biến', icon: '🔥' },
  data_driven: { label: 'Data-driven', description: 'Có số liệu minh chứng', icon: '📊' },
};

export interface ScriptFormData {
  topic: string;
  duration: Duration;
  video_type: VideoType;
  character_type: CharacterType;
  brandTemplateId?: string;
  hook?: HookDetails;
  angle?: TopicAngle;
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
