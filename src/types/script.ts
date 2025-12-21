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

export interface Script {
  id: string;
  title: string;
  topic: string;
  duration: Duration;
  video_type: VideoType;
  character_type: CharacterType;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface ScriptFormData {
  topic: string;
  duration: Duration;
  video_type: VideoType;
  character_type: CharacterType;
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