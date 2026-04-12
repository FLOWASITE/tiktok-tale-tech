import { GraduationCap, Eye, MessageCircle, Award, Target, LucideIcon } from 'lucide-react';
import { ContentPurpose, MarketingFramework } from './topicDiscovery';
import { JourneyStage } from './journeyStageMessaging';
import { ContentRole } from './coreContent';
// Journey Stage → Content Goal Mapping
// Auto-derive contentGoal from journeyStage to reduce user input
export const JOURNEY_TO_GOAL_MAP: Record<JourneyStage, ContentGoal> = {
  awareness: 'awareness',
  consideration: 'education', // So sánh, đánh giá → cần giáo dục
  decision: 'conversion',
  loyalty: 'engagement', // Giữ chân, tương tác
};

// Journey Stage → Content Angle Mapping (reverse mapping for auto-suggestion)
export const JOURNEY_TO_ANGLE_MAP: Partial<Record<JourneyStage, ContentAngle>> = {
  awareness: 'educational',
  consideration: 'social_proof', // So sánh, đánh giá → social proof
  decision: 'promotional',
  loyalty: 'storytelling', // Giữ chân → kể chuyện, gắn kết
};

// Content Goal → Suggested Content Angle Mapping
// Auto-suggest the most effective angle for each goal
export const GOAL_TO_ANGLE_MAP: Partial<Record<ContentGoal, ContentAngle>> = {
  education: 'educational',    // Giáo dục → Tips, hướng dẫn
  awareness: 'storytelling',   // Nhận diện → Câu chuyện, cảm xúc
  engagement: 'qa_faq',        // Tương tác → Q&A, thảo luận
  expertise: 'social_proof',   // Xây chuyên gia → Case study, testimonial
  conversion: 'promotional',   // Chuyển đổi → CTA mạnh, urgency
};

// Content Angle → Suggested Content Role Mapping
// Auto-suggest role based on the chosen content angle approach
// Priority: User-selected > Angle-suggested > Goal-suggested
export const ANGLE_TO_ROLE_MAP: Partial<Record<ContentAngle, ContentRole>> = {
  educational: 'sprout',       // Kiến thức → Build trust, explain
  storytelling: 'seed',        // Kể chuyện → Awareness, emotional connection
  promotional: 'harvest',      // Quảng cáo → Strong CTA, conversion
  social_proof: 'sprout',      // Testimonial → Build credibility/trust
  behind_the_scenes: 'seed',   // Hậu trường → Humanize brand, awareness
  qa_faq: 'sprout',            // Q&A → Address concerns, build trust
};

export type ContentGoal = 
  | 'education'      // Giáo dục
  | 'awareness'      // Nhận diện  
  | 'engagement'     // Tăng tương tác
  | 'expertise'      // Xây chuyên gia
  | 'conversion';    // Chuyển đổi

// Content Angle - Góc tiếp cận nội dung
export type ContentAngle = 
  | 'educational'       // Chia sẻ kiến thức
  | 'storytelling'      // Kể chuyện
  | 'promotional'       // Quảng cáo trực tiếp
  | 'social_proof'      // Đánh giá, testimonial
  | 'behind_the_scenes' // Hậu trường
  | 'qa_faq';           // Q&A / FAQ

export const CONTENT_ANGLES: { value: ContentAngle; label: string; description: string }[] = [
  { value: 'educational', label: 'Kiến thức', description: 'Chia sẻ tips, hướng dẫn, thông tin hữu ích' },
  { value: 'storytelling', label: 'Kể chuyện', description: 'Narrative flow, cảm xúc, câu chuyện thực' },
  { value: 'promotional', label: 'Quảng cáo', description: 'CTA mạnh, urgency, ưu đãi rõ ràng' },
  { value: 'social_proof', label: 'Social Proof', description: 'Đánh giá, testimonial, case study' },
  { value: 'behind_the_scenes', label: 'Hậu trường', description: 'Quy trình, đội ngũ, behind-the-scenes' },
  { value: 'qa_faq', label: 'Q&A', description: 'Giải đáp thắc mắc, FAQ phổ biến' },
];

