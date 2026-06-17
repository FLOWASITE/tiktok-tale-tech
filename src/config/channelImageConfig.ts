/**
 * Unified Channel Image Configuration
 * 
 * Single source of truth for channel-specific image settings.
 * Used by both frontend components and backend prompt builder.
 */

import { Channel } from '@/types/multichannel';

export interface ChannelImageSpec {
  /** Display size e.g. "1200x630" */
  size: string;
  /** Aspect ratio e.g. "16:9" */
  aspectRatio: string;
  /** General style description */
  style: string;
  /** Tips for creating images */
  tips: string;
  /** Mood/tone of the image */
  mood: string;
  /** Composition guidelines */
  composition: string;
  /** Platform-specific visual directions */
  visualDirections: string[];
  /** Elements to avoid */
  avoidElements: string[];
  /** AI-first render spec for channel-aware layout planning */
  renderSpec: {
    safeZones: { top: number; right: number; bottom: number; left: number };
    preferredLogoPositions: string[];
    textDensityBudget: number;
    headlineBudget: number;
    ctaBudget: number;
    footerBudget: number;
    layoutBias: 'hero-led' | 'stacked-cards' | 'split-editorial' | 'footer-contact' | 'stat-focus' | 'centered-hero';
    maxFileSizeKB?: number;
  };
}

/**
 * Complete channel image configuration
 * Supports all 12 frontend channels
 */
