export type Platform = 'facebook' | 'tiktok';
export type AITool = 'ideogram' | 'midjourney' | 'dalle' | 'leonardo';

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
  created_at: string;
  updated_at: string;
}

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
}

export const DEFAULT_BRAND_GUIDELINE = `Professional tax expert infographic style.
Use Thuế Hộ by TAF.vn official branding.
Primary colors: TAF red, black, white, high contrast.
Clean, minimal, mobile-first layout.
Clear Vietnamese text, sans-serif font, no distortion.
Include Thuế Hộ by TAF.vn logo at bottom corner, subtle and professional.
Tone: expert, serious, legal-compliance focused.
Avoid cartoon, playful, decorative styles.`;

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
