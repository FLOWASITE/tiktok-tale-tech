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
  },
  zalo_oa: {
    size: '1000x640',
    aspectRatio: '25:16',
    style: 'friendly, approachable, Vietnamese context',
    tips: 'Mobile-optimized, local appeal, clear CTA. Ảnh sẽ được resize xuống 500x320px khi đăng lên Zalo OA.',
    mood: 'familiar, trustworthy, local',
    composition: 'clear focal point, works on mobile screens, optimized for 25:16 banner format',
    visualDirections: [
      'Mobile-first design for Vietnamese users',
      'Culturally appropriate imagery',
      'Clear and simple messaging through visuals',
      'Family and community themes resonate well',
      'Consider Vietnamese color preferences (red for luck, gold for prosperity)',
      'Banner format 25:16 ratio, will be downscaled to 500x320 for Zalo OA',
    ],
    avoidElements: ['Western-centric imagery', 'overly complex compositions', 'culturally insensitive elements', 'tiny text that won\'t survive downscaling'],
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
  },
  google_maps: {
    size: '720x720',
    aspectRatio: '1:1',
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
] as const;

/**
 * Channel to optimal aspect ratio mapping
 */
export const CHANNEL_OPTIMAL_ASPECT_RATIO: Record<Channel, string> = {
  website: '16:9',
  youtube: '16:9',
  facebook: '16:9',
  instagram: '4:5',
  tiktok: '9:16',
  threads: '1:1',
  twitter: '16:9',
  linkedin: '16:9',
  email: '16:9',
  zalo_oa: '25:16',
  telegram: '1:1',
  google_maps: '1:1',
};
