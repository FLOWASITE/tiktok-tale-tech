/**
 * Enhanced Image Prompt Builder
 * 
 * Builds context-rich prompts for AI image generation using:
 * - Brand Colors and Visual Identity
 * - Content Theme and Summary
 * - Channel-specific Rules
 * - Persona Context (if available)
 * - Journey Stage Visual Guidelines
 */

// ============================================
// TYPES
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

// NEW: Image Content Type for Social Graphics
export type ImageContentType = 'background_only' | 'with_text';

// NEW: Text positioning options
export type TextPosition = 'center' | 'top' | 'bottom' | 'top-left' | 'bottom-right';

// NEW: Typography style options
// With background: modern, classic, bold, minimal
// Without background (text-shadow only): clean, outline, glow
export type TypographyStyle = 'modern' | 'classic' | 'bold' | 'minimal' | 'clean' | 'outline' | 'glow';

export interface FooterInfo {
  company_name?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
}

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
  // Content Role and Angle for strategic visuals
  contentRole?: ContentRole;
  contentAngle?: ContentAngle;
  // Hook integration
  hookMessage?: string;
  hookType?: string;
  // NEW: Text-in-image params for Social Graphics
  imageContentType?: ImageContentType;
  textToInclude?: string;
  textPosition?: TextPosition;
  typographyStyle?: TypographyStyle;
  // Country-specific character appearance
  countryCode?: string;
  // Footer/contact info from brand template
  footerInfo?: FooterInfo;
}

// Image Style Presets
export type ImageStylePreset = 'photorealistic' | 'illustration' | 'minimalist' | '3d_render' | 'flat_design' | 'watercolor' | 'cinematic' | 'abstract' | 'geometric' | 'isometric' | 'gradient' | 'product_only';

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
    description: 'Clean, simple design with subtle colors and soft gradients',
    keywords: ['minimalist', 'clean design', 'simple composition', 'elegant', 'understated', 'soft color palette', 'subtle gradient background'],
    negativeKeywords: ['cluttered', 'busy', 'complex', 'detailed', 'ornate', 'pure white background', 'blank', 'empty'],
  },
  '3d_render': {
    description: '3D rendered graphics with depth and dimension',
    keywords: ['3D render', 'octane render', 'volumetric lighting', 'depth', 'CGI quality', 'realistic shadows'],
    negativeKeywords: ['flat', '2D', 'illustration', 'sketch'],
  },
  flat_design: {
    description: 'Flat design style with solid colors and geometric shapes',
    keywords: ['flat design', 'solid colors', 'geometric shapes', 'no shadows', 'modern UI style'],
    negativeKeywords: ['3D', 'realistic', 'gradient heavy', 'photorealistic'],
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
  // New styles - all designed to avoid people
  abstract: {
    description: 'Abstract art with organic shapes and creative compositions',
    keywords: ['abstract art', 'organic shapes', 'fluid forms', 'artistic expression', 'creative composition', 'color harmony', 'non-representational'],
    negativeKeywords: ['realistic', 'photographic', 'literal', 'human faces', 'portraits', 'people', 'models'],
  },
  geometric: {
    description: 'Clean geometric patterns with modern shapes',
    keywords: ['geometric patterns', 'clean shapes', 'modern design', 'symmetry', 'polygons', 'lines and angles', 'mathematical precision'],
    negativeKeywords: ['organic', 'realistic', 'photographs', 'human faces', 'portraits', 'people', 'models'],
  },
  isometric: {
    description: 'Isometric 3D perspective with tech-inspired aesthetics',
    keywords: ['isometric view', '3D perspective', 'tech aesthetic', 'clean lines', 'isometric illustration', 'data visualization style', 'axonometric'],
    negativeKeywords: ['photorealistic', 'organic', 'messy', 'human faces', 'portraits', 'people', 'models'],
  },
  gradient: {
    description: 'Smooth gradient backgrounds with color transitions',
    keywords: ['gradient background', 'smooth color transitions', 'mesh gradients', 'soft colors', 'ambient lighting', 'ethereal feel', 'color flow'],
    negativeKeywords: ['harsh edges', 'busy patterns', 'cluttered', 'human faces', 'portraits', 'people', 'models', 'noisy textures'],
  },
  product_only: {
    description: 'Clean product-focused imagery without people',
    keywords: ['product photography', 'clean background', 'studio lighting', 'product focus', 'commercial quality', 'no people', 'object only', 'item showcase'],
    negativeKeywords: ['people', 'human faces', 'portraits', 'hands', 'models', 'lifestyle with people', 'crowds', 'persons'],
  },
};