export type Channel = 
  | 'website'
  | 'facebook'
  | 'instagram'
  | 'twitter'
  | 'google_maps'
  | 'linkedin'
  | 'email'
  | 'youtube'
  | 'zalo_oa'
  | 'telegram'
  | 'tiktok'
  | 'threads';

export type ContentStatus = 'draft' | 'review' | 'approved' | 'partially_published' | 'published';

export interface ChannelImage {
  url: string;
  prompt: string;
  provider: string;
  generatedAt: string;
}

export type ChannelImages = Partial<Record<Channel, ChannelImage>>;

// Status riêng cho từng channel
export type ChannelStatuses = Partial<Record<Channel, ContentStatus>>;

// Helper function to calculate master status from channel statuses
export const calculateMasterStatus = (channelStatuses: ChannelStatuses, selectedChannels: Channel[]): ContentStatus => {
  const statuses = selectedChannels.map(ch => channelStatuses[ch]).filter(Boolean) as ContentStatus[];
  if (statuses.length === 0) return 'draft';
  if (statuses.every(s => s === 'published')) return 'published';
  // Some published, some not → partially_published
  if (statuses.some(s => s === 'published') && !statuses.every(s => s === 'published')) return 'partially_published';
  if (statuses.every(s => s === 'approved' || s === 'published')) return 'approved';
  if (statuses.some(s => s === 'review')) return 'review';
  return 'draft';
};

// Website SEO Data structure for structured SEO metadata
export interface WebsiteSEOData {
  seo_title: string;
  meta_description: string;
  focus_keyword: string;
  secondary_keywords?: string[];
  slug_suggestion?: string;
  heading_structure: {
    h1: string;
    h2s: string[];
    h3s?: string[];
  };
  content?: string; // Full content (if stored separately)
  featured_snippet?: string;
  internal_link_anchors?: string[];
  schema_type?: 'Article' | 'HowTo' | 'FAQ' | 'Product' | 'BlogPosting';
  word_count?: number;
  reading_time_minutes?: number;
  // Advanced SEO fields (AI-generated)
  og_title?: string;
  og_description?: string;
  keyword_density_percent?: number;
  seo_score_estimate?: number;
  faq_items?: Array<{ question: string; answer: string }>;
  canonical_url_suggestion?: string;
}

export interface MultiChannelContent {
  id: string;
  title: string;
  topic: string;
  industry: string | null;
  content_goal: ContentGoal;
  selected_channels: Channel[];
  brand_template_id: string | null;
  brand_name: string;
  brand_guideline: string | null;
  primary_color: string | null;
  website_content: string | null;
  website_seo_data?: WebsiteSEOData | null;
  facebook_content: string | null;
  instagram_content: string | null;
  twitter_content: string | null;
  google_maps_content: string | null;
  linkedin_content: string | null;
  email_content: string | null;
  youtube_content: string | null;
  zalo_oa_content: string | null;
  telegram_content: string | null;
  tiktok_content: string | null;
  threads_content: string | null;
  channel_images: ChannelImages;
  channel_statuses: ChannelStatuses;
  tags: string[];
  status: ContentStatus;
  priority: string | null;
  deadline: string | null;
  campaign_id: string | null;
  user_id: string | null;
  industry_template_version: string | null;
  // Core Content source link
  core_content_id: string | null;
  // Content Role & Angle for strategic context (seed/sprout/harvest)
  content_role: string | null;
  content_angle: string | null;
  // Self-Critique fields
  critique_score: number | null;
  critique_details: CritiqueDetails | null;
  was_refined: boolean | null;
  refinement_count: number | null;
  // Hook data for text overlay auto-fill
  selected_hooks?: MultiChannelSelectedHook[] | null;
  global_hook?: GlobalHook | null;
  created_at: string;
  updated_at: string;
}

// Self-Critique types (8 categories)
export interface CritiqueScores {
  brand_voice: number;          // 0-15
  compliance: number;           // 0-25
  hook_strength: number;        // 0-18
  content_structure: number;    // 0-12
  engagement_potential: number; // 0-10
  channel_fit: number;          // 0-15
  cta_quality: number;          // 0-8
  readability: number;          // 0-7
}

export interface CritiqueIssue {
  category: string;
  severity: 'error' | 'warning' | 'info';
  description: string;
  location?: string;
  suggestion?: string;
}

