export type Platform = 'facebook' | 'tiktok';
export type AITool = 'ideogram' | 'midjourney' | 'dalle' | 'leonardo';
export type CarouselStatus = 'draft' | 'review' | 'approved' | 'published';
export type CarouselStyleType = 'seamless' | 'educational' | 'listicle' | 'gallery';
export type VisualPresetType = 'minimalist' | 'flat_design' | 'gradient' | 'geometric' | 'illustration' | 'product_only';

export interface CarouselSlide {
  slideNumber: number;
  objective: string;        // [1] Mục tiêu slide
  textContent: string;      // [2] Nội dung chữ xuất hiện trên ảnh
  designStyle: string;      // [3] Phong cách thiết kế
  colorLayout: string;      // [4] Màu sắc – bố cục
  aspectRatio: string;      // [5] Tỉ lệ khung hình
  technicalRequirements: string; // [6] Yêu cầu kỹ thuật
  fullPrompt: string;       // Prompt đầy đủ cho AI tool
}

export interface Carousel {
  id: string;
  title: string;
  topic: string;
  platform: Platform;
  slide_count: number;
  ai_tool: AITool;
  brand_name: string;
  brand_guideline: string | null;
  include_logo: boolean;
  slides_content: CarouselSlide[];
  caption_suggestion: string | null;
  cta_suggestion: string | null;
  status: CarouselStatus;
  carousel_style: CarouselStyleType;
  visual_preset: VisualPresetType;
  user_id: string | null;
  industry_template_id?: string | null;
  industry_template_version?: string | null;
  campaign_id?: string | null;
  // Self-Critique fields
  critique_score?: number | null;
  critique_details?: Record<string, unknown> | null;
  was_refined?: boolean | null;
  refinement_count?: number | null;
  needs_manual_review?: boolean | null;
  created_at: string;
  updated_at: string;
}

export const CAROUSEL_STATUS_CONFIG: Record<CarouselStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  draft: { label: 'Nháp', variant: 'secondary' },
  review: { label: 'Chờ duyệt', variant: 'outline' },
  approved: { label: 'Đã duyệt', variant: 'default' },
  published: { label: 'Đã đăng', variant: 'default' },
};

export interface CarouselFormData {
  topic: string;
  platform: Platform;
  slideCount: number;
  aiTool: AITool;
  brandName: string;
  brandGuideline: string;
  includeLogo: boolean;
  logoUrl?: string | null;
  brandTemplateId?: string;
  topicHistoryId?: string;
  campaignId?: string;
  carouselStyle: CarouselStyleType;
  visualPreset: VisualPresetType;
}

export const DEFAULT_BRAND_GUIDELINE = '';

export const PLATFORM_OPTIONS: { value: Platform; label: string }[] = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'tiktok', label: 'TikTok' },
];

export const AI_TOOL_OPTIONS: { value: AITool; label: string; description: string }[] = [
  { value: 'ideogram', label: 'Ideogram', description: 'Ưu tiên text clarity' },
  { value: 'midjourney', label: 'Midjourney', description: 'Chất lượng cao' },
  { value: 'dalle', label: 'DALL·E', description: 'OpenAI' },
  { value: 'leonardo', label: 'Leonardo', description: 'Đa dạng phong cách' },
];

export const SLIDE_COUNT_OPTIONS = [5, 6, 7, 8, 9, 10];

export const CAROUSEL_STYLE_OPTIONS: { value: CarouselStyleType; label: string; description: string; icon: string }[] = [
  { value: 'seamless', label: 'Trượt liền mạch', description: 'Các phần tử nối liền giữa các slide, tạo cảm giác bức tranh dài', icon: '🎞️' },
  { value: 'educational', label: 'Giáo dục theo bước', description: 'Kể chuyện từng bước: Hook → Giải thích → CTA', icon: '📚' },
  { value: 'listicle', label: 'Danh sách Top-list', description: 'Mỗi slide = 1 điểm, layout đồng nhất, đánh số rõ ràng', icon: '📋' },
  { value: 'gallery', label: 'Bộ sưu tập ảnh', description: 'Tập hợp ảnh cùng chủ đề, minimal text, ưu tiên visual', icon: '🖼️' },
];
