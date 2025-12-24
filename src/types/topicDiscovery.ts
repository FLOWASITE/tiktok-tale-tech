import { ContentGoal } from './multichannel';

export type TopicCategory = 'evergreen' | 'trending' | 'seasonal' | 'reactive';
export type TopicFormat = 'carousel' | 'script' | 'multichannel';
export type EngagementLevel = 'high' | 'medium' | 'low';
export type SortOption = 'overall' | 'brandFit' | 'trend' | 'engagement' | 'competition';

export interface TopicScores {
  brandFit: number;      // 0-100: Phù hợp với brand positioning
  trend: number;         // 0-100: Mức độ trending hiện tại
  competition: number;   // 0-100: Độ cạnh tranh (cao = ít cạnh tranh = tốt)
  engagement: number;    // 0-100: Tiềm năng tương tác
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
