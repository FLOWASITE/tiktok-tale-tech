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

export type Channel = 'facebook' | 'instagram' | 'tiktok' | 'linkedin' | 'twitter' | 'website' | 'zalo' | 'threads';

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
}

// Image Style Presets
export type ImageStylePreset = 'photorealistic' | 'illustration' | 'minimalist' | '3d_render' | 'flat_design' | 'watercolor' | 'cinematic';

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
};

// ============================================
// CHANNEL CONFIGURATIONS
// ============================================

const CHANNEL_IMAGE_SPECS: Record<Channel, {
  aspectRatio: string;
  style: string;
  mood: string;
  composition: string;
}> = {
  facebook: {
    aspectRatio: '16:9',
    style: 'vibrant and engaging, social media friendly',
    mood: 'warm, inviting, community-focused',
    composition: 'centered focal point with breathing room, works well with text overlay',
  },
  instagram: {
    aspectRatio: '1:1',
    style: 'aesthetically pleasing, visually striking, Instagram-worthy',
    mood: 'modern, trendy, aspirational',
    composition: 'bold central subject, minimal clutter, grid-friendly',
  },
  tiktok: {
    aspectRatio: '9:16',
    style: 'dynamic, eye-catching, vertical format optimized',
    mood: 'energetic, youthful, attention-grabbing',
    composition: 'vertical composition, subject in upper third, space for text at bottom',
  },
  linkedin: {
    aspectRatio: '16:9',
    style: 'professional, clean, business-appropriate',
    mood: 'trustworthy, competent, industry-focused',
    composition: 'clean background, professional lighting, corporate aesthetic',
  },
  twitter: {
    aspectRatio: '16:9',
    style: 'bold, shareable, high contrast',
    mood: 'current, newsworthy, conversation-starting',
    composition: 'simple and direct, works at small size, readable thumbnails',
  },
  website: {
    aspectRatio: '16:9',
    style: 'high-quality, professional, brand-aligned',
    mood: 'trustworthy, premium, on-brand',
    composition: 'hero-style, versatile for cropping, works with overlaid text',
  },
  zalo: {
    aspectRatio: '1:1',
    style: 'friendly, approachable, Vietnamese context',
    mood: 'familiar, trustworthy, local',
    composition: 'clear focal point, works on mobile screens',
  },
  threads: {
    aspectRatio: '1:1',
    style: 'minimal, contemporary, discussion-friendly',
    mood: 'conversational, authentic, relatable',
    composition: 'simple composition, text-friendly space',
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

/**
 * Main function to build enhanced image prompt
 */
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

/**
 * Main function to build enhanced image prompt
 */
export function buildImagePrompt(params: ImagePromptParams): string {
  const { channel, contentSummary, brand, aspectRatio, persona, journeyStage, contentType, imageStylePreset, negativePrompt } = params;
  
  const channelSpec = CHANNEL_IMAGE_SPECS[channel] || CHANNEL_IMAGE_SPECS.facebook;
  const finalAspectRatio = aspectRatio || channelSpec.aspectRatio;
  
  // Build the comprehensive prompt
  let prompt = `Create a professional, brand-aligned image for ${brand.brandName}.

## CONTENT CONTEXT:
${contentSummary}

## CHANNEL: ${channel.toUpperCase()}
- Aspect Ratio: ${finalAspectRatio}
- Platform Style: ${channelSpec.style}
- Mood: ${channelSpec.mood}
- Composition: ${channelSpec.composition}`;

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
  
  // Critical rules (always include)
  prompt += `

## CRITICAL RULES (MUST FOLLOW):
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
