import { ContentGoal } from './multichannel';

export type TopicCategory = 'evergreen' | 'trending' | 'seasonal' | 'reactive';
export type TopicFormat = 
  | 'carousel' 
  | 'script' 
  | 'multichannel'
  // Extended formats (Phase 2)
  | 'blog_post'
  | 'infographic'
  | 'podcast'
  | 'case_study'
  | 'whitepaper'
  | 'webinar'
  | 'live_stream'
  | 'ugc'
  | 'meme'
  | 'poll'
  | 'testimonial'
  | 'newsletter';
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

// Content Series & Cluster types (Phase 2)
export type ClusterRole = 'pillar' | 'cluster' | 'standalone';

// Content Tier - Hero/Hub/Hygiene Model (Google's 3H)
export type ContentTier = 'hero' | 'hub' | 'hygiene';

// Media Ownership - Owned/Earned/Paid Model
export type MediaOwnership = 'owned' | 'earned' | 'paid';

// Content Purpose - Mục đích nội dung chi tiết (dùng khi Content Goal = conversion)
export type ContentPurpose = 
  | 'service_intro'      // Giới thiệu dịch vụ
  | 'product_launch'     // Ra mắt sản phẩm
  | 'promotion'          // Khuyến mãi/Ưu đãi
  | 'lead_generation'    // Thu hút khách hàng tiềm năng
  | 'testimonial_request' // Đánh giá khách hàng
  | 'upsell';            // Bán thêm/Nâng cấp

// Marketing Framework for structured content
export type MarketingFramework = 'PAS' | 'AIDA' | 'FAB' | '4U' | 'STAR' | 'BAB';

export const CONTENT_PURPOSE_LABELS: {
  value: ContentPurpose;
  label: string;
  icon: string;
  color: string;
  description: string;
  suggestedFrameworks: MarketingFramework[];
}[] = [
  {
    value: 'service_intro',
    label: '📦 Giới thiệu dịch vụ',
    icon: 'Package',
    color: 'blue',
    description: 'Highlight lợi ích, quy trình, giá trị dịch vụ',
    suggestedFrameworks: ['FAB', 'PAS', 'AIDA'],
  },
  {
    value: 'product_launch',
    label: '🚀 Ra mắt sản phẩm',
    icon: 'Rocket',
    color: 'purple',
    description: 'Launch mới, tính năng nổi bật',
    suggestedFrameworks: ['AIDA', 'FAB', '4U'],
  },
  {
    value: 'promotion',
    label: '🎁 Khuyến mãi/Ưu đãi',
    icon: 'Gift',
    color: 'orange',
    description: 'Giảm giá, combo, quà tặng',
    suggestedFrameworks: ['PAS', '4U', 'AIDA'],
  },
  {
    value: 'lead_generation',
    label: '🎯 Thu hút khách hàng',
    icon: 'Target',
    color: 'emerald',
    description: 'Lead magnet, đăng ký tư vấn',
    suggestedFrameworks: ['PAS', 'BAB', 'AIDA'],
  },
  {
    value: 'testimonial_request',
    label: '⭐ Đánh giá khách hàng',
    icon: 'Star',
    color: 'amber',
    description: 'Social proof, case study',
    suggestedFrameworks: ['STAR', 'BAB'],
  },
  {
    value: 'upsell',
    label: '📈 Bán thêm/Nâng cấp',
    icon: 'TrendingUp',
    color: 'cyan',
    description: 'Cross-sell, upsell, bundle',
    suggestedFrameworks: ['FAB', 'PAS', '4U'],
  },
];