export const CHANNEL_IMAGE_CONFIG: Record<Channel, ChannelImageSpec> = {
  // Content Platforms
  website: {
    size: '1200x630',
    aspectRatio: '16:9',
    style: 'high-quality, professional, brand-aligned',
    tips: 'High-res, brand colors, compelling imagery',
    mood: 'trustworthy, premium, on-brand',
    composition: 'hero-style, versatile for cropping, works with overlaid text',
    visualDirections: [
      'Hero banner quality - premium and polished',
      'Works with text overlays (consider contrast)',
      'Versatile for different crop ratios',
      'Loading speed conscious - not overly complex',
    ],
    avoidElements: ['busy patterns that interfere with text', 'too many focal points'],
    renderSpec: {
      safeZones: { top: 0.06, right: 0.06, bottom: 0.1, left: 0.06 },
      preferredLogoPositions: ['top-left', 'bottom-right'],
      textDensityBudget: 0.62,
      headlineBudget: 72,
      ctaBudget: 24,
      footerBudget: 72,
      layoutBias: 'split-editorial',
    },
  },
  blogger: {
    size: '1200x630',
    aspectRatio: '16:9',
    style: 'high-quality, professional, brand-aligned',
    tips: 'High-res, brand colors, compelling imagery',
    mood: 'trustworthy, premium, on-brand',
    composition: 'hero-style, versatile for cropping, works with overlaid text',
    visualDirections: [
      'Hero banner quality - premium and polished',
      'Works with text overlays (consider contrast)',
      'Versatile for different crop ratios',
      'Loading speed conscious - not overly complex',
    ],
    avoidElements: ['busy patterns that interfere with text', 'too many focal points'],
    renderSpec: {
      safeZones: { top: 0.06, right: 0.06, bottom: 0.1, left: 0.06 },
      preferredLogoPositions: ['top-left', 'bottom-right'],
      textDensityBudget: 0.62,
      headlineBudget: 72,
      ctaBudget: 24,
      footerBudget: 72,
      layoutBias: 'split-editorial',
    },
  },
  wordpress: {
    size: '1200x675',
    aspectRatio: '16:9',
    style: 'editorial blog hero, professional, brand-aligned',
    tips: 'Featured image cho WordPress post - high-res, đẹp khi crop responsive',
    mood: 'trustworthy, premium, editorial, on-brand',
    composition: 'hero-style featured image, works with H1 title overlay or standalone above the fold',
    visualDirections: [
      'Featured image quality cho blog post',
      'Hoạt động tốt cả khi WordPress theme tự crop',
      'Editorial / magazine feel',
      'Có khoảng trống cho theme overlay title',
    ],
    avoidElements: ['busy patterns', 'logo lớn che trung tâm', 'text overlay nặng (theme đã có H1)'],
    renderSpec: {
      safeZones: { top: 0.06, right: 0.06, bottom: 0.1, left: 0.06 },
      preferredLogoPositions: ['bottom-right'],
      textDensityBudget: 0.4,
      headlineBudget: 0,
      ctaBudget: 0,
      footerBudget: 40,
      layoutBias: 'hero-led',
    },
  },
  shopify: {
    size: '1200x675',
    aspectRatio: '16:9',
    style: 'editorial blog hero, professional, brand-aligned',
    tips: 'Featured image cho WordPress post - high-res, đẹp khi crop responsive',
    mood: 'trustworthy, premium, editorial, on-brand',
    composition: 'hero-style featured image, works with H1 title overlay or standalone above the fold',
    visualDirections: [
      'Featured image quality cho blog post',
      'Hoạt động tốt cả khi WordPress theme tự crop',
      'Editorial / magazine feel',
      'Có khoảng trống cho theme overlay title',
    ],
    avoidElements: ['busy patterns', 'logo lớn che trung tâm', 'text overlay nặng (theme đã có H1)'],
    renderSpec: {
      safeZones: { top: 0.06, right: 0.06, bottom: 0.1, left: 0.06 },
      preferredLogoPositions: ['bottom-right'],
      textDensityBudget: 0.4,
      headlineBudget: 0,
      ctaBudget: 0,
      footerBudget: 40,
      layoutBias: 'hero-led',
    },
  },
  wix: {
    size: '1200x675',
    aspectRatio: '16:9',
    style: 'editorial blog hero, professional, brand-aligned',
    tips: 'Featured image cho Wix post - hero quality, hợp với Editor X / Wix Studio look',
    mood: 'trustworthy, premium, editorial, on-brand',
    composition: 'hero-style featured image, works with H1 title overlay or standalone above the fold',
    visualDirections: [
      'Featured image quality cho Wix blog post',
      'Hoạt động tốt cả khi Wix theme tự crop',
      'Editorial / magazine feel',
      'Có khoảng trống cho theme overlay title',
    ],
    avoidElements: ['busy patterns', 'logo lớn che trung tâm', 'text overlay nặng (theme đã có H1)'],
    renderSpec: {
      safeZones: { top: 0.06, right: 0.06, bottom: 0.1, left: 0.06 },
      preferredLogoPositions: ['bottom-right'],
      textDensityBudget: 0.4,
      headlineBudget: 0,
      ctaBudget: 0,
      footerBudget: 40,
      layoutBias: 'hero-led',
    },
  },
  medium: {
    size: '1200x675',
    aspectRatio: '16:9',
    style: 'editorial blog hero, professional, brand-aligned',
    tips: 'Featured image cho Wix post - hero quality, hợp với Editor X / Wix Studio look',
    mood: 'trustworthy, premium, editorial, on-brand',
    composition: 'hero-style featured image, works with H1 title overlay or standalone above the fold',
    visualDirections: [
      'Featured image quality cho Wix blog post',
      'Hoạt động tốt cả khi Wix theme tự crop',
      'Editorial / magazine feel',
      'Có khoảng trống cho theme overlay title',
    ],
    avoidElements: ['busy patterns', 'logo lớn che trung tâm', 'text overlay nặng (theme đã có H1)'],
    renderSpec: {
      safeZones: { top: 0.06, right: 0.06, bottom: 0.1, left: 0.06 },
      preferredLogoPositions: ['bottom-right'],
      textDensityBudget: 0.4,
      headlineBudget: 0,
      ctaBudget: 0,
      footerBudget: 40,
      layoutBias: 'hero-led',
    },
  },
  youtube: {
    size: '1280x720',
    aspectRatio: '16:9',
    style: 'Thumbnail style, face focus, expressive',
    tips: 'Big text, expressive faces, contrasting colors',
    mood: 'exciting, clickable, curiosity-inducing',
    composition: 'face in foreground, bold text space, high contrast',
    visualDirections: [
      'Thumbnail-optimized for small previews',
      'Use expressive faces when relevant (3x more clicks)',
      'High contrast colors that pop at small sizes',
      'Leave space for title overlay on left/right',
    ],
    avoidElements: ['small details', 'low contrast', 'complex backgrounds', 'text that competes with YouTube title'],
    renderSpec: {
      safeZones: { top: 0.08, right: 0.06, bottom: 0.12, left: 0.08 },
      preferredLogoPositions: ['top-left', 'top-right'],
      textDensityBudget: 0.58,
      headlineBudget: 54,
      ctaBudget: 20,
      footerBudget: 52,
      layoutBias: 'hero-led',
    },
  },
  
  // Social Media
  facebook: {
    size: '1200x630',
    aspectRatio: '16:9',
    style: 'vibrant and engaging, social media friendly',
    tips: 'Use high contrast, minimal text, brand colors',
    mood: 'warm, inviting, community-focused',
    composition: 'centered focal point with breathing room, works well with text overlay',
    visualDirections: [
      'Optimize for news feed scrolling',
      'Include human elements when relevant (faces increase engagement)',
      'Use warm, inviting color tones',
      'Leave space in corners for reaction buttons',
    ],
    avoidElements: ['small text', 'complex details that get lost at small sizes'],
    renderSpec: {
      safeZones: { top: 0.06, right: 0.06, bottom: 0.1, left: 0.06 },
      preferredLogoPositions: ['bottom-right', 'top-left'],
      textDensityBudget: 0.66,
      headlineBudget: 70,
      ctaBudget: 26,
      footerBudget: 74,
      layoutBias: 'split-editorial',
    },
  },
  instagram: {
    size: '1080x1350',
    aspectRatio: '4:5',
    style: 'aesthetically pleasing, visually striking, Instagram-worthy',
    tips: 'Clean composition, cohesive filter, lifestyle feel',
    mood: 'modern, trendy, aspirational',
    composition: 'bold central subject, minimal clutter, grid-friendly',
    visualDirections: [
      'Highly visual and aesthetic-first design',
      'Consider how it looks in a 3x3 grid feed',
      'Use popular Instagram color palettes (warm tones, pastels, or bold contrasts)',
      'Strong visual hierarchy with one clear focal point',
    ],
    avoidElements: ['busy backgrounds', 'multiple competing focal points', 'dark muddy colors'],
    renderSpec: {
      safeZones: { top: 0.08, right: 0.08, bottom: 0.14, left: 0.08 },
      preferredLogoPositions: ['bottom-right', 'top-right'],
      textDensityBudget: 0.52,
      headlineBudget: 54,
      ctaBudget: 22,
      footerBudget: 58,
      layoutBias: 'hero-led',
    },
  },
  pinterest: {
    size: '1000x1500',
    aspectRatio: '2:3',
    style: 'vertical pin layout, search-friendly, idea-pin aesthetic',
    tips: 'Tall vertical 2:3 image, large readable headline overlay if any, brand mark subtle, save-worthy composition',
    mood: 'inspirational, save-worthy, how-to / listicle / lifestyle vibe',
    composition: 'tall vertical 2:3, clear focal subject in upper third, optional bold text overlay at bottom, generous whitespace',
    visualDirections: [
      'Vertical infographic or single hero subject — Pinterest is a discovery search engine',
      'Headline-overlay friendly: leave clean area for short bold text (top or bottom)',
      'Warm, clean, on-trend palette (avoid muddy/dark backgrounds)',
      'Niche-clear visual cue (food, beauty, DIY, fashion, home, travel...)',
      'Optimized for mobile portrait scroll (75% Pinterest traffic is mobile)',
    ],
    avoidElements: ['square or landscape framing', 'low-contrast text overlay', 'busy collage', 'dark muddy backgrounds', 'multiple competing focal points'],
    renderSpec: {
      safeZones: { top: 0.06, right: 0.06, bottom: 0.10, left: 0.06 },
      preferredLogoPositions: ['bottom-right', 'bottom-left'],
      textDensityBudget: 0.45,
      headlineBudget: 60,
      ctaBudget: 22,
      footerBudget: 50,
      layoutBias: 'hero-led',
    },
  },
  tiktok: {
    size: '1080x1920',
    aspectRatio: '9:16',
    style: 'dynamic, eye-catching, vertical format optimized',
    tips: 'Vertical format, bold text, trending style',
    mood: 'energetic, youthful, attention-grabbing',
    composition: 'vertical composition, subject in upper third, space for text at bottom',
    visualDirections: [
      'CRITICAL: Leave bottom 20% clear for captions and UI elements',
      'Bold, high-contrast visuals that pop on mobile screens',
      'Movement and energy in the composition',
      'Trend-aware aesthetics (neon, gradients, duotone)',
    ],
    avoidElements: ['horizontal compositions', 'small details', 'muted colors', 'text in bottom area'],
    renderSpec: {
      safeZones: { top: 0.1, right: 0.08, bottom: 0.22, left: 0.08 },
      preferredLogoPositions: ['top-right', 'top-left'],
      textDensityBudget: 0.42,
      headlineBudget: 42,
      ctaBudget: 18,
      footerBudget: 44,
      layoutBias: 'stacked-cards',
    },
  },
  threads: {
    size: '1080x1080',
    aspectRatio: '1:1',
    style: 'Minimal, text-focused, conversational',
    tips: 'Simple imagery, text overlay, casual feel',
    mood: 'conversational, authentic, relatable',
    composition: 'simple composition, text-friendly space',
    visualDirections: [
      'Clean and minimal aesthetic',
      'Authentic, less polished feel (not overly produced)',
      'Conversation-starter visuals',
      'Works well with follow-up replies in mind',
    ],
    avoidElements: ['overly commercial look', 'stock photo aesthetic'],
    renderSpec: {
      safeZones: { top: 0.08, right: 0.08, bottom: 0.14, left: 0.08 },
      preferredLogoPositions: ['bottom-right', 'top-right'],
      textDensityBudget: 0.5,
      headlineBudget: 50,
      ctaBudget: 20,
      footerBudget: 52,
      layoutBias: 'stacked-cards',
    },
  },
  twitter: {
    size: '1600x900',
    aspectRatio: '16:9',
    style: 'bold, shareable, high contrast',
    tips: 'Strong visuals, minimal clutter, attention-grabbing',
    mood: 'current, newsworthy, conversation-starting',
    composition: 'simple and direct, works at small size, readable thumbnails',
    visualDirections: [
      'Quick to understand at a glance',
      'High contrast for timeline visibility',
      'Works well as a small thumbnail',
      'Conversation-starting visual hook',
    ],
    avoidElements: ['complex details', 'subtle gradients', 'low contrast elements'],
    renderSpec: {
      safeZones: { top: 0.06, right: 0.06, bottom: 0.1, left: 0.06 },
      preferredLogoPositions: ['bottom-right', 'top-left'],
      textDensityBudget: 0.62,
      headlineBudget: 60,
      ctaBudget: 24,
      footerBudget: 68,
      layoutBias: 'hero-led',
    },
  },
  linkedin: {
    size: '1200x627',
    aspectRatio: '16:9',
    style: 'professional, clean, business-appropriate',
    tips: 'Corporate style, data visualization, professional imagery',
    mood: 'trustworthy, competent, industry-focused',
    composition: 'clean background, professional lighting, corporate aesthetic',
    visualDirections: [
      'Corporate and professional aesthetic',
      'Blue tones convey trust and professionalism',
      'Clean, uncluttered backgrounds',
      'Subtle, sophisticated color palette',
      'Business context imagery (office, meeting, presentation)',
    ],
    avoidElements: ['casual imagery', 'overly playful elements', 'bright neon colors', 'memes'],
    renderSpec: {
      safeZones: { top: 0.06, right: 0.06, bottom: 0.1, left: 0.06 },
      preferredLogoPositions: ['bottom-right', 'top-left'],
      textDensityBudget: 0.64,
      headlineBudget: 68,
      ctaBudget: 24,
      footerBudget: 78,
      layoutBias: 'split-editorial',
    },
  },
  
  // Direct Channels
  email: {
    size: '600x300',
    aspectRatio: '16:9',
    style: 'Clean, lightweight, email-optimized',
    tips: 'Simple, fast-loading, clear message',
    mood: 'professional, clear, action-oriented',
    composition: 'centered content, minimal decoration, CTA-friendly',
    visualDirections: [
      'Optimized for email clients (max width 600px)',
      'Fast loading - keep file size small',
      'Clear visual hierarchy for quick scanning',
      'Works with or without images loading',
    ],
    avoidElements: ['heavy gradients', 'complex animations', 'too many colors', 'small text'],
    renderSpec: {
      safeZones: { top: 0.06, right: 0.06, bottom: 0.1, left: 0.06 },
      preferredLogoPositions: ['top-left', 'bottom-right'],
      textDensityBudget: 0.56,
      headlineBudget: 56,
      ctaBudget: 22,
      footerBudget: 54,
      layoutBias: 'hero-led',
    },
  },
  zalo_oa: {
    size: '1280x720',
    aspectRatio: '16:9',
    style: 'friendly, approachable, Vietnamese context',
    tips: 'Mobile-optimized, local appeal, clear CTA. Ảnh sẽ được resize xuống 16:9 khi đăng lên Zalo OA.',
    mood: 'familiar, trustworthy, local',
    composition: 'clear focal point, works on mobile screens, optimized for 16:9 banner format',
    visualDirections: [
      'Mobile-first design for Vietnamese users',
      'Culturally appropriate imagery',
      'Clear and simple messaging through visuals',
      'Family and community themes resonate well',
      'Consider Vietnamese color preferences (red for luck, gold for prosperity)',
      'Banner format 16:9 ratio for Zalo OA article cover',
    ],
    avoidElements: ['Western-centric imagery', 'overly complex compositions', 'culturally insensitive elements'],
    renderSpec: {
      safeZones: { top: 0.06, right: 0.06, bottom: 0.1, left: 0.06 },
      preferredLogoPositions: ['bottom-right', 'top-right'],
      textDensityBudget: 0.58,
      headlineBudget: 58,
      ctaBudget: 22,
      footerBudget: 60,
      layoutBias: 'hero-led',
    },
  },
  telegram: {
    size: '1080x1080',
    aspectRatio: '1:1',
    style: 'Clean, informative, community-focused',
    tips: 'Clear information, brand consistency',
    mood: 'informative, community, engaging',
    composition: 'balanced layout, text-friendly, group-post optimized',
    visualDirections: [
      'Works well in group chats and channels',
      'Clear enough at small preview sizes',
      'Information-dense but not cluttered',
      'Brand consistent for channel identity',
    ],
    avoidElements: ['low resolution', 'too much text', 'complex infographics'],
    renderSpec: {
      safeZones: { top: 0.08, right: 0.08, bottom: 0.14, left: 0.08 },
      preferredLogoPositions: ['bottom-right', 'top-right'],
      textDensityBudget: 0.5,
      headlineBudget: 50,
      ctaBudget: 20,
      footerBudget: 52,
      layoutBias: 'stacked-cards',
    },
  },
  google_maps: {
    size: '1200x900',
    aspectRatio: '4:3',
    style: 'Local business, welcoming, authentic',
    tips: 'Show storefront, products, or team',
    mood: 'welcoming, authentic, local',
    composition: 'storefront or interior shot, real photos preferred',
    visualDirections: [
      'Authentic, real photography (not AI-generated looking)',
      'Show the actual business, storefront, or products',
      'Welcoming and inviting atmosphere',
      'Good lighting that shows space clearly',
    ],
    avoidElements: ['obvious AI artifacts', 'generic stock imagery', 'misleading representations'],
    renderSpec: {
      safeZones: { top: 0.08, right: 0.08, bottom: 0.12, left: 0.08 },
      preferredLogoPositions: ['bottom-right', 'top-right'],
      textDensityBudget: 0.46,
      headlineBudget: 40,
      ctaBudget: 18,
      footerBudget: 42,
      layoutBias: 'footer-contact',
    },
  },
  bluesky: {
    size: '1200x1200',
    aspectRatio: '1:1',
    style: 'Clean, modern, conversational, community-driven',
    tips: 'Square images perform best on Bluesky feed. Simple visuals, text overlay OK. Max 1MB per image, max 4 images.',
    mood: 'casual, friendly, authentic, approachable',
    composition: 'clean layout, single focal point, breathing space',
    visualDirections: ['Clean minimal design', 'Friendly approachable tone', 'Good contrast for readability', 'Square format optimized'],
    avoidElements: ['Cluttered layouts', 'Too many text elements', 'Heavy branding', 'Stock photo feel'],
    renderSpec: {
      safeZones: { top: 40, right: 40, bottom: 40, left: 40 },
      preferredLogoPositions: ['bottom-right'],
      textDensityBudget: 0.30,
      headlineBudget: 45,
      ctaBudget: 0,
      footerBudget: 25,
      layoutBias: 'centered-hero',
      maxFileSizeKB: 976,
    },
  },
};

