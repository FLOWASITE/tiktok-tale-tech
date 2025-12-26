import { ContentGoal } from './multichannel';

export type TopicCategory = 'evergreen' | 'trending' | 'seasonal' | 'reactive';
export type TopicFormat = 'carousel' | 'script' | 'multichannel';
export type EngagementLevel = 'high' | 'medium' | 'low';
export type SortOption = 'overall' | 'brandFit' | 'trend' | 'engagement' | 'competition';

// Search Intent types for SEO
export type SearchIntent = 'informational' | 'navigational' | 'commercial' | 'transactional';

export interface SuggestedKeywords {
  primary: string;
  secondary: string[];
  longTail: string[];
}

// Content Matrix types
export type TopicType = 'problem' | 'solution' | 'story' | 'data';
export type FunnelStage = 'tofu' | 'mofu' | 'bofu';
export type EmotionalTone = 'inspire' | 'educate' | 'entertain' | 'convince';

export interface TopicScores {
  brandFit: number;      // 0-100: Phù hợp với brand positioning
  trend: number;         // 0-100: Mức độ trending hiện tại
  competition: number;   // 0-100: Độ cạnh tranh (cao = ít cạnh tranh = tốt)
  engagement: number;    // 0-100: Tiềm năng tương tác
}

// Data source tracking for transparency
export interface TopicDataSource {
  hasRealData: boolean;       // Whether real-time data was used
  perplexity: boolean;        // Perplexity web search was used
  statistics: string[];       // Specific statistics used in the topic
  citations: string[];        // Source URLs from Perplexity
  dataType?: 'insight' | 'statistic' | 'case_study';  // Primary data type
}

export interface EnhancedTopicSuggestion {
  topic: string;
  category: TopicCategory;
  pillar?: string;
  formats: TopicFormat[];
  estimatedEngagement: EngagementLevel;
  reasoning: string;
  relatedKeywords: string[];
  bestTimeToPost?: string;
  scores?: TopicScores;
  // Content Matrix fields
  topicType?: TopicType;
  funnelStage?: FunnelStage;
  emotionalTone?: EmotionalTone;
  // Seasonal fields
  relatedEvent?: string;
  eventDate?: string;
  // Data source transparency (Phase 1)
  dataSources?: TopicDataSource;
  // Enhanced reasoning (Phase 2)
  scoreBreakdown?: {
    brandFitReason?: string;
    trendReason?: string;
    competitionReason?: string;
    engagementReason?: string;
  };
  // Search Intent & SEO (Phase 1)
  searchIntent?: SearchIntent;
  suggestedKeywords?: SuggestedKeywords;
}

export interface TopicHistoryItem {
  id: string;
  topic: string;
  contentGoal: ContentGoal;
  format: TopicFormat;
  pillar?: string;
  wasUsed: boolean;
  performanceScore?: number;
  createdAt: string;
}

export interface ContentPillar {
  name: string;
  weight: number;
  keywords: string[];
  color?: string;
}

export interface SeasonalEvent {
  id: string;
  name: string;
  date: Date;
  type: 'holiday' | 'event' | 'campaign';
  suggestedTopics: string[];
}

// Score thresholds
export const SCORE_THRESHOLDS = {
  excellent: 80,
  good: 60,
  fair: 40,
} as const;

// Calculate weighted overall score
export function calculateOverallScore(scores: TopicScores): number {
  return Math.round(
    scores.brandFit * 0.30 +
    scores.trend * 0.20 +
    scores.competition * 0.20 +
    scores.engagement * 0.30
  );
}

// Get score color based on value
export function getScoreColor(score: number): string {
  if (score >= SCORE_THRESHOLDS.excellent) return 'emerald';
  if (score >= SCORE_THRESHOLDS.good) return 'amber';
  return 'red';
}

// Sort options
export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'overall', label: 'Điểm tổng hợp' },
  { value: 'brandFit', label: 'Brand Fit' },
  { value: 'trend', label: 'Trending' },
  { value: 'engagement', label: 'Tương tác' },
  { value: 'competition', label: 'Ít cạnh tranh' },
];

export const TOPIC_CATEGORIES: { value: TopicCategory; label: string; color: string; icon: string }[] = [
  { value: 'evergreen', label: 'Evergreen', color: 'emerald', icon: 'Leaf' },
  { value: 'trending', label: 'Trending', color: 'orange', icon: 'TrendingUp' },
  { value: 'seasonal', label: 'Seasonal', color: 'purple', icon: 'Calendar' },
  { value: 'reactive', label: 'Reactive', color: 'red', icon: 'Zap' },
];

