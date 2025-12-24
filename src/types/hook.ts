export interface HookTemplate {
  id: string;
  framework: string;
  name: string;
  opening_line: string;
  visual_direction: string | null;
  text_overlay: string | null;
  psychology_reason: string | null;
  engagement_level: string;
  platforms: string[];
  industries: string[];
  duration_fit: string[];
  compatible_tones: string[];
  compatible_formality: string[];
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserSavedHook {
  id: string;
  user_id: string;
  organization_id: string | null;
  hook_template_id: string | null;
  brand_template_id: string | null;
  framework: string;
  original_opening_line: string;
  customized_opening_line: string | null;
  visual_direction: string | null;
  text_overlay: string | null;
  collection_name: string | null;
  notes: string | null;
  is_favorite: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface GeneratedHook {
  opening_line: string;
  visual_direction: string;
  text_overlay: string;
  framework: string;
  psychology_reason: string;
  engagement_level: string;
}

export type HookFramework = 
  | 'question' 
  | 'bold_statement' 
  | 'transformation' 
  | 'story' 
  | 'number' 
  | 'negative' 
  | 'social_proof' 
  | 'direct_address' 
  | 'shocking_fact' 
  | 'challenge'
  | 'local';

export const FRAMEWORK_LABELS: Record<string, string> = {
  question: 'Câu hỏi',
  bold_statement: 'Tuyên bố táo bạo',
  transformation: 'Chuyển đổi',
  story: 'Câu chuyện',
  number: 'Con số',
  negative: 'Cảnh báo',
  social_proof: 'Bằng chứng xã hội',
  direct_address: 'Gọi thẳng',
  shocking_fact: 'Sự thật gây sốc',
  challenge: 'Thử thách',
  local: 'Việt Nam',
};

export const FRAMEWORK_ICONS: Record<string, string> = {
  question: '❓',
  bold_statement: '💥',
  transformation: '✨',
  story: '📖',
  number: '🔢',
  negative: '🚨',
  social_proof: '👥',
  direct_address: '👉',
  shocking_fact: '😱',
  challenge: '🏆',
  local: '🇻🇳',
};

export const ENGAGEMENT_COLORS: Record<string, string> = {
  high: 'bg-green-500/20 text-green-400 border-green-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};
