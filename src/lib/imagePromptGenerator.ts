/**
 * Image Prompt Generator V3
 *
 * Generates optimized text prompts for image generation APIs,
 * tailored to channel specs, content role, and suggestion style.
 */

import type { SuggestionV3 } from '@/lib/imageSuggestionEngine';
import type { ContentRole } from '@/config/visualScoringConfig';
import { CHANNEL_IMAGE_CONFIG } from '@/config/channelImageConfig';
import type { Channel } from '@/types/multichannel';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PromptContext {
  topic: string;
  brandTone: string;
  channel: Channel;
  contentRole: ContentRole;
  hookMessage?: string;
  industry?: string;
  countryCode?: string;
}

// ---------------------------------------------------------------------------
// Role directives
// ---------------------------------------------------------------------------

const ROLE_DIRECTIVES: Record<ContentRole, string> = {
  seed: 'Emotional, curiosity-driven visuals that stop the scroll. Evoke wonder and intrigue.',
  sprout: 'Informative, trust-building, educational visuals. Clear, credible, and easy to understand.',
  harvest: 'Product-focused, CTA-friendly visuals. Direct, professional, conversion-oriented.',
};

// ---------------------------------------------------------------------------
// Style directives
// ---------------------------------------------------------------------------

function getStyleDirective(style: string): string {
  const map: Record<string, string> = {
    photorealistic: 'Photorealistic photography style. Natural lighting, real textures, authentic human presence.',
    illustration: 'Digital illustration style. Clean lines, cohesive color palette, approachable feel.',
    minimalist: 'Minimalist design. Ample white space, simple shapes, focused composition.',
    flat_design: 'Flat design / infographic style. Bold colors, geometric shapes, clear visual hierarchy.',
    cinematic: 'Cinematic style. Dramatic lighting, wide aspect feel, film-grade color grading.',
    '3d_render': '3D rendered style. Smooth materials, soft shadows, modern isometric or perspective view.',
    watercolor: 'Watercolor painting style. Soft edges, organic color blending, artistic feel.',
  abstract: 'Abstract art style. Shapes and colors convey emotion rather than literal subjects.',
    geometric: 'Geometric pattern style. Structured shapes, data-visualization aesthetic.',
    isometric: 'Isometric illustration style. 3D-like flat perspective, process/system diagrams.',
    gradient: 'Gradient-based design. Smooth color transitions, modern decorative feel.',
    product_only: 'Product photography style. Clean background, focused subject, commercial quality.',
  };
  return map[style] ?? 'High-quality visual style.';
}

// ---------------------------------------------------------------------------
// Country character directives
// ---------------------------------------------------------------------------

const COUNTRY_CHARACTER_DIRECTIVES: Record<string, {
  ethnicity: string;
  culturalContext: string;
  settingHints: string;
}> = {
  VN: {
    ethnicity: 'Vietnamese people with Vietnamese facial features, black hair, warm skin tone',
    culturalContext: 'Vietnamese cultural context, local fashion style',
    settingHints: 'Vietnamese street scenes, tropical greenery, modern Vietnamese city aesthetics',
  },
  US: {
    ethnicity: 'Diverse American people reflecting multicultural society',
    culturalContext: 'American cultural context, Western fashion',
    settingHints: 'Modern American urban/suburban settings',
  },
  TH: {
    ethnicity: 'Thai people with Thai facial features, black hair, warm complexion',
    culturalContext: 'Thai cultural context, local fashion',
    settingHints: 'Thai urban settings, tropical environment',
  },
  SG: {
    ethnicity: 'Diverse Singaporean people (Chinese, Malay, Indian descent)',
    culturalContext: 'Singaporean multicultural context, modern Asian fashion',
    settingHints: 'Modern Singapore urban settings',
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

function getCountryCharacterDirective(countryCode?: string): string {
  if (!countryCode) return '';
  const directive = COUNTRY_CHARACTER_DIRECTIVES[countryCode];
  if (!directive) return '';
  return `When featuring people: ${directive.ethnicity}. ${directive.culturalContext}. ${directive.settingHints}. Characters must look authentic for ${countryCode} market.`;
}

// ---------------------------------------------------------------------------
// Main generator
// ---------------------------------------------------------------------------

/**
 * Generate an optimized image prompt string for the given suggestion and context.
 */
export function generateImagePrompt(suggestion: SuggestionV3, context: PromptContext): string {
  const { style, suggestedType, typography } = suggestion;
  const { topic, brandTone, channel, contentRole, hookMessage, industry, countryCode } = context;

  // Channel spec
  const channelSpec = CHANNEL_IMAGE_CONFIG[channel] ?? CHANNEL_IMAGE_CONFIG.instagram;
  const aspectRatio = channelSpec.aspectRatio;

  // Build prompt parts
  const parts: string[] = [];

  // 1. Style
  parts.push(getStyleDirective(style));

  // 2. Subject / topic
  parts.push(`Subject: ${topic}.`);

  // 3. Industry context
  if (industry) {
    parts.push(`Industry context: ${industry}. Feature real people or relatable service scenarios.`);
  }

  // 4. Role directive
  parts.push(ROLE_DIRECTIVES[contentRole]);

  // 5. Brand tone
  parts.push(`Brand tone: ${brandTone}.`);

  // 6. Text overlay considerations
  if (suggestedType === 'with_text') {
    parts.push(`Leave clear space for text overlay. Typography style: ${typography}. Ensure high contrast readability.`);
    if (hookMessage) {
      parts.push(`Text to overlay: "${hookMessage}".`);
    }
  } else {
    parts.push('No text overlay. Full visual composition.');
  }

  // 7. Channel-specific directions
  const directions = channelSpec.visualDirections.slice(0, 2).join(' ');
  parts.push(`Platform: ${channel}. ${directions}`);

  // 8. Aspect ratio
  parts.push(`Aspect ratio: ${aspectRatio}. Composition: ${channelSpec.composition}.`);

  // 9. Mood
  parts.push(`Mood: ${channelSpec.mood}.`);

  // 10. Avoid
  if (channelSpec.avoidElements.length > 0) {
    parts.push(`Avoid: ${channelSpec.avoidElements.join(', ')}.`);
  }

  // 11. Country-specific character appearance
  const countryDirective = getCountryCharacterDirective(countryCode);
  if (countryDirective) {
    parts.push(countryDirective);
  }

  return parts.join('\n');
}
