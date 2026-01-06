export type AdPlatform = 'facebook_feed' | 'facebook_story' | 'instagram_feed' | 'instagram_story' | 'instagram_reels' | 'google_rsa' | 'google_display' | 'tiktok' | 'zalo_oa' | 'zalo_message' | 'zalo_article' | 'linkedin';
export type AdObjective = 'traffic' | 'conversions' | 'engagement' | 'awareness' | 'leads' | 'app_installs' | 'video_views' | 'messages';
export type AdFunnelStage = 'awareness' | 'consideration' | 'conversion' | 'retention';
export type AdCopyStatus = 'draft' | 'review' | 'approved' | 'published';

export interface PolicyWarning {
  field: string;
  type: 'character_limit' | 'policy_violation' | 'best_practice';
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface AdCopyVariation {
  id: string;
  ad_copy_id: string;
  variation_label: string;
  // Meta fields
  primary_text: string | null;
  headline: string | null;
  description: string | null;
  cta_button: string;
  // Google RSA fields
  headlines: string[];
  descriptions: string[];
  // Common
  char_counts: Record<string, number>;
  policy_warnings: PolicyWarning[];
  is_approved: boolean;
  created_at: string;
}

export interface AdCopy {
  id: string;
  title: string;
  topic: string;
  platform: AdPlatform;
  objective: AdObjective;
  landing_url: string | null;
  brand_template_id: string | null;
  organization_id: string | null;
  user_id: string | null;
  campaign_id: string | null;
  status: AdCopyStatus;
  audience_brief: string | null;
  product_id: string | null;
  persona_id: string | null;
  funnel_stage: AdFunnelStage;
  industry_template_id: string | null;
  industry_template_version: string | null;
  variations?: AdCopyVariation[];
  created_at: string;
  updated_at: string;
  // Joined fields
  brand_template?: { name: string; brand_name: string } | null;
  product?: { name: string } | null;
  persona?: { name: string } | null;
  campaign?: { id: string; name: string } | null;
}

export interface AdCopyFormData {
  topic: string;
  platform: AdPlatform;
  objective: AdObjective;
  landingUrl?: string;
  audienceBrief?: string;
  funnelStage: AdFunnelStage;
  variationCount: number;
  brandTemplateId?: string;
  productId?: string;
  personaId?: string;
  campaignId?: string;
}

// Character limits per platform
export const AD_CHAR_LIMITS = {
  facebook_feed: {
    primary_text: { ideal: 125, max: 500 },
    headline: { ideal: 40, max: 60 },
    description: { ideal: 25, max: 30 },
  },
  facebook_story: {
    primary_text: { ideal: 90, max: 200 },
    headline: { ideal: 30, max: 40 },
  },
  instagram_feed: {
    primary_text: { ideal: 125, max: 2200 },
    headline: { ideal: 40, max: 60 },
    description: { ideal: 25, max: 30 },
  },
  instagram_story: {
    primary_text: { ideal: 90, max: 200 },
    headline: { ideal: 30, max: 40 },
  },
  instagram_reels: {
    primary_text: { ideal: 90, max: 200 },
    headline: { ideal: 30, max: 40 },
  },
  google_rsa: {
    headline: { max: 30 },
    description: { max: 90 },
  },
  google_display: {
    headline: { max: 30 },
    description: { max: 90 },
  },
  tiktok: {
    primary_text: { ideal: 80, max: 150 },
    headline: { ideal: 30, max: 50 },
  },
  zalo_oa: {
    primary_text: { ideal: 100, max: 200 },
    headline: { ideal: 30, max: 50 },
    description: { ideal: 25, max: 40 },
  },
  zalo_message: {
    primary_text: { ideal: 150, max: 300 },
    headline: { ideal: 25, max: 40 },
    description: { ideal: 20, max: 35 },
  },
  zalo_article: {
    primary_text: { ideal: 200, max: 500 },
    headline: { ideal: 50, max: 80 },
    description: { ideal: 100, max: 160 },
  },
  linkedin: {
    primary_text: { ideal: 150, max: 600 },
    headline: { ideal: 70, max: 200 },
    description: { ideal: 60, max: 100 },
  },
} as const;

export const CTA_BUTTONS = [
  { value: 'learn_more', label: 'Tìm hiểu thêm' },
  { value: 'shop_now', label: 'Mua ngay' },
  { value: 'sign_up', label: 'Đăng ký' },
  { value: 'get_offer', label: 'Nhận ưu đãi' },
  { value: 'contact_us', label: 'Liên hệ' },
  { value: 'download', label: 'Tải xuống' },
  { value: 'book_now', label: 'Đặt ngay' },
  { value: 'get_quote', label: 'Nhận báo giá' },
  { value: 'send_message', label: 'Gửi tin nhắn' },
  { value: 'watch_more', label: 'Xem thêm' },
] as const;

export const AD_PLATFORMS = [
  { value: 'facebook_feed', label: 'Facebook Feed', description: 'Bài viết quảng cáo Facebook', icon: '📘' },
  { value: 'facebook_story', label: 'Facebook Story', description: 'Story quảng cáo Facebook 24h', icon: '📖' },
  { value: 'instagram_feed', label: 'Instagram Feed', description: 'Bài viết quảng cáo Instagram', icon: '📷' },
  { value: 'instagram_story', label: 'Instagram Story', description: 'Story quảng cáo Instagram 24h', icon: '📸' },
  { value: 'instagram_reels', label: 'Instagram Reels', description: 'Video ngắn Reels', icon: '🎬' },
  { value: 'google_rsa', label: 'Google RSA', description: 'Responsive Search Ads', icon: '🔍' },
  { value: 'google_display', label: 'Google Display', description: 'Quảng cáo hiển thị GDN', icon: '🖼️' },
  { value: 'tiktok', label: 'TikTok Ads', description: 'Quảng cáo video ngắn', icon: '🎵' },
  { value: 'zalo_oa', label: 'Zalo OA', description: 'Zalo Official Account Post', icon: '💬' },
  { value: 'zalo_message', label: 'Zalo Message', description: 'Tin nhắn quảng cáo Zalo', icon: '📩' },
  { value: 'zalo_article', label: 'Zalo Article', description: 'Bài viết quảng cáo Zalo', icon: '📰' },
  { value: 'linkedin', label: 'LinkedIn Ads', description: 'Quảng cáo B2B chuyên nghiệp', icon: '💼' },
] as const;

// Legacy platforms mapping for backward compatibility
export const LEGACY_PLATFORMS = [
  { value: 'meta_feed', label: 'Meta Feed (legacy)', newValue: 'facebook_feed' },
  { value: 'meta_story', label: 'Meta Story (legacy)', newValue: 'facebook_story' },
  { value: 'meta_reels', label: 'Meta Reels (legacy)', newValue: 'instagram_reels' },
  { value: 'zalo', label: 'Zalo (legacy)', newValue: 'zalo_oa' },
] as const;

// Get display label for platform including legacy support
export function getPlatformLabel(platform: string): string {
  const modern = AD_PLATFORMS.find(p => p.value === platform);
  if (modern) return modern.label;
  
  const legacy = LEGACY_PLATFORMS.find(p => p.value === platform);
  if (legacy) return legacy.label;
  
  return platform;
}

export const AD_OBJECTIVES = [
  { value: 'traffic', label: 'Traffic', description: 'Tăng lượt click về website', icon: '🔗' },
  { value: 'conversions', label: 'Chuyển đổi', description: 'Tối ưu cho mua hàng/đăng ký', icon: '🎯' },
  { value: 'engagement', label: 'Tương tác', description: 'Like, comment, share', icon: '💬' },
  { value: 'awareness', label: 'Nhận diện', description: 'Tiếp cận nhiều người nhất', icon: '👁️' },
  { value: 'leads', label: 'Lead Gen', description: 'Thu thập thông tin khách hàng', icon: '📋' },
] as const;

export const FUNNEL_STAGES = [
  { value: 'awareness', label: 'Nhận biết', description: 'Khách chưa biết đến brand', color: 'bg-blue-500' },
  { value: 'consideration', label: 'Cân nhắc', description: 'Đang so sánh các lựa chọn', color: 'bg-yellow-500' },
  { value: 'conversion', label: 'Chuyển đổi', description: 'Sẵn sàng mua/đăng ký', color: 'bg-green-500' },
  { value: 'retention', label: 'Giữ chân', description: 'Khách hàng cũ quay lại', color: 'bg-purple-500' },
] as const;

export const AD_COPY_STATUSES = [
  { value: 'draft', label: 'Nháp', color: 'text-muted-foreground', bgColor: 'bg-muted' },
  { value: 'review', label: 'Đang duyệt', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  { value: 'approved', label: 'Đã duyệt', color: 'text-green-600', bgColor: 'bg-green-100' },
  { value: 'published', label: 'Đã xuất bản', color: 'text-blue-600', bgColor: 'bg-blue-100' },
] as const;

// Helper functions
export function getPlatformConfig(platform: AdPlatform) {
  return AD_PLATFORMS.find(p => p.value === platform) || AD_PLATFORMS[0];
}

export function getObjectiveConfig(objective: AdObjective) {
  return AD_OBJECTIVES.find(o => o.value === objective) || AD_OBJECTIVES[0];
}

export function getFunnelStageConfig(stage: AdFunnelStage) {
  return FUNNEL_STAGES.find(s => s.value === stage) || FUNNEL_STAGES[0];
}

export function getStatusConfig(status: AdCopyStatus) {
  return AD_COPY_STATUSES.find(s => s.value === status) || AD_COPY_STATUSES[0];
}

export function getCharLimits(platform: AdPlatform) {
  return AD_CHAR_LIMITS[platform] || AD_CHAR_LIMITS.facebook_feed;
}
