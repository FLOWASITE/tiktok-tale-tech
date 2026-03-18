// ============================================
// Image Prompt Pipeline — Data Constants
// ============================================

import type {
  Channel, ImageStylePreset, ContentRole, ContentAngle,
  ChannelImageSpec,
} from './image-prompt-types.ts';

// ============================================
// STYLE PRESETS
// ============================================

export const IMAGE_STYLE_PRESETS: Record<ImageStylePreset, {
  description: string;
  keywords: string[];
  negativeKeywords: string[];
}> = {
  photorealistic: {
    description: 'Ultra-realistic photography style with natural lighting',
    keywords: ['photorealistic', 'DSLR quality', 'natural lighting', '8K resolution', 'professional photography'],
    negativeKeywords: ['illustration', 'cartoon', 'anime', 'drawing', 'sketch'],
  },
  illustration: {
    description: 'Digital illustration with clean lines and vibrant colors',
    keywords: ['digital illustration', 'vector art style', 'clean lines', 'vibrant colors', 'artistic'],
    negativeKeywords: ['photorealistic', 'photograph', 'blurry', 'noisy'],
  },
  minimalist: {
    description: 'Clean Modern — monochromatic, 40-50% negative space, hairline borders, no clutter',
    keywords: ['minimalist', 'clean design', 'simple composition', 'elegant', 'understated', 'soft color palette', 'subtle gradient background', 'white space', 'refined', 'muted tones', 'light grey'],
    negativeKeywords: ['cluttered', 'busy', 'complex', 'detailed', 'ornate', 'pure white background', 'blank', 'empty', 'neon', 'bold colors', 'heavy shadows'],
  },
  '3d_render': {
    description: '3D rendered graphics with depth and dimension',
    keywords: ['3D render', 'octane render', 'volumetric lighting', 'depth', 'CGI quality', 'realistic shadows'],
    negativeKeywords: ['flat', '2D', 'illustration', 'sketch'],
  },
  flat_design: {
    description: 'Bold Infographic — high-contrast blocky shapes, solid colors, no shadows, data-driven layout',
    keywords: ['flat design', 'solid colors', 'geometric shapes', 'no shadows', 'modern UI style', 'bold contrast', 'blocky layout', 'infographic background', 'data visualization'],
    negativeKeywords: ['3D', 'realistic', 'gradient heavy', 'photorealistic', 'soft', 'pastel'],
  },
  watercolor: {
    description: 'Soft watercolor painting aesthetic',
    keywords: ['watercolor', 'soft edges', 'artistic', 'paint texture', 'flowing colors', 'hand-painted feel'],
    negativeKeywords: ['sharp edges', 'digital', 'photorealistic', 'CGI'],
  },
  cinematic: {
    description: 'Movie-like visuals with dramatic lighting and composition',
    keywords: ['cinematic', 'dramatic lighting', 'movie still', 'film grain', 'widescreen composition', 'atmospheric'],
    negativeKeywords: ['flat lighting', 'amateur', 'snapshot', 'casual'],
  },
  abstract: {
    description: 'Abstract art with organic shapes and creative compositions',
    keywords: ['abstract art', 'organic shapes', 'fluid forms', 'artistic expression', 'creative composition', 'color harmony', 'non-representational'],
    negativeKeywords: ['realistic', 'photographic', 'literal', 'human faces', 'portraits', 'people', 'models'],
  },
  geometric: {
    description: 'Corporate — navy/charcoal tones, strict grid alignment, professional shapes, authority-conveying',
    keywords: ['geometric patterns', 'clean shapes', 'modern design', 'symmetry', 'corporate', 'professional', 'navy blue', 'charcoal', 'gold accent', 'business', 'authority'],
    negativeKeywords: ['organic', 'realistic', 'photographs', 'human faces', 'portraits', 'people', 'models', 'playful', 'casual'],
  },
  isometric: {
    description: 'Isometric 3D perspective with tech-inspired aesthetics',
    keywords: ['isometric view', '3D perspective', 'tech aesthetic', 'clean lines', 'isometric illustration', 'data visualization style', 'axonometric'],
    negativeKeywords: ['photorealistic', 'organic', 'messy', 'human faces', 'portraits', 'people', 'models'],
  },
  gradient: {
    description: 'Gradient Flow — neon/vibrant gradient transitions, mesh gradients, futuristic glow, tech lifestyle',
    keywords: ['gradient background', 'smooth color transitions', 'mesh gradients', 'neon colors', 'ambient lighting', 'ethereal feel', 'color flow', 'purple to pink', 'blue to teal', 'futuristic glow'],
    negativeKeywords: ['harsh edges', 'busy patterns', 'cluttered', 'human faces', 'portraits', 'people', 'models', 'noisy textures', 'muted', 'dull'],
  },
  product_only: {
    description: 'Product Focus — clean studio background, product hero shot, transparent bg ready, commercial quality',
    keywords: ['product photography', 'clean background', 'studio lighting', 'product focus', 'commercial quality', 'no people', 'object only', 'item showcase', 'solid color backdrop', 'contact shadow'],
    negativeKeywords: ['people', 'human faces', 'portraits', 'hands', 'models', 'lifestyle with people', 'crowds', 'persons'],
  },
};