/**
 * Get optimal aspect ratio for a channel
 */
export function getChannelAspectRatio(channel: Channel): string {
  return CHANNEL_IMAGE_CONFIG[channel]?.aspectRatio || '16:9';
}

/**
 * Get channel image spec
 */
export function getChannelImageSpec(channel: Channel): ChannelImageSpec {
  return CHANNEL_IMAGE_CONFIG[channel] || CHANNEL_IMAGE_CONFIG.facebook;
}

/**
 * Aspect ratio options for UI selectors
 */
export const ASPECT_RATIO_OPTIONS = [
  { value: '1:1', label: '1:1 (Vuông)', description: 'Facebook, Telegram' },
  { value: '16:9', label: '16:9 (Ngang)', description: 'YouTube, LinkedIn, Twitter, Website' },
  { value: '9:16', label: '9:16 (Dọc)', description: 'TikTok, Reels, Stories' },
  { value: '4:5', label: '4:5 (Portrait)', description: 'Instagram Feed Portrait' },
  { value: '2:3', label: '2:3 (Pinterest Pin)', description: 'Pinterest' },
] as const;

/**
 * Channel to optimal aspect ratio mapping
 */
export const CHANNEL_OPTIMAL_ASPECT_RATIO: Record<Channel, string> = {
  website: '16:9',
  blogger: '16:9',
  wordpress: '16:9',
  shopify: '16:9',
  wix: '16:9',
  medium: '16:9',
  youtube: '16:9',
  facebook: '16:9',
  instagram: '4:5',
  pinterest: '2:3',
  tiktok: '9:16',
  threads: '1:1',
  twitter: '16:9',
  linkedin: '16:9',
  email: '16:9',
  zalo_oa: '16:9',
  telegram: '1:1',
  google_maps: '4:3',
  bluesky: '1:1',
};