export const MARKETING_FRAMEWORK_LABELS: {
  value: MarketingFramework;
  label: string;
  fullName: string;
  description: string;
  structure: string[];
}[] = [
  {
    value: 'PAS',
    label: 'PAS',
    fullName: 'Problem - Agitate - Solution',
    description: 'Tốt cho pain point rõ ràng',
    structure: ['🔴 Problem: Nêu vấn đề', '😰 Agitate: Khuếch đại nỗi đau', '✅ Solution: Giải pháp của bạn'],
  },
  {
    value: 'AIDA',
    label: 'AIDA',
    fullName: 'Attention - Interest - Desire - Action',
    description: 'Tốt cho sản phẩm/dịch vụ mới',
    structure: ['👀 Attention: Thu hút chú ý', '💡 Interest: Gây hứng thú', '❤️ Desire: Tạo khao khát', '🎯 Action: Kêu gọi hành động'],
  },
  {
    value: 'FAB',
    label: 'FAB',
    fullName: 'Features - Advantages - Benefits',
    description: 'Tốt cho giới thiệu dịch vụ',
    structure: ['📋 Features: Tính năng', '⚡ Advantages: Ưu điểm', '🎁 Benefits: Lợi ích cho khách'],
  },
  {
    value: '4U',
    label: '4U',
    fullName: 'Useful - Urgent - Unique - Ultra-specific',
    description: 'Tốt cho khuyến mãi, urgency',
    structure: ['💎 Useful: Hữu ích', '⏰ Urgent: Khẩn cấp', '🌟 Unique: Độc đáo', '🎯 Ultra-specific: Cụ thể'],
  },
  {
    value: 'STAR',
    label: 'STAR',
    fullName: 'Situation - Task - Action - Result',
    description: 'Tốt cho case study, testimonial',
    structure: ['📍 Situation: Bối cảnh', '📋 Task: Nhiệm vụ', '⚡ Action: Hành động', '🏆 Result: Kết quả'],
  },
  {
    value: 'BAB',
    label: 'BAB',
    fullName: 'Before - After - Bridge',
    description: 'Tốt cho transformation story',
    structure: ['😔 Before: Trước khi dùng', '😊 After: Sau khi dùng', '🌉 Bridge: Cầu nối (sản phẩm/dịch vụ)'],
  },
];

export const MEDIA_OWNERSHIP_LABELS: { 
  value: MediaOwnership; 
  label: string; 
  icon: string; 
  color: string; 
  bgClass: string;
  textClass: string;
  description: string;
  examples: string[];
}[] = [
  { 
    value: 'owned', 
    label: 'Owned', 
    icon: 'Home', 
    color: 'blue',
    bgClass: 'bg-blue-500/10',
    textClass: 'text-blue-600 dark:text-blue-400',
    description: 'Kênh do brand sở hữu và kiểm soát hoàn toàn',
    examples: ['Website/Blog', 'Email newsletter', 'Fanpage chính thức', 'App', 'YouTube channel']
  },
  { 
    value: 'earned', 
    label: 'Earned', 
    icon: 'Award', 
    color: 'emerald',
    bgClass: 'bg-emerald-500/10',
    textClass: 'text-emerald-600 dark:text-emerald-400',
    description: 'Nội dung viral, được chia sẻ tự nhiên không mất phí',
    examples: ['PR/Media coverage', 'User reviews', 'Word-of-mouth', 'Social shares', 'UGC']
  },
  { 
    value: 'paid', 
    label: 'Paid', 
    icon: 'DollarSign', 
    color: 'amber',
    bgClass: 'bg-amber-500/10',
    textClass: 'text-amber-600 dark:text-amber-400',
    description: 'Quảng cáo trả phí để đạt reach nhanh chóng',
    examples: ['Facebook/Google Ads', 'Sponsored posts', 'Influencer marketing', 'Affiliate']
  },
];

export interface ContentSeries {
  seriesName: string;
  totalParts: number;
  currentPart?: number;
  relatedTopics?: string[];
}

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
  // Content Series & Cluster (Phase 2)
  series?: ContentSeries;
  // Audience Q&A Mining (Phase 4)
  audienceQuestion?: string;       // Original question from audience
  isFromAudienceQA?: boolean;      // Flag if topic is derived from Q&A mining
  clusterRole?: ClusterRole;
  // Content Tier (3H Model)
  contentTier?: ContentTier;       // hero/hub/hygiene classification
  // Media Ownership (Owned/Earned/Paid)
  mediaOwnership?: MediaOwnership; // owned/earned/paid classification
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

