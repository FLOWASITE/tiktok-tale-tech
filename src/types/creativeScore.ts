// Creative Score Types for Ad Copy Optimization

export type CreativeGrade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
export type SuggestionField = 'headline' | 'primary_text' | 'description' | 'cta';
export type SuggestionConfidence = 'low' | 'medium' | 'high';
export type SuggestionStatus = 'pending' | 'applied' | 'dismissed' | 'tested';

export interface ComponentScoreFactor {
  name: string;
  score: number;
  feedback: string;
}

export interface ComponentScore {
  score: number;
  factors: ComponentScoreFactor[];
}

export interface ScoreBreakdown {
  headline?: ComponentScore;
  primary_text?: ComponentScore;
  cta?: ComponentScore;
  overall_structure?: ComponentScore;
}

export interface CreativeScore {
  id: string;
  variation_id: string;
  overall_score: number;
  grade: CreativeGrade;
  
  // Component scores
  headline_score?: number;
  primary_text_score?: number;
  cta_score?: number;
  emotional_appeal_score?: number;
  clarity_score?: number;
  urgency_score?: number;
  relevance_score?: number;
  
  score_breakdown?: ScoreBreakdown;
  strengths: string[];
  weaknesses: string[];
  optimization_priority?: string;
  
  model_version?: string;
  scored_at: string;
  organization_id?: string;
}

export interface OptimizationSuggestion {
  id: string;
  variation_id: string;
  field: SuggestionField;
  original_text: string | null;
  suggested_text: string;
  predicted_improvement: number | null;
  improvement_metric: string | null;
  confidence: SuggestionConfidence | null;
  reason: string;
  technique: string | null;
  status: SuggestionStatus;
  applied_at: string | null;
  created_at: string;
  organization_id?: string;
}

export interface PredictionHistory {
  id: string;
  variation_id: string;
  predicted_ctr: number | null;
  predicted_cpc: number | null;
  predicted_cpm: number | null;
  predicted_conversion_rate: number | null;
  predicted_roas: number | null;
  confidence_score: number | null;
  actual_ctr: number | null;
  actual_cpc: number | null;
  actual_cpm: number | null;
  actual_conversion_rate: number | null;
  actual_roas: number | null;
  accuracy_score: number | null;
  prediction_factors: Record<string, unknown> | null;
  predicted_at: string;
  validated_at: string | null;
  organization_id?: string;
}

// Grade color helpers
export const GRADE_COLORS: Record<CreativeGrade, string> = {
  'A+': 'bg-emerald-500 text-white',
  'A': 'bg-green-500 text-white',
  'B': 'bg-yellow-500 text-white',
  'C': 'bg-orange-500 text-white',
  'D': 'bg-red-400 text-white',
  'F': 'bg-red-600 text-white',
};

export const GRADE_RING_COLORS: Record<CreativeGrade, string> = {
  'A+': 'text-emerald-500',
  'A': 'text-green-500',
  'B': 'text-yellow-500',
  'C': 'text-orange-500',
  'D': 'text-red-400',
  'F': 'text-red-600',
};

export const GRADE_BG_LIGHT: Record<CreativeGrade, string> = {
  'A+': 'bg-emerald-50 border-emerald-200',
  'A': 'bg-green-50 border-green-200',
  'B': 'bg-yellow-50 border-yellow-200',
  'C': 'bg-orange-50 border-orange-200',
  'D': 'bg-red-50 border-red-200',
  'F': 'bg-red-100 border-red-300',
};

// Optimization techniques
export const OPTIMIZATION_TECHNIQUES = [
  { value: 'power_words', label: 'Power Words', icon: 'Zap', description: 'Từ ngữ mạnh mẽ, gây ấn tượng' },
  { value: 'urgency', label: 'Urgency', icon: 'Clock', description: 'Tạo cảm giác cấp bách' },
  { value: 'social_proof', label: 'Social Proof', icon: 'Users', description: 'Bằng chứng xã hội' },
  { value: 'benefit_focus', label: 'Benefit Focus', icon: 'Target', description: 'Tập trung vào lợi ích' },
  { value: 'question_hook', label: 'Question Hook', icon: 'HelpCircle', description: 'Câu hỏi thu hút' },
  { value: 'number_specificity', label: 'Number Specificity', icon: 'Hash', description: 'Số liệu cụ thể' },
  { value: 'emotional_trigger', label: 'Emotional Trigger', icon: 'Heart', description: 'Kích hoạt cảm xúc' },
  { value: 'scarcity', label: 'Scarcity', icon: 'AlertTriangle', description: 'Tạo sự khan hiếm' },
] as const;

export const CONFIDENCE_COLORS: Record<SuggestionConfidence, string> = {
  low: 'bg-gray-100 text-gray-700 border-gray-300',
  medium: 'bg-blue-100 text-blue-700 border-blue-300',
  high: 'bg-green-100 text-green-700 border-green-300',
};

export const CONFIDENCE_LABELS: Record<SuggestionConfidence, string> = {
  low: 'Thấp',
  medium: 'Trung bình',
  high: 'Cao',
};

export const FIELD_LABELS: Record<SuggestionField, string> = {
  headline: 'Tiêu đề',
  primary_text: 'Nội dung chính',
  description: 'Mô tả',
  cta: 'Nút CTA',
};

// Helper function to calculate grade from score
export function getGradeFromScore(score: number): CreativeGrade {
  if (score >= 95) return 'A+';
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

// Helper to get technique info
export function getTechniqueInfo(technique: string) {
  return OPTIMIZATION_TECHNIQUES.find(t => t.value === technique);
}
