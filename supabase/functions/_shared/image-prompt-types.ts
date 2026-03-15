// ============================================
// Image Prompt Pipeline — Types & Interfaces
// ============================================

// All 12 channels supported by frontend - aligned with src/types/multichannel.ts
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

export interface BrandColors {
  primary: string;
  secondary?: string[];
}

export interface BrandImageContext {
  brandName: string;
  brandColors?: BrandColors;
  imageStyle?: string;
  logoUrl?: string;
  industry?: string[];
}

export interface PersonaContext {
  name: string;
  ageRange?: string;
  gender?: string;
  occupation?: string;
  interests?: string[];
  communicationStyle?: string;
}

// Content Role for Content Orchestration Flow
export type ContentRole = 'seed' | 'sprout' | 'harvest';

// Content Angle types
export type ContentAngle =
  | 'educational'
  | 'storytelling'
  | 'promotional'
  | 'social_proof'
  | 'behind_the_scenes'
  | 'qa_faq';

// Image Content Type for Social Graphics
export type ImageContentType = 'background_only' | 'with_text';

// Text positioning options
export type TextPosition = 'center' | 'top' | 'bottom' | 'top-left' | 'bottom-right';

// Typography style options
export type TypographyStyle = 'modern' | 'classic' | 'bold' | 'minimal' | 'clean' | 'outline' | 'glow';

export interface FooterInfo {
  company_name?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
}

// Prompt Mode for 3-layer architecture
export type PromptMode = 'full' | 'brand_only' | 'raw';

export interface ImagePromptParams {
  channel: Channel;
  contentSummary: string;
  brand: BrandImageContext;
  aspectRatio?: string;
  persona?: PersonaContext;
  journeyStage?: 'awareness' | 'consideration' | 'decision' | 'retention';
  contentType?: 'promotional' | 'educational' | 'entertainment' | 'inspirational';
  imageStylePreset?: ImageStylePreset;
  negativePrompt?: string;
  contentRole?: ContentRole;
  contentAngle?: ContentAngle;
  hookMessage?: string;
  hookType?: string;
  imageContentType?: ImageContentType;
  textToInclude?: string;
  textPosition?: TextPosition;
  typographyStyle?: TypographyStyle;
  countryCode?: string;
  footerInfo?: FooterInfo;
  promptMode?: PromptMode;
}

// Image Style Presets
export type ImageStylePreset = 'photorealistic' | 'illustration' | 'minimalist' | '3d_render' | 'flat_design' | 'watercolor' | 'cinematic' | 'abstract' | 'geometric' | 'isometric' | 'gradient' | 'product_only';

// ============================================
// Pipeline Types
// ============================================

export interface PromptSegment {
  id: string;
  position: 'prefix' | 'core' | 'suffix';
  priority: number;
  content: string;
}

export interface PromptContext {
  params: ImagePromptParams;
  channelSpec: ChannelImageSpec;
  finalAspectRatio: string;
  isWithText: boolean;
}

export interface ChannelImageSpec {
  aspectRatio: string;
  style: string;
  mood: string;
  composition: string;
  visualDirections: string[];
  avoidElements: string[];
}

export type PromptBuilder = (ctx: PromptContext) => PromptSegment | null;
