export type Platform = 'facebook' | 'tiktok';
export type AITool = 'ideogram' | 'midjourney' | 'dalle' | 'leonardo';
export type CarouselStatus = 'draft' | 'review' | 'approved' | 'published';
export type CarouselStyleType = 'seamless' | 'educational' | 'listicle' | 'gallery';

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