export interface CritiqueDetails {
  overall_score: number;
  passed: boolean;
  quality_tier: string;
  scores: CritiqueScores;
  issues: CritiqueIssue[];
  suggestions: string[];
  strengths: string[];
  needs_manual_review?: boolean;
}

export interface EditedPreview {
  original: string;
  edited: string;
}

export type EditedPreviews = Record<string, EditedPreview>;

export interface AiSuggestionContext {
  targetPersona?: string;
  targetPersonaId?: string;
  productFit?: string;
  productFitId?: string;
  suggestedJourneyStage?: JourneyStage;
  suggestedContentAngle?: string;
  hook?: string;
  angle?: string;
}

// ============================================
// CHANNEL OPTIMIZATION TYPES
// ============================================

// Quality Mode - Controls speed vs quality tradeoff
export type QualityMode = 'fast' | 'balanced' | 'quality';

// Prompt Style - How AI structures and presents content
export type PromptStyle = 'default' | 'concise' | 'detailed' | 'creative' | 'analytical';

// Hook Intensity - Aggressiveness of opening hooks (matches backend)
export type HookIntensity = 'soft' | 'medium' | 'strong' | 'viral';

// Cost Priority - Token optimization strategy (matches backend)
export type CostPriority = 'economy' | 'balanced' | 'quality';

// Channel Optimization config for a single channel
export interface ChannelOptimization {
  qualityMode: QualityMode;
  promptStyle: PromptStyle;
  hookIntensity: HookIntensity;
  costPriority: CostPriority;
  preferredHookTypes: string[];
  maxTokensOverride?: number;
  allowUserOverride: boolean;
}

