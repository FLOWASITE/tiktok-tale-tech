// ============================================
// Image Prompt Pipeline — Assembler
// Collects segments from builders, sorts, and joins
// ============================================

import type {
  ImagePromptParams, PromptContext, PromptSegment, PromptBuilder,
  Channel,
} from './image-prompt-types.ts';
import { CHANNEL_IMAGE_SPECS } from './image-prompt-data.ts';
import { DEFAULT_BUILDERS } from './image-prompt-builders.ts';

// ============================================
// Context Builder
// ============================================

function buildPromptContext(params: ImagePromptParams): PromptContext {
  const channelSpec = CHANNEL_IMAGE_SPECS[params.channel] || CHANNEL_IMAGE_SPECS.facebook;
  const finalAspectRatio = params.aspectRatio || channelSpec.aspectRatio;
  const isWithText = params.imageContentType === 'with_text' && !!params.textToInclude;

  return { params, channelSpec, finalAspectRatio, isWithText };
}

// ============================================
// Position ordering
// ============================================

const POSITION_ORDER: Record<string, number> = {
  prefix: 0,
  core: 1,
  suffix: 2,
};

// ============================================
// Main Assembler
// ============================================

/**
 * Assemble a complete image prompt from builder pipeline.
 * Returns both the final prompt string and a trace of all segments for debugging.
 */
export function assembleImagePrompt(
  params: ImagePromptParams,
  builders: PromptBuilder[] = DEFAULT_BUILDERS,
): { prompt: string; trace: PromptSegment[] } {
  const ctx = buildPromptContext(params);

  // Run all builders, filter nulls
  const segments = builders
    .map(builder => builder(ctx))
    .filter((seg): seg is PromptSegment => seg !== null);

  // Sort: position order first, then priority desc within same position
  segments.sort((a, b) => {
    const posA = POSITION_ORDER[a.position] ?? 1;
    const posB = POSITION_ORDER[b.position] ?? 1;
    if (posA !== posB) return posA - posB;
    return b.priority - a.priority;
  });

  const prompt = segments.map(s => s.content).join('\n\n');

  return { prompt, trace: segments };
}

// ============================================
// Utility Functions (kept for backward compat)
// ============================================

/**
 * Build a simpler prompt for quick generation
 */
export function buildSimpleImagePrompt(
  contentSummary: string,
  channel: Channel,
  brandName: string,
  primaryColor?: string,
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