// ============================================
// CHANNEL CONFIGURATIONS
// ============================================

export const CHANNEL_IMAGE_SPECS: Record<Channel, ChannelImageSpec> = {
  facebook: {
    aspectRatio: '16:9',
    style: 'vibrant and engaging, social media friendly',
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
    aspectRatio: '4:5',
    style: 'aesthetically pleasing, visually striking, Instagram-worthy',
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
    aspectRatio: '9:16',
    style: 'dynamic, eye-catching, vertical format optimized',
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
  linkedin: {
    aspectRatio: '16:9',
    style: 'professional, clean, business-appropriate',
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
  twitter: {
    aspectRatio: '16:9',
    style: 'bold, shareable, high contrast',
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
  website: {
    aspectRatio: '16:9',
    style: 'high-quality, professional, brand-aligned',
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
    aspectRatio: '16:9',
    style: 'thumbnail style, face focus, expressive',
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
  email: {
    aspectRatio: '16:9',
    style: 'clean, lightweight, email-optimized',
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
  google_maps: {
    aspectRatio: '1:1',
    style: 'local business, welcoming, authentic',
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
  telegram: {
    aspectRatio: '1:1',
    style: 'clean, informative, community-focused',
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
  zalo_oa: {
    aspectRatio: '1:1',
    style: 'friendly, approachable, Vietnamese context',
    mood: 'familiar, trustworthy, local',
    composition: 'clear focal point, works on mobile screens',
    visualDirections: [
      'Mobile-first design for Vietnamese users',
      'Culturally appropriate imagery',
      'Clear and simple messaging through visuals',
      'Family and community themes resonate well',
      'Consider Vietnamese color preferences (red for luck, gold for prosperity)',
    ],
    avoidElements: ['Western-centric imagery', 'overly complex compositions', 'culturally insensitive elements'],
  },
  threads: {
    aspectRatio: '1:1',
    style: 'minimal, contemporary, discussion-friendly',
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
};

// ============================================
// JOURNEY STAGE VISUAL GUIDELINES
// ============================================

export const JOURNEY_STAGE_VISUALS: Record<string, {
  visualStyle: string;
  emotionalTone: string;
  elements: string[];
}> = {
  awareness: {
    visualStyle: 'attention-grabbing, curiosity-inducing',
    emotionalTone: 'intriguing, surprising, question-raising',
    elements: ['bold visuals', 'problem representation', 'relatable scenarios'],
  },
  consideration: {
    visualStyle: 'informative, comparative, educational',
    emotionalTone: 'trustworthy, helpful, knowledgeable',
    elements: ['solution visualization', 'benefit illustration', 'feature highlights'],
  },
  decision: {
    visualStyle: 'action-oriented, confident, conclusive',
    emotionalTone: 'reassuring, motivating, urgent',
    elements: ['product showcase', 'social proof', 'CTA emphasis'],
  },
  retention: {
    visualStyle: 'appreciative, community-focused, value-reinforcing',
    emotionalTone: 'grateful, belonging, exclusive',
    elements: ['customer appreciation', 'community imagery', 'loyalty rewards'],
  },
};

// ============================================
// CONTENT ROLE VISUAL MAPPINGS
// ============================================

export const CONTENT_ROLE_VISUALS: Record<ContentRole, {
  style: string;
  elements: string[];
  avoid: string[];
}> = {
  seed: {
    style: 'attention-grabbing, curiosity-inducing, broad appeal',
    elements: ['bold visuals', 'relatable scenarios', 'emotional hooks', 'question-raising imagery'],
    avoid: ['hard selling', 'product close-ups', 'pricing elements', 'promotional badges'],
  },
  sprout: {
    style: 'educational, trustworthy, informative',
    elements: ['data visualization hints', 'step-by-step imagery', 'expert feel', 'credibility cues'],
    avoid: ['overly promotional', 'urgency cues', 'sales-focused elements'],
  },
  harvest: {
    style: 'action-oriented, product-focused, premium',
    elements: ['product showcase', 'CTA space', 'social proof cues', 'urgency elements'],
    avoid: ['vague abstract imagery', 'purely educational tone', 'no clear subject'],
  },
};

// ============================================
// CONTENT ANGLE VISUAL MAPPINGS
// ============================================

export const CONTENT_ANGLE_VISUALS: Record<ContentAngle, {
  approach: string;
  feel: string;
  elements: string[];
}> = {
  educational: {
    approach: 'Infographic style, step-by-step, clean diagrams',
    feel: 'Trustworthy, helpful, knowledge-sharing',
    elements: ['info icons', 'numbered steps', 'comparison layouts'],
  },
  storytelling: {
    approach: 'Narrative imagery, emotional scenes, journey feel',
    feel: 'Authentic, relatable, emotionally engaging',
    elements: ['real people scenarios', 'before/after hints', 'transformation moments'],
  },
  promotional: {
    approach: 'Product hero shot, offer badges, CTA-ready',
    feel: 'Premium, desirable, action-inducing',
    elements: ['product focus', 'lifestyle context', 'value proposition visual'],
  },
  social_proof: {
    approach: 'Testimonial style, real people, authentic',
    feel: 'Trustworthy, community-focused, believable',
    elements: ['diverse faces', 'customer scenarios', 'success imagery'],
  },
  behind_the_scenes: {
    approach: 'Candid, authentic, workspace/process shots',
    feel: 'Genuine, transparent, human',
    elements: ['work environment', 'team moments', 'process glimpses'],
  },
  qa_faq: {
    approach: 'Question bubbles, conversational, friendly',
    feel: 'Helpful, approachable, interactive',
    elements: ['speech bubbles', 'friendly faces', 'helpful gestures'],
  },
};

// ============================================
// HOOK TYPE VISUAL DIRECTIONS
// ============================================

export const HOOK_TYPE_VISUALS: Record<string, string> = {
  question: 'Use curious/thoughtful expression, visual question marks or mystery elements',
  bold_statement: 'Bold, confident imagery, strong visual statement',
  transformation: 'Before/after visual hints, change/progress imagery',
  story: 'Narrative scene, storytelling moment, emotional connection',
  number: 'Data visualization hints, numbered elements, statistics feel',
  negative: 'Problem visualization, pain point imagery, warning cues',
  social_proof: 'Community feel, testimonial hints, success imagery',
  direct_address: 'Eye contact, pointing gesture, direct engagement',
  shocking_fact: 'Surprising/unexpected visual, revelation moment',
  challenge: 'Competition feel, achievement imagery, challenge visual',
  local: 'Vietnamese cultural elements, local context, familiar scenes',
};

// ============================================
// COUNTRY CHARACTER DIRECTIVES
// ============================================

export const COUNTRY_CHARACTER_DIRECTIVES: Record<string, {
  ethnicity: string;
  culturalContext: string;
  settingHints: string;
}> = {
  VN: {
    ethnicity: 'Vietnamese people with Vietnamese facial features, black hair, warm skin tone',
    culturalContext: 'Vietnamese cultural context, local fashion style, Vietnamese urban/rural settings',
    settingHints: 'Vietnamese street scenes, tropical greenery, modern Vietnamese city aesthetics',
  },
  US: {
    ethnicity: 'Diverse American people reflecting multicultural society',
    culturalContext: 'American cultural context, Western fashion, diverse backgrounds',
    settingHints: 'Modern American urban/suburban settings',
  },
  TH: {
    ethnicity: 'Thai people with Thai facial features, black hair, warm complexion',
    culturalContext: 'Thai cultural context, local fashion, Thai aesthetics',
    settingHints: 'Thai urban settings, tropical environment',
  },
  SG: {
    ethnicity: 'Diverse Singaporean people (Chinese, Malay, Indian descent)',
    culturalContext: 'Singaporean multicultural context, modern Asian fashion',
    settingHints: 'Modern Singapore urban settings, clean city aesthetics',
  },
  MY: {
    ethnicity: 'Malaysian people (Malay, Chinese, Indian descent)',
    culturalContext: 'Malaysian multicultural context, local fashion mix',
    settingHints: 'Malaysian urban and tropical settings',
  },
  ID: {
    ethnicity: 'Indonesian people with Indonesian facial features',
    culturalContext: 'Indonesian cultural context, local fashion',
    settingHints: 'Indonesian tropical urban settings',
  },
  PH: {
    ethnicity: 'Filipino people with Filipino facial features',
    culturalContext: 'Filipino cultural context, local fashion style',
    settingHints: 'Philippine tropical urban settings',
  },
  JP: {
    ethnicity: 'Japanese people with Japanese facial features',
    culturalContext: 'Japanese cultural context, Japanese fashion aesthetics',
    settingHints: 'Japanese urban/modern settings',
  },
  KR: {
    ethnicity: 'Korean people with Korean facial features',
    culturalContext: 'Korean cultural context, Korean fashion trends',
    settingHints: 'Korean modern urban settings',
  },
};

// ============================================
// STYLE COMPUTATION DATA
// ============================================

export const INDUSTRY_STYLE_MAP: Record<string, ImageStylePreset[]> = {
  beauty: ['minimalist', 'cinematic'],
  skincare: ['minimalist', 'photorealistic'],
  fashion: ['cinematic', 'photorealistic'],
  cosmetics: ['minimalist', 'cinematic'],
  technology: ['3d_render', 'flat_design'],
  tech: ['3d_render', 'flat_design'],
  saas: ['flat_design', 'minimalist'],
  software: ['flat_design', '3d_render'],
  food: ['photorealistic', 'watercolor'],
  restaurant: ['photorealistic', 'cinematic'],
  beverage: ['photorealistic', 'minimalist'],
  finance: ['minimalist', 'photorealistic'],
  healthcare: ['photorealistic', 'minimalist'],
  education: ['illustration', 'flat_design'],
  realestate: ['photorealistic', 'cinematic'],
  ecommerce: ['photorealistic', '3d_render'],
  art: ['watercolor', 'illustration'],
  design: ['minimalist', 'illustration'],
};

export const TONE_STYLE_AFFINITY: Record<string, ImageStylePreset[]> = {
  expert: ['minimalist', 'photorealistic'],
  professional: ['photorealistic', 'minimalist'],
  friendly: ['illustration', 'flat_design'],
  playful: ['illustration', 'flat_design'],
  bold: ['cinematic', '3d_render'],
  inspirational: ['cinematic', 'watercolor'],
  trendy: ['3d_render', 'cinematic'],
  elegant: ['minimalist', 'cinematic'],
};