// ============================================
// CHANNEL CONFIGURATIONS (Enhanced with specific visual directions)
// ============================================

const CHANNEL_IMAGE_SPECS: Record<Channel, {
  aspectRatio: string;
  style: string;
  mood: string;
  composition: string;
  visualDirections: string[];  // Channel-specific visual instructions
  avoidElements: string[];     // Elements to avoid for this channel
}> = {
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
    aspectRatio: '1:1',
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
  // New channels added to match frontend
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
  // Renamed from 'zalo' to 'zalo_oa' to match frontend
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

const JOURNEY_STAGE_VISUALS: Record<string, {
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
// PROMPT BUILDERS
// ============================================

/**
 * Build color guidance section
 */
function buildColorSection(colors?: BrandColors): string {
  if (!colors?.primary) return '';
  
  let colorGuide = `\n\n## COLOR PALETTE (CRITICAL - MUST USE):\n`;
  colorGuide += `- PRIMARY COLOR: ${colors.primary} - Use this as the dominant accent color\n`;
  
  if (colors.secondary && colors.secondary.length > 0) {
    colorGuide += `- SECONDARY COLORS: ${colors.secondary.join(', ')} - Use as complementary accents\n`;
  }
  
  colorGuide += `- Create a cohesive color harmony using these brand colors\n`;
  colorGuide += `- Ensure sufficient contrast for readability if text is overlaid`;
  
  return colorGuide;
}

/**
 * Build persona-targeted visual section
 */
function buildPersonaVisualSection(persona?: PersonaContext): string {
  if (!persona) return '';
  
  let section = `\n\n## TARGET AUDIENCE VISUAL CONSIDERATIONS:\n`;
  section += `- Target Persona: ${persona.name}\n`;
  
  if (persona.ageRange) {
    section += `- Age Range: ${persona.ageRange} - Use age-appropriate visual language\n`;
  }
  
  if (persona.occupation) {
    section += `- Occupation: ${persona.occupation} - Include relevant professional context\n`;
  }
  
  if (persona.interests && persona.interests.length > 0) {
    section += `- Interests: ${persona.interests.slice(0, 3).join(', ')} - Incorporate relatable elements\n`;
  }
  
  if (persona.communicationStyle) {
    section += `- Preferred Style: ${persona.communicationStyle}\n`;
  }
  
  return section;
}

/**
 * Build journey stage visual section
 */
function buildJourneyStageSection(stage?: string): string {
  if (!stage || !JOURNEY_STAGE_VISUALS[stage]) return '';
  
  const stageGuide = JOURNEY_STAGE_VISUALS[stage];
  
  let section = `\n\n## FUNNEL STAGE VISUAL STRATEGY (${stage.toUpperCase()}):\n`;
  section += `- Visual Style: ${stageGuide.visualStyle}\n`;
  section += `- Emotional Tone: ${stageGuide.emotionalTone}\n`;
  section += `- Key Elements to Include: ${stageGuide.elements.join(', ')}`;
  
  return section;
}

// ============================================
// CONTENT ROLE VISUAL MAPPINGS
// ============================================

const CONTENT_ROLE_VISUALS: Record<ContentRole, {
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

const CONTENT_ANGLE_VISUALS: Record<ContentAngle, {
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

const HOOK_TYPE_VISUALS: Record<string, string> = {
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

/**
 * Build content role visual section
 */
function buildContentRoleSection(role?: ContentRole): string {
  if (!role || !CONTENT_ROLE_VISUALS[role]) return '';
  
  const roleGuide = CONTENT_ROLE_VISUALS[role];
  const roleLabels: Record<ContentRole, string> = {
    seed: 'SEED - Awareness Stage',
    sprout: 'SPROUT - Trust Building Stage',
    harvest: 'HARVEST - Conversion Stage',
  };
  
  let section = `\n\n## CONTENT ROLE (${roleLabels[role]}):\n`;
  section += `- Visual Style: ${roleGuide.style}\n`;
  section += `- Include: ${roleGuide.elements.join(', ')}\n`;
  section += `- AVOID: ${roleGuide.avoid.join(', ')}`;
  
  return section;
}

/**
 * Build content angle visual section
 */
function buildContentAngleSection(angle?: ContentAngle): string {
  if (!angle || !CONTENT_ANGLE_VISUALS[angle]) return '';
  
  const angleGuide = CONTENT_ANGLE_VISUALS[angle];
  
  let section = `\n\n## CONTENT ANGLE (${angle.toUpperCase().replace('_', ' ')}):\n`;
  section += `- Visual Approach: ${angleGuide.approach}\n`;
  section += `- Feel: ${angleGuide.feel}\n`;
  section += `- Key Elements: ${angleGuide.elements.join(', ')}`;
  
  return section;
}

/**
 * Build hook message visual section
 */
function buildHookSection(hookMessage?: string, hookType?: string): string {
  if (!hookMessage) return '';
  
  let section = `\n\n## HOOK MESSAGE (CRITICAL - Image must visually convey this):\n`;
  section += `"${hookMessage}"\n`;
  
  if (hookType && HOOK_TYPE_VISUALS[hookType]) {
    section += `- Hook Type: ${hookType} - ${HOOK_TYPE_VISUALS[hookType]}`;
  }
  
  return section;
}

/**
 * Build text-in-image section for Social Graphics
 */
function buildTextInImageSection(
  textToInclude?: string,
  textPosition?: TextPosition,
  typographyStyle?: TypographyStyle
): string {
  if (!textToInclude) return '';
  
  const positionGuide: Record<TextPosition, string> = {
    'center': 'Text prominently centered in the image, making it the focal point',
    'top': 'Text positioned in the upper third, with visual elements below',
    'bottom': 'Text positioned in the lower third, with visual elements above',
    'top-left': 'Text in the upper left corner, quote-style placement',
    'bottom-right': 'Text in the lower right corner, caption-style placement',
  };
  
  const styleGuide: Record<TypographyStyle, string> = {
    // Styles with background box
    'modern': 'Clean sans-serif font, contemporary and professional',
    'classic': 'Elegant serif font, timeless and sophisticated',
    'bold': 'Heavy weight, impactful and attention-grabbing',
    'minimal': 'Thin weight, subtle and refined',
    // Styles without background (text shadow/glow for contrast)
    'clean': 'Clean text with subtle shadow, no background box',
    'outline': 'Text with outline stroke for high contrast, no background box',
    'glow': 'Glowing text effect, no background box',
  };
  
  const pos = textPosition || 'center';
  const style = typographyStyle || 'modern';
  
  return `

## TEXT IN IMAGE (REQUIRED - Social Graphic Mode):
INCLUDE this exact text prominently in the image:
"${textToInclude}"

Typography Guidelines:
- Position: ${positionGuide[pos]}
- Typography Style: ${styleGuide[style]}
- Ensure HIGH CONTRAST between text and background for readability
- Text should be the PRIMARY FOCAL ELEMENT of the image
- Use brand colors for text if they provide good contrast
- Text must be LARGE and CLEARLY READABLE at social media viewing sizes
- Add subtle text shadow or backdrop if needed for legibility`;
}

/**
 * Build structured layout section for Social Graphics with title, contact info, and CTA
 * Only applies to 'with_text' mode
 */
function buildStructuredLayoutSection(
  footerInfo?: FooterInfo,
  brandColors?: BrandColors
): string {
  // Build contact info lines from footer data
  const contactLines: string[] = [];
  if (footerInfo?.address) contactLines.push(`📍 ${footerInfo.address}`);
  if (footerInfo?.phone) contactLines.push(`📞 ${footerInfo.phone}`);
  if (footerInfo?.email) contactLines.push(`📧 ${footerInfo.email}`);
  if (footerInfo?.website) contactLines.push(`🌐 ${footerInfo.website}`);

  const hasContactInfo = contactLines.length > 0;

  let section = `

## BỐ CỤC ẢNH SOCIAL GRAPHIC (BẮT BUỘC):

### VÙNG TRÊN (20% trên cùng):
- TIÊU ĐỀ: Chữ lớn, đậm (Bold), nổi bật, gây tò mò
- Font: Sans-serif đậm, PHẢI hỗ trợ tiếng Việt có dấu đầy đủ
- Màu: Trắng hoặc màu sáng trên nền tối, hoặc màu đậm trên nền sáng
- Tiêu đề lấy từ nội dung chính hoặc hook message

### VÙNG GIỮA (${hasContactInfo ? '50-60' : '60-70'}%):
- Hình ảnh chính / visual concept minh họa cho nội dung
- Để trống không gian thở, không chèn quá nhiều element
- Visual phải liên quan trực tiếp đến chủ đề bài viết`;

  if (hasContactInfo) {
    section += `

### VÙNG DƯỚI (20-30% dưới cùng):
- THÔNG TIN LIÊN HỆ với emojis tương ứng:
${contactLines.map(l => `  ${l}`).join('\n')}
- Màu chữ: Trắng hoặc sáng, dễ đọc trên nền tối
- Font size nhỏ hơn tiêu đề nhưng vẫn rõ ràng

### CTA (Call-to-Action):
- Đặt ngay dưới hoặc bên cạnh thông tin liên hệ
- Màu nổi bật: Vàng (#FFD700) hoặc Cam (#FF8C00) — tạo contrast mạnh
- Dạng button hoặc banner nổi bật
- Ví dụ: "Liên hệ ngay để được tư vấn miễn phí!" hoặc CTA phù hợp nội dung`;
  } else {
    section += `

### VÙNG DƯỚI (20% dưới cùng):
- CTA (Call-to-Action) nổi bật
- Màu nổi bật: Vàng (#FFD700) hoặc Cam (#FF8C00)
- Dạng button hoặc banner
- CTA phù hợp với nội dung bài viết`;
  }

  section += `

### QUY TẮC MÀU SẮC VÀ FONT CHỮ:
- Tone chủ đạo: Sử dụng brand primary color${brandColors?.primary ? ` (${brandColors.primary})` : ''}
- CTA: Màu vàng hoặc cam để tạo điểm nhấn mạnh
- Thông tin liên hệ: Màu trắng hoặc sáng trên nền tối
- Font chữ: PHẢI hỗ trợ tiếng Việt có dấu (ă, â, đ, ê, ô, ơ, ư)
- Phân biệt rõ ràng giữa tiêu đề (lớn, đậm), nội dung, và CTA (nổi bật)`;

  return section;
}

/**
 * Build image style preset section
 */
function buildStylePresetSection(stylePreset?: ImageStylePreset): string {
  if (!stylePreset || !IMAGE_STYLE_PRESETS[stylePreset]) return '';
  
  const preset = IMAGE_STYLE_PRESETS[stylePreset];
  
  let section = `\n\n## IMAGE STYLE PRESET (${stylePreset.toUpperCase().replace('_', ' ')}):\n`;
  section += `- Description: ${preset.description}\n`;
  section += `- Apply these qualities: ${preset.keywords.join(', ')}\n`;
  section += `- AVOID: ${preset.negativeKeywords.join(', ')}`;
  
  return section;
}

// ============================================
// COUNTRY CHARACTER DIRECTIVES
// ============================================

const COUNTRY_CHARACTER_DIRECTIVES: Record<string, {
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

/**
 * Build country-specific character appearance section
 */
function buildCountryCharacterSection(countryCode?: string): string {
  if (!countryCode) return '';
  
  const directive = COUNTRY_CHARACTER_DIRECTIVES[countryCode];
  if (!directive) return '';
  
  return `\n\n## MANDATORY CHARACTER ETHNICITY (DO NOT IGNORE):
ALL human characters in this image MUST be ${directive.ethnicity}.
- Ethnicity: ${directive.ethnicity}
- Cultural Context: ${directive.culturalContext}
- Setting: ${directive.settingHints}
- DO NOT use Western/Caucasian or other non-${countryCode} faces
- This is a STRICT requirement for brand authenticity in ${countryCode} market
- ANY person, model, or human figure MUST match this ethnicity requirement`;
}

function buildCountryReminderSuffix(countryCode?: string): string {
  if (!countryCode) return '';
  const directive = COUNTRY_CHARACTER_DIRECTIVES[countryCode];
  if (!directive) return '';
  return `\n\nREMINDER (FINAL CHECK): If this image contains ANY human figures, they MUST be ${directive.ethnicity}. DO NOT use non-${countryCode} faces.`;
}

/**
 * Main function to build enhanced image prompt
 */
export function buildImagePrompt(params: ImagePromptParams): string {
  const { 
    channel, contentSummary, brand, aspectRatio, persona, journeyStage, 
    contentType, imageStylePreset, negativePrompt,
    contentRole, contentAngle, hookMessage, hookType,
    // NEW: Text-in-image params
    imageContentType, textToInclude, textPosition, typographyStyle,
    // Country-specific character
    countryCode
  } = params;
  
  const channelSpec = CHANNEL_IMAGE_SPECS[channel] || CHANNEL_IMAGE_SPECS.facebook;
  const finalAspectRatio = aspectRatio || channelSpec.aspectRatio;
  
  // Determine if this is a Social Graphic (with text) or background-only
  const isWithText = imageContentType === 'with_text' && textToInclude;
  
  // Build the comprehensive prompt
  let prompt = `Create a professional, brand-aligned ${isWithText ? 'SOCIAL GRAPHIC WITH TEXT' : 'image'} for ${brand.brandName}.

## ARTICLE CONTENT CONTEXT (HIGHEST PRIORITY):
${contentSummary}

CRITICAL: The image MUST visually represent the specific topic/concept mentioned above, not just a generic industry image. Analyze the content summary to identify the core subject and create imagery that directly illustrates it.

${buildCountryCharacterSection(countryCode)}

## CHANNEL: ${channel.toUpperCase()}
- Aspect Ratio: ${finalAspectRatio}
- Platform Style: ${channelSpec.style}
- Mood: ${channelSpec.mood}
- Composition: ${channelSpec.composition}

### Channel-Specific Visual Directions:
${channelSpec.visualDirections.map(d => `- ${d}`).join('\n')}

### Elements to AVOID for ${channel}:
${channelSpec.avoidElements.map(e => `- ${e}`).join('\n')}`;

  // Add brand identity
  if (brand.imageStyle) {
    prompt += `\n\n## BRAND VISUAL IDENTITY:\n- Style: ${brand.imageStyle}`;
  }
  
  if (brand.industry && brand.industry.length > 0) {
    prompt += `\n- Industry Context: ${brand.industry.join(', ')}`;
  }
  
  // Add color section
  prompt += buildColorSection(brand.brandColors);
  
  // Add style preset section
  prompt += buildStylePresetSection(imageStylePreset);
  
  // NEW: Add text-in-image section if Social Graphic mode
  if (isWithText) {
    prompt += buildTextInImageSection(textToInclude, textPosition, typographyStyle);
  }
  
  // Add hook section (CRITICAL - placed early for emphasis)
  prompt += buildHookSection(hookMessage, hookType);
  
  // Add content role section
  prompt += buildContentRoleSection(contentRole);
  
  // Add content angle section
  prompt += buildContentAngleSection(contentAngle);
  
  // Add persona section
  prompt += buildPersonaVisualSection(persona);
  
  // Add journey stage section
  prompt += buildJourneyStageSection(journeyStage);
  
  // Add content type guidance
  if (contentType) {
    const contentTypeGuides: Record<string, string> = {
      promotional: 'Focus on product/service, include call-to-action space, highlight value proposition',
      educational: 'Clear informative visuals, diagram-friendly, professional appearance',
      entertainment: 'Fun, engaging, shareable elements, trend-aware aesthetics',
      inspirational: 'Emotional imagery, aspirational scenarios, motivational tone',
    };
    
    if (contentTypeGuides[contentType]) {
      prompt += `\n\n## CONTENT TYPE (${contentType.toUpperCase()}):\n${contentTypeGuides[contentType]}`;
    }
  }
  
  // Add negative prompt if provided
  if (negativePrompt) {
    prompt += `\n\n## ELEMENTS TO AVOID:\n${negativePrompt}`;
  }
  
  // Critical rules - DIFFERENT for with_text vs background_only mode
  if (isWithText) {
    prompt += `

## CRITICAL RULES (SOCIAL GRAPHIC WITH TEXT MODE):
1. INCLUDE the specified text prominently and legibly in the image
2. Text must be CLEARLY READABLE with HIGH CONTRAST
3. DO NOT include any logos or brand marks
4. Background/visual should COMPLEMENT, not compete with text
5. Main visual elements should support and frame the text
6. Use professional typography that matches the brand style
7. Maintain brand-appropriate color temperature
8. NEVER create blank, white, or empty images
9. Ensure text is the primary focal point
10. Add visual effects (shadow, glow, backdrop) if needed for text legibility`;
  } else {
    prompt += `

## CRITICAL RULES (BACKGROUND IMAGE MODE):
1. DO NOT include any text, words, letters, or typography in the image
2. DO NOT include any logos or brand marks
3. Image must be photorealistic OR stylized illustration based on brand style
4. Ensure the image works well as a background for text overlay
5. Main subject should be clearly visible and not cropped
6. Use natural, professional lighting
7. Maintain brand-appropriate color temperature
8. NEVER create blank, white, or empty images - always include clear visual content
9. Background must have visible color, texture, or gradient - NEVER pure white (#FFFFFF)
10. Image must have at least one clear focal point or subject`;
  }

  // Add country ethnicity reminder at end (sandwich technique)
  prompt += buildCountryReminderSuffix(countryCode);

  return prompt;
}

/**
 * Build a simpler prompt for quick generation
 */
export function buildSimpleImagePrompt(
  contentSummary: string,
  channel: Channel,
  brandName: string,
  primaryColor?: string
): string {
  const channelSpec = CHANNEL_IMAGE_SPECS[channel] || CHANNEL_IMAGE_SPECS.facebook;
  
  let prompt = `Create a ${channelSpec.style} image for ${brandName}.

Content: ${contentSummary}

Style: ${channelSpec.mood}
Composition: ${channelSpec.composition}
Aspect Ratio: ${channelSpec.aspectRatio}`;

  if (primaryColor) {
    prompt += `\n\nPrimary brand color: ${primaryColor} - incorporate this as an accent color.`;
  }

  prompt += `

RULES:
- No text, words, or typography
- No logos
- Professional quality
- Works well with text overlay`;

  return prompt;
}

/**
 * Get optimal aspect ratio for channel
 */
export function getChannelAspectRatio(channel: Channel): string {
  return CHANNEL_IMAGE_SPECS[channel]?.aspectRatio || '16:9';
}

/**
 * Get all channel specifications
 */
export function getChannelSpecs(channel: Channel) {
  return CHANNEL_IMAGE_SPECS[channel] || CHANNEL_IMAGE_SPECS.facebook;
}

// ============================================
// BRAND-BASED STYLE SUGGESTION (Backend)
// ============================================

const INDUSTRY_STYLE_MAP: Record<string, ImageStylePreset[]> = {
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

const TONE_STYLE_AFFINITY: Record<string, ImageStylePreset[]> = {
  expert: ['minimalist', 'photorealistic'],
  professional: ['photorealistic', 'minimalist'],
  friendly: ['illustration', 'flat_design'],
  playful: ['illustration', 'flat_design'],
  bold: ['cinematic', '3d_render'],
  inspirational: ['cinematic', 'watercolor'],
  trendy: ['3d_render', 'cinematic'],
  elegant: ['minimalist', 'cinematic'],
};

/**
 * Compute suggested image style from brand attributes (backend version)
 */
export function computeStyleFromBrand(
  industry?: string[],
  toneOfVoice?: string[],
  explicitImageStyle?: string,
  formalityLevel?: string
): ImageStylePreset {
  // If explicit style set, map it
  if (explicitImageStyle) {
    const styleMapping: Record<string, ImageStylePreset> = {
      'modern_minimalist': 'minimalist',
      'minimalist': 'minimalist',
      'photorealistic': 'photorealistic',
      'realistic': 'photorealistic',
      'professional': 'photorealistic',
      'illustration': 'illustration',
      '3d': '3d_render',
      'flat': 'flat_design',
      'watercolor': 'watercolor',
      'cinematic': 'cinematic',
    };
    const normalized = explicitImageStyle.toLowerCase().replace(/[\s-]/g, '_');
    if (styleMapping[normalized]) {
      return styleMapping[normalized];
    }
  }
  
  // Score styles based on industry and tone
  const scores: Record<ImageStylePreset, number> = {
    photorealistic: 0,
    illustration: 0,
    minimalist: 0,
    '3d_render': 0,
    flat_design: 0,
    watercolor: 0,
    cinematic: 0,
    // New styles
    abstract: 0,
    geometric: 0,
    isometric: 0,
    gradient: 0,
    product_only: 0,
  };
  
  // Industry matching
  if (industry && industry.length > 0) {
    for (const ind of industry) {
      const normalized = ind.toLowerCase().replace(/[\s&-]+/g, '');
      for (const [key, styles] of Object.entries(INDUSTRY_STYLE_MAP)) {
        if (normalized.includes(key) || key.includes(normalized)) {
          if (styles[0]) scores[styles[0]] += 3;
          if (styles[1]) scores[styles[1]] += 1;
        }
      }
    }
  }
  
  // Tone affinity
  if (toneOfVoice && toneOfVoice.length > 0) {
    for (const tone of toneOfVoice) {
      const normalized = tone.toLowerCase().replace(/[\s-]/g, '_');
      const styles = TONE_STYLE_AFFINITY[normalized];
      if (styles) {
        if (styles[0]) scores[styles[0]] += 2;
        if (styles[1]) scores[styles[1]] += 1;
      }
    }
  }
  
  // Formality boost
  if (formalityLevel === 'formal') {
    scores.photorealistic += 1;
    scores.minimalist += 1;
  } else if (formalityLevel === 'casual' || formalityLevel === 'informal') {
    scores.illustration += 1;
    scores.flat_design += 1;
  }
  
  // Find highest scoring style
  let bestStyle: ImageStylePreset = 'photorealistic'; // default
  let bestScore = 0;
  
  for (const [style, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestStyle = style as ImageStylePreset;
    }
  }
  
  return bestStyle;
}