export const ENGAGEMENT_LEVELS: { value: EngagementLevel; label: string; color: string }[] = [
  { value: 'high', label: 'Cao', color: 'emerald' },
  { value: 'medium', label: 'Trung bình', color: 'amber' },
  { value: 'low', label: 'Thấp', color: 'slate' },
];

export const FORMAT_LABELS: Record<TopicFormat, string> = {
  carousel: 'Carousel',
  script: 'Video Script',
  multichannel: 'Đa kênh',
};

// Content Matrix labels
export const TOPIC_TYPE_LABELS: { value: TopicType; label: string; icon: string; color: string }[] = [
  { value: 'problem', label: 'Vấn đề', icon: 'AlertCircle', color: 'red' },
  { value: 'solution', label: 'Giải pháp', icon: 'Lightbulb', color: 'emerald' },
  { value: 'story', label: 'Câu chuyện', icon: 'BookOpen', color: 'purple' },
  { value: 'data', label: 'Dữ liệu', icon: 'BarChart', color: 'blue' },
];

export const FUNNEL_STAGE_LABELS: { value: FunnelStage; label: string; description: string; color: string }[] = [
  { value: 'tofu', label: 'TOFU', description: 'Nhận diện (Top of Funnel)', color: 'sky' },
  { value: 'mofu', label: 'MOFU', description: 'Cân nhắc (Middle of Funnel)', color: 'amber' },
  { value: 'bofu', label: 'BOFU', description: 'Quyết định (Bottom of Funnel)', color: 'emerald' },
];

export const EMOTIONAL_TONE_LABELS: { value: EmotionalTone; label: string; emoji: string; color: string }[] = [
  { value: 'inspire', label: 'Truyền cảm hứng', emoji: '✨', color: 'purple' },
  { value: 'educate', label: 'Giáo dục', emoji: '📚', color: 'blue' },
  { value: 'entertain', label: 'Giải trí', emoji: '🎉', color: 'orange' },
  { value: 'convince', label: 'Thuyết phục', emoji: '💡', color: 'emerald' },
];

// Search Intent labels for SEO
export const SEARCH_INTENT_LABELS: { value: SearchIntent; label: string; icon: string; color: string; description: string }[] = [
  { value: 'informational', label: 'Informational', icon: 'BookOpen', color: 'blue', description: 'Tìm kiếm thông tin, kiến thức' },
  { value: 'navigational', label: 'Navigational', icon: 'Navigation', color: 'slate', description: 'Tìm kiếm brand/website cụ thể' },
  { value: 'commercial', label: 'Commercial', icon: 'Search', color: 'amber', description: 'So sánh, nghiên cứu trước khi mua' },
  { value: 'transactional', label: 'Transactional', icon: 'ShoppingCart', color: 'emerald', description: 'Sẵn sàng mua hàng, chuyển đổi' },
];

// Vietnamese seasonal events
export const SEASONAL_EVENTS: SeasonalEvent[] = [
  {
    id: 'tet',
    name: 'Tết Nguyên Đán',
    date: new Date(2025, 0, 29), // Dynamic based on lunar calendar
    type: 'holiday',
    suggestedTopics: [
      'Chúc mừng năm mới - Thông điệp từ thương hiệu',
      'Top sản phẩm/dịch vụ hot dịp Tết',
      'Review năm cũ - Kế hoạch năm mới',
    ],
  },
  {
    id: 'valentine',
    name: 'Valentine',
    date: new Date(2025, 1, 14),
    type: 'event',
    suggestedTopics: [
      'Quà tặng Valentine ý nghĩa',
      'Câu chuyện tình yêu với thương hiệu',
      'Promotion đặc biệt dịp lễ tình nhân',
    ],
  },
  {
    id: 'womens-day',
    name: 'Ngày Phụ Nữ Việt Nam',
    date: new Date(2025, 9, 20),
    type: 'holiday',
    suggestedTopics: [
      'Tri ân phụ nữ Việt Nam',
      'Câu chuyện về những người phụ nữ truyền cảm hứng',
      'Ưu đãi đặc biệt dành cho phái đẹp',
    ],
  },
  {
    id: 'black-friday',
    name: 'Black Friday',
    date: new Date(2025, 10, 28),
    type: 'campaign',
    suggestedTopics: [
      'Flash sale Black Friday - Giảm sốc đến X%',
      'Countdown Black Friday - Săn deal hot',
      'Hướng dẫn mua sắm thông minh mùa sale',
    ],
  },
  {
    id: 'christmas',
    name: 'Giáng Sinh',
    date: new Date(2025, 11, 25),
    type: 'holiday',
    suggestedTopics: [
      'Merry Christmas từ thương hiệu',
      'Quà Giáng Sinh ý nghĩa',
      'Không khí lễ hội tại công ty',
    ],
  },
];