export const FORMAT_LABELS: Record<TopicFormat, { label: string; icon: string; color: string; description: string }> = {
  // Core formats (existing)
  carousel: { label: 'Carousel', icon: 'Images', color: 'blue', description: 'Bài đăng nhiều slides, visual storytelling' },
  script: { label: 'Video Script', icon: 'Video', color: 'purple', description: 'Kịch bản video ngắn/dài' },
  multichannel: { label: 'Đa kênh', icon: 'Layers', color: 'emerald', description: 'Nội dung đăng nhiều nền tảng' },
  // Extended formats (Phase 2)
  blog_post: { label: 'Blog Post', icon: 'FileText', color: 'slate', description: 'Bài viết blog SEO-friendly' },
  infographic: { label: 'Infographic', icon: 'PieChart', color: 'orange', description: 'Đồ họa thông tin, data visualization' },
  podcast: { label: 'Podcast', icon: 'Mic', color: 'pink', description: 'Nội dung audio, talkshow' },
  case_study: { label: 'Case Study', icon: 'Briefcase', color: 'amber', description: 'Phân tích case thực tế' },
  whitepaper: { label: 'Whitepaper', icon: 'BookMarked', color: 'indigo', description: 'Tài liệu chuyên sâu, research' },
  webinar: { label: 'Webinar', icon: 'Presentation', color: 'cyan', description: 'Hội thảo trực tuyến' },
  live_stream: { label: 'Live Stream', icon: 'Radio', color: 'red', description: 'Phát trực tiếp, Q&A live' },
  ugc: { label: 'UGC', icon: 'Users', color: 'teal', description: 'User-generated content campaign' },
  meme: { label: 'Meme', icon: 'Smile', color: 'yellow', description: 'Meme marketing, viral content' },
  poll: { label: 'Poll/Quiz', icon: 'Vote', color: 'violet', description: 'Khảo sát, bình chọn, quiz tương tác' },
  testimonial: { label: 'Testimonial', icon: 'Quote', color: 'rose', description: 'Đánh giá khách hàng, social proof' },
  newsletter: { label: 'Newsletter', icon: 'Mail', color: 'sky', description: 'Email marketing, bản tin' },
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

// Cluster Role labels for Content Clusters
export const CLUSTER_ROLE_LABELS: { value: ClusterRole; label: string; icon: string; color: string; description: string }[] = [
  { value: 'pillar', label: 'Pillar', icon: 'Crown', color: 'amber', description: 'Nội dung trụ cột, bao quát chủ đề lớn' },
  { value: 'cluster', label: 'Cluster', icon: 'GitBranch', color: 'blue', description: 'Nội dung chi tiết, liên kết với pillar' },
  { value: 'standalone', label: 'Standalone', icon: 'FileText', color: 'slate', description: 'Nội dung độc lập, không thuộc cluster' },
];

// Content Tier labels for Hero-Hub-Hygiene (3H Model)
export const CONTENT_TIER_LABELS: { 
  value: ContentTier; 
  label: string; 
  icon: string; 
  color: string; 
  bgClass: string;
  textClass: string;
  percentage: string;
  description: string;
  examples: string[];
}[] = [
  { 
    value: 'hero', 
    label: 'Hero', 
    icon: 'Rocket', 
    color: 'purple',
    bgClass: 'bg-gradient-to-r from-purple-500/10 to-pink-500/10',
    textClass: 'text-purple-600 dark:text-purple-400',
    percentage: '10%',
    description: 'Big campaigns, product launches, viral content - tạo awareness mạnh',
    examples: ['Major brand campaigns', 'Product launches', 'Viral challenges', 'Collaboration với influencer lớn']
  },
  { 
    value: 'hub', 
    label: 'Hub', 
    icon: 'Repeat', 
    color: 'blue',
    bgClass: 'bg-gradient-to-r from-blue-500/10 to-cyan-500/10',
    textClass: 'text-blue-600 dark:text-blue-400',
    percentage: '30%',
    description: 'Regular series, relationship-building content - xây dựng audience trung thành',
    examples: ['Weekly series', 'Newsletters', 'Podcast episodes', 'Educational deep-dives']
  },
  { 
    value: 'hygiene', 
    label: 'Hygiene', 
    icon: 'Search', 
    color: 'emerald',
    bgClass: 'bg-gradient-to-r from-emerald-500/10 to-teal-500/10',
    textClass: 'text-emerald-600 dark:text-emerald-400',
    percentage: '60%',
    description: 'Always-on, SEO-driven, problem-solving content - thu hút traffic tự nhiên',
    examples: ['FAQs', 'How-to tutorials', 'Product comparisons', 'Guides & checklists']
  },
];

// Helper: returns the nearest future occurrence of a month/day
function nextOccurrence(month: number, day: number): Date {
  const now = new Date();
  const thisYear = new Date(now.getFullYear(), month, day);
  if (thisYear > now) return thisYear;
  return new Date(now.getFullYear() + 1, month, day);
}

// Vietnamese seasonal events (auto-recur annually)
export const SEASONAL_EVENTS: SeasonalEvent[] = [
  {
    id: 'tet',
    name: 'Tết Nguyên Đán',
    date: nextOccurrence(1, 6), // ~early Feb (approximate, varies by lunar calendar)
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
    date: nextOccurrence(1, 14),
    type: 'event',
    suggestedTopics: [
      'Quà tặng Valentine ý nghĩa',
      'Câu chuyện tình yêu với thương hiệu',
      'Promotion đặc biệt dịp lễ tình nhân',
    ],
  },
  {
    id: 'womens-day-intl',
    name: 'Ngày Quốc tế Phụ nữ 8/3',
    date: nextOccurrence(2, 8),
    type: 'holiday',
    suggestedTopics: [
      'Tri ân phụ nữ 8/3',
      'Câu chuyện phụ nữ truyền cảm hứng',
      'Ưu đãi đặc biệt dành cho phái đẹp',
    ],
  },
  {
    id: 'hung-kings',
    name: 'Giỗ Tổ Hùng Vương',
    date: nextOccurrence(3, 16), // ~10/3 Âm lịch, approximate
    type: 'holiday',
    suggestedTopics: [
      'Tự hào nguồn cội Việt Nam',
      'Văn hóa truyền thống dân tộc',
      'Du lịch nghỉ lễ Giỗ Tổ',
    ],
  },
  {
    id: 'liberation-day',
    name: 'Giải phóng miền Nam 30/4',
    date: nextOccurrence(3, 30),
    type: 'holiday',
    suggestedTopics: [
      'Tự hào lịch sử Việt Nam',
      'Du lịch nghỉ lễ 30/4 - 1/5',
      'Tri ân thế hệ đi trước',
    ],
  },
  {
    id: 'labor-day',
    name: 'Quốc tế Lao động 1/5',
    date: nextOccurrence(4, 1),
    type: 'holiday',
    suggestedTopics: [
      'Tri ân người lao động',
      'Work-life balance tips',
      'Flash sale nghỉ lễ 1/5',
    ],
  },
  {
    id: 'mothers-day',
    name: 'Ngày của Mẹ',
    date: nextOccurrence(4, 10),
    type: 'holiday',
    suggestedTopics: [
      'Quà tặng mẹ ý nghĩa',
      'Tri ân mẹ từ thương hiệu',
      'Content gia đình cảm xúc',
    ],
  },
  {
    id: 'fathers-day',
    name: 'Ngày của Cha',
    date: nextOccurrence(5, 21),
    type: 'holiday',
    suggestedTopics: [
      'Quà tặng cha',
      'Tribute cha - câu chuyện cảm động',
      'Family bonding content',
    ],
  },
  {
    id: 'national-day',
    name: 'Quốc khánh 2/9',
    date: nextOccurrence(8, 2),
    type: 'holiday',
    suggestedTopics: [
      'Tự hào Việt Nam',
      'Du lịch nghỉ lễ 2/9',
      'Văn hóa dân tộc',
    ],
  },
  {
    id: 'mid-autumn',
    name: 'Tết Trung Thu',
    date: nextOccurrence(8, 25),
    type: 'holiday',
    suggestedTopics: [
      'Bánh Trung Thu',
      'Quà tặng Trung Thu',
      'Family content đèn lồng',
    ],
  },
  {
    id: 'womens-day',
    name: 'Ngày Phụ Nữ Việt Nam 20/10',
    date: nextOccurrence(9, 20),
    type: 'holiday',
    suggestedTopics: [
      'Tri ân phụ nữ Việt Nam',
      'Câu chuyện về những người phụ nữ truyền cảm hứng',
      'Ưu đãi đặc biệt dành cho phái đẹp',
    ],
  },
  {
    id: 'halloween',
    name: 'Halloween',
    date: nextOccurrence(9, 31),
    type: 'event',
    suggestedTopics: [
      'Content Halloween sáng tạo',
      'Costume & makeup inspiration',
      'Flash sale Halloween',
    ],
  },
  {
    id: 'singles-day',
    name: 'Singles Day 11/11',
    date: nextOccurrence(10, 11),
    type: 'campaign',
    suggestedTopics: [
      'Mega sale 11/11 - Deal khủng',
      'Self-love & treat yourself campaign',
      'Countdown flash deal 11/11',
    ],
  },
  {
    id: 'black-friday',
    name: 'Black Friday',
    date: nextOccurrence(10, 27),
    type: 'campaign',
    suggestedTopics: [
      'Flash sale Black Friday - Giảm sốc',
      'Countdown Black Friday - Săn deal hot',
      'Hướng dẫn mua sắm thông minh mùa sale',
    ],
  },
  {
    id: 'christmas',
    name: 'Giáng Sinh',
    date: nextOccurrence(11, 25),
    type: 'holiday',
    suggestedTopics: [
      'Merry Christmas từ thương hiệu',
      'Quà Giáng Sinh ý nghĩa',
      'Không khí lễ hội tại công ty',
    ],
  },
  {
    id: 'year-end',
    name: 'Tất Niên',
    date: nextOccurrence(11, 31),
    type: 'event',
    suggestedTopics: [
      'Tổng kết năm - Highlights thương hiệu',
      'Tri ân khách hàng cuối năm',
      'Countdown năm mới',
    ],
  },
  // === Thailand Holidays ===
  {
    id: 'songkran',
    name: 'Songkran (สงกรานต์)',
    date: nextOccurrence(3, 13), // April 13
    type: 'holiday',
    suggestedTopics: [
      'Songkran promotion campaign',
      'Water festival lifestyle content',
      'Thai New Year greeting from brand',
    ],
  },
  {
    id: 'visakha-bucha',
    name: 'Visakha Bucha (วิสาขบูชา)',
    date: nextOccurrence(4, 31), // ~May, varies by lunar
    type: 'holiday',
    suggestedTopics: [
      'Mindfulness & wellness content',
      'Buddhist heritage appreciation',
      'Peaceful brand messaging',
    ],
  },
  {
    id: 'king-birthday-th',
    name: 'HM King Birthday (วันเฉลิมฯ)',
    date: nextOccurrence(6, 28), // July 28
    type: 'holiday',
    suggestedTopics: [
      'Royal tribute & well-wishes',
      'Thai pride content',
      'Yellow-themed campaign',
    ],
  },
  {
    id: 'mothers-day-th',
    name: 'Mother\'s Day Thailand (วันแม่)',
    date: nextOccurrence(7, 12), // August 12
    type: 'holiday',
    suggestedTopics: [
      'Mother appreciation campaign',
      'Family bonding content',
      'Gift guide for mom',
    ],
  },
  {
    id: 'loy-krathong',
    name: 'Loy Krathong (ลอยกระทง)',
    date: nextOccurrence(10, 15), // ~November, varies by lunar
    type: 'holiday',
    suggestedTopics: [
      'Loy Krathong themed campaign',
      'Lantern & water festival content',
      'Romantic seasonal promotion',
    ],
  },
  {
    id: 'fathers-day-th',
    name: 'Father\'s Day Thailand (วันพ่อ)',
    date: nextOccurrence(11, 5), // December 5
    type: 'holiday',
    suggestedTopics: [
      'Father tribute content',
      'Family values campaign',
      'Yellow-themed campaign',
    ],
  },
];
