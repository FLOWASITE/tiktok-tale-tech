export type VideoType = 
  | 'expert_share'
  | 'analyze_explain'
  | 'warning_mistake'
  | 'quick_qa';

export type CharacterType = 
  | 'male_expert'
  | 'female_expert'
  | 'consultant'
  | 'instructor'
  | 'ai_presenter';

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

export const VIDEO_TYPE_LABELS: Record<VideoType, string> = {
  expert_share: 'Chuyên gia chia sẻ kiến thức',
  analyze_explain: 'Phân tích – giải thích',
  warning_mistake: 'Cảnh báo – bóc tách sai lầm',
  quick_qa: 'Hỏi – đáp nhanh',
};

export const CHARACTER_TYPE_LABELS: Record<CharacterType, string> = {
  male_expert: 'Chuyên gia nam',
  female_expert: 'Chuyên gia nữ',
  consultant: 'Nhân vật tư vấn',
  instructor: 'Nhân vật hướng dẫn',
  ai_presenter: 'Nhân vật trung tính (AI presenter)',
};

export const DURATION_LABELS: Record<Duration, string> = {
  60: '1 phút (60 giây)',
  90: '1.5 phút (90 giây)',
  120: '2 phút (120 giây)',
  180: '3 phút (180 giây)',
};