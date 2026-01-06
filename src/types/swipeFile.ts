export type SwipeFileSourceType = 'manual' | 'competitor' | 'internal' | 'meta_library';
export type PerformanceTier = 'A' | 'B' | 'C';

export interface SwipeFile {
  id: string;
  organization_id: string;
  source_type: SwipeFileSourceType;
  source_url: string | null;
  competitor_name: string | null;
  platform: string;
  industry: string | null;
  objective: string | null;
  screenshot_url: string | null;
  video_url: string | null;
  primary_text: string | null;
  headline: string | null;
  description: string | null;
  cta_button: string | null;
  performance_tier: PerformanceTier | null;
  tags: string[];
  notes: string | null;
  is_favorite: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SwipeFileFormData {
  source_type: SwipeFileSourceType;
  source_url?: string;
  competitor_name?: string;
  platform: string;
  industry?: string;
  objective?: string;
  screenshot_url?: string;
  video_url?: string;
  primary_text?: string;
  headline?: string;
  description?: string;
  cta_button?: string;
  performance_tier?: PerformanceTier;
  tags?: string[];
  notes?: string;
}

export const SWIPE_FILE_TAGS = [
  { value: 'hook_question', label: 'Hook Câu hỏi' },
  { value: 'hook_statistic', label: 'Hook Số liệu' },
  { value: 'hook_story', label: 'Hook Storytelling' },
  { value: 'pain_point', label: 'Pain Point' },
  { value: 'benefit_focused', label: 'Benefit Focused' },
  { value: 'urgency', label: 'Urgency/FOMO' },
  { value: 'social_proof', label: 'Social Proof' },
  { value: 'emotional', label: 'Emotional Appeal' },
  { value: 'humor', label: 'Humor' },
  { value: 'educational', label: 'Educational' },
  { value: 'comparison', label: 'So sánh' },
  { value: 'testimonial', label: 'Testimonial' },
] as const;

export const PERFORMANCE_TIERS = [
  { value: 'A', label: 'Tier A', description: 'Top performer', color: 'text-green-600', bgColor: 'bg-green-100' },
  { value: 'B', label: 'Tier B', description: 'Good performance', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  { value: 'C', label: 'Tier C', description: 'Average', color: 'text-orange-600', bgColor: 'bg-orange-100' },
] as const;
