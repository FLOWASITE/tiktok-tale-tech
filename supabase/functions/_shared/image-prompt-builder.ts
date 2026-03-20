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
// Image Prompt Builder — Backward-Compatible Facade
//
// This file re-exports the modular pipeline so that
// existing callers (generate-brand-image/index.ts)
// don't need any import path changes.
// ============================================

// Re-export all types
export type {
  Channel,
  BrandColors,
  BrandImageContext,
  PersonaContext,
  ContentRole,
  ContentAngle,
  ImageContentType,
  TextPosition,
  TypographyStyle,
  FooterInfo,
  PromptMode,
  ImagePromptParams,
  ImageStylePreset,
  PromptSegment,
  PromptContext,
  PromptBuilder,
  ChannelImageSpec,
} from './image-prompt-types.ts';

// Re-export data constants (some callers reference these directly)
export { IMAGE_STYLE_PRESETS, CHANNEL_IMAGE_SPECS } from './image-prompt-data.ts';

// Re-export assembler utilities
export {
  assembleImagePrompt,
  buildSimpleImagePrompt,
  getChannelAspectRatio,
  getChannelSpecs,
} from './image-prompt-assembler.ts';

// Re-export style computer
export { computeStyleFromBrand } from './image-prompt-style-computer.ts';

// Re-export individual builders for custom pipelines / A-B testing
export {
  buildCreativeMode,
  buildLocalizationPrefix,
  buildChannelSpec,
  buildBrandColors,
  buildStylePreset,
  buildTextLayout,
  buildStrategicContext,
  buildNegativePrompt,
  buildCriticalRules,
  buildLocalizationSuffix,
  buildBrandColorReinforcement,
  DEFAULT_BUILDERS,
} from './image-prompt-builders.ts';

// ============================================
// Backward-compatible wrapper
// ============================================

import { assembleImagePrompt } from './image-prompt-assembler.ts';
import type { ImagePromptParams } from './image-prompt-types.ts';

/**
 * Main function to build enhanced image prompt.
 * Backward-compatible — same signature, same output.
 */
export function buildImagePrompt(params: ImagePromptParams): string {
  const { prompt } = assembleImagePrompt(params);
  return prompt;
}