export const QUALITY_MODES: { value: QualityMode; label: string; description: string; icon: string; badgeColor: string }[] = [
  { value: 'fast', label: 'Nhanh', description: 'Bỏ qua đánh giá, tốc độ tối đa', icon: '⚡', badgeColor: 'bg-amber-500/15 text-amber-600 border-amber-500/30' },
  { value: 'balanced', label: 'Cân bằng', description: 'Đánh giá + 1 lần tinh chỉnh', icon: '⚖️', badgeColor: 'bg-blue-500/15 text-blue-600 border-blue-500/30' },
  { value: 'quality', label: 'Chất lượng', description: 'Đánh giá + 2 lần tinh chỉnh', icon: '✨', badgeColor: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' },
];

export const PROMPT_STYLES: { value: PromptStyle; label: string; description: string }[] = [
  { value: 'default', label: 'Mặc định', description: 'Cân bằng giữa ngắn gọn và chi tiết' },
  { value: 'concise', label: 'Ngắn gọn', description: 'Tập trung, trực tiếp, ít từ' },
  { value: 'detailed', label: 'Chi tiết', description: 'Giải thích kỹ lưỡng, nhiều context' },
  { value: 'creative', label: 'Sáng tạo', description: 'Tự do, độc đáo, phá cách' },
  { value: 'analytical', label: 'Phân tích', description: 'Logic, data-driven, có cấu trúc' },
];

export const HOOK_INTENSITIES: { value: HookIntensity; label: string; description: string }[] = [
  { value: 'soft', label: 'Nhẹ nhàng', description: 'Tinh tế, chuyên nghiệp, B2B' },
  { value: 'medium', label: 'Vừa phải', description: 'Cân bằng thu hút và chuyên nghiệp' },
  { value: 'strong', label: 'Mạnh mẽ', description: 'Bold, gây chú ý nhanh, scroll-stopping' },
  { value: 'viral', label: 'Viral', description: 'Tối đa engagement, có thể controversial' },
];

export const COST_PRIORITIES: { value: CostPriority; label: string; description: string }[] = [
  { value: 'economy', label: 'Tiết kiệm', description: 'Ít token, nhanh, rẻ (−25%)' },
  { value: 'balanced', label: 'Cân bằng', description: 'Token vừa đủ cho chất lượng tốt' },
  { value: 'quality', label: 'Chất lượng', description: 'Nhiều token hơn, chi tiết (+25%)' },
];

// Preferred hook types for content generation
export const HOOK_TYPES = [
  'question',      // Câu hỏi gợi mở
  'statistic',     // Số liệu thống kê
  'story',         // Mở đầu bằng câu chuyện
  'controversy',   // Quan điểm tranh luận
  'benefit',       // Lợi ích trực tiếp
  'curiosity',     // Tạo sự tò mò
  'urgency',       // Tạo cảm giác cấp bách
  'social_proof',  // Bằng chứng xã hội
  'pain_point',    // Điểm đau khách hàng
] as const;

export type HookType = typeof HOOK_TYPES[number];

// Re-export ContentRole from coreContent for backward compatibility
export type { ContentRole } from './coreContent';

export interface MultiChannelFormData {
  topic: string;
  industry?: string;
  contentGoal?: ContentGoal; // Now optional - auto-derived from journeyStage
  contentAngle?: ContentAngle;
  channels: Channel[];
  brandTemplateId?: string;
  brandVoiceVariantId?: string;
  editedPreviews?: EditedPreviews;
  topicHistoryId?: string;
  contentPurpose?: ContentPurpose;
  marketingFramework?: MarketingFramework;
  // Product/Persona targeting
  productId?: string;
  personaId?: string;
  // Journey Stage for targeted messaging
  journeyStage?: JourneyStage;
  // AI suggestion context from topic refinement
  aiSuggestion?: AiSuggestionContext;
  // Campaign linking
  campaignId?: string;
  // Quality mode for speed vs quality tradeoff
  qualityMode?: QualityMode;
  // Footer Info control - whether to append contact info after generation
  includeFooterInfo?: boolean; // Default: true
  // Hook integration - hooks cho từng kênh hoặc hook chung
  selectedHooks?: MultiChannelSelectedHook[];
  globalHook?: GlobalHook;
  // Core Content Layer - derive content from approved Core Content
  coreContentId?: string; // Optional: transform from Core Content instead of topic-only generation
  // Content Role for Content Orchestration Flow (required when using Core Content)
  contentRole?: ContentRole;
}

// ============================================
// HOOK INTEGRATION TYPES
// ============================================

/**
 * Hook được chọn cho một kênh cụ thể
 * Khi user chọn hook từ MultiChannelHookGenerator
 */
export interface MultiChannelSelectedHook {
  channel: Channel;           // Kênh áp dụng hook
  opening_line: string;       // Câu hook chính
  visual_direction?: string;  // Hướng dẫn visual (cho video/image)
  hook_type?: string;         // Loại hook: question, story, bold_statement, etc.
  psychology?: string;        // Lý do tâm lý tại sao hook này hiệu quả
  text_overlay?: string;      // Text hiển thị trên hình/video
  evaluation?: HookEvaluationResult; // Evaluation score from AI Hook Evaluator
}

/**
 * Hook chung áp dụng cho tất cả kênh
 * Khi user muốn dùng 1 hook cho toàn bộ content
 */
export interface GlobalHook {
  opening_line: string;
  visual_direction?: string;
  hook_type?: string;
  psychology?: string;
  text_overlay?: string;
}

/**
 * Kết quả đánh giá chất lượng hook từ AI Hook Evaluator
 */
export interface HookEvaluationResult {
  combined_score: number;     // 0-100
  regex_score: number;        // 0-100 (quick evaluation)
  ai_score?: number;          // 0-100 (deep evaluation, optional)
  curiosity_gap?: number;     // 0-10
  scroll_stopping?: number;   // 0-10
  suggestions?: string[];     // Gợi ý cải thiện
}

export const CONTENT_GOALS: { value: ContentGoal; label: string; description: string; icon: LucideIcon }[] = [
  { value: 'education', label: 'Giáo dục', description: 'Chia sẻ kiến thức, hướng dẫn', icon: GraduationCap },
  { value: 'awareness', label: 'Nhận diện', description: 'Tăng nhận biết thương hiệu', icon: Eye },
  { value: 'engagement', label: 'Tương tác', description: 'Khuyến khích bình luận, chia sẻ', icon: MessageCircle },
  { value: 'expertise', label: 'Xây chuyên gia', description: 'Thể hiện chuyên môn sâu', icon: Award },
  { value: 'conversion', label: 'Chuyển đổi', description: 'Thúc đẩy hành động mua hàng', icon: Target },
];

export const CONTENT_STATUSES: { value: ContentStatus; label: string; color: string; bgClass: string; textClass: string; borderClass: string }[] = [
  { value: 'draft', label: 'Bản nháp', color: 'gray', bgClass: 'bg-slate-500/15', textClass: 'text-slate-600 dark:text-slate-400', borderClass: 'border-slate-500/30' },
  { value: 'review', label: 'Chờ duyệt', color: 'yellow', bgClass: 'bg-amber-500/15', textClass: 'text-amber-600 dark:text-amber-400', borderClass: 'border-amber-500/30' },
  { value: 'approved', label: 'Đã duyệt', color: 'blue', bgClass: 'bg-blue-500/15', textClass: 'text-blue-600 dark:text-blue-400', borderClass: 'border-blue-500/30' },
  { value: 'partially_published', label: 'Đăng 1 phần', color: 'teal', bgClass: 'bg-teal-500/15', textClass: 'text-teal-600 dark:text-teal-400', borderClass: 'border-teal-500/30' },
  { value: 'published', label: 'Đã đăng', color: 'green', bgClass: 'bg-emerald-500/15', textClass: 'text-emerald-600 dark:text-emerald-400', borderClass: 'border-emerald-500/30' },
];

export const CHANNELS: { value: Channel; label: string; icon: string; color: string; category: string; description: string }[] = [
  // 📝 Thiên về Text — nội dung chủ yếu là văn bản
  { value: 'website', label: 'Website/Blog', icon: 'Globe', color: 'blue', category: 'text', description: 'Bài viết dài, SEO friendly, có CTA' },
  { value: 'linkedin', label: 'LinkedIn', icon: 'Linkedin', color: 'sky', category: 'text', description: 'Chuyên nghiệp, không emoji quá nhiều' },
  { value: 'twitter', label: 'X (Twitter)', icon: 'Twitter', color: 'slate', category: 'text', description: 'Tối đa 280 ký tự, hashtag tinh gọn' },
  { value: 'threads', label: 'Threads', icon: 'AtSign', color: 'slate', category: 'text', description: 'Text-based, tối đa 500 ký tự' },
  { value: 'email', label: 'Email', icon: 'Mail', color: 'amber', category: 'text', description: 'Subject + body, CTA rõ ràng' },
  { value: 'telegram', label: 'Telegram', icon: 'Send', color: 'sky', category: 'text', description: 'Markdown, link preview' },
  // 📸 Thiên về Ảnh — ảnh là yếu tố chính
  { value: 'instagram', label: 'Instagram', icon: 'Instagram', color: 'pink', category: 'image', description: 'Caption ngắn, 20-30 hashtag' },
  { value: 'facebook', label: 'Facebook', icon: 'Facebook', color: 'indigo', category: 'image', description: 'Post ngắn, hashtag, emoji phù hợp' },
  { value: 'google_maps', label: 'Google Maps', icon: 'MapPin', color: 'green', category: 'image', description: 'Bài đăng ngắn cho doanh nghiệp' },
  { value: 'zalo_oa', label: 'Zalo OA', icon: 'MessageCircle', color: 'blue', category: 'image', description: 'Tin nhắn ngắn, thân thiện' },
  // 🎬 Thiên về Video — nội dung video là core
  { value: 'tiktok', label: 'TikTok', icon: 'Music2', color: 'pink', category: 'video', description: 'Script video ngắn 15-60s, hook 3 giây' },
  { value: 'youtube', label: 'YouTube', icon: 'Youtube', color: 'red', category: 'video', description: 'Script video, mô tả, tags tối ưu' },
];

// Sample topic suggestions by industry
export const TOPIC_SUGGESTIONS: string[] = [
  'Xu hướng thị trường 2024 và cách tận dụng cơ hội',
  '5 sai lầm phổ biến khi mới bắt đầu và cách tránh',
  'Case study thành công từ khách hàng thực tế',
  'Hướng dẫn từng bước cho người mới bắt đầu',
  'So sánh các giải pháp phổ biến trên thị trường',
  'Mẹo tiết kiệm chi phí hiệu quả',
];
