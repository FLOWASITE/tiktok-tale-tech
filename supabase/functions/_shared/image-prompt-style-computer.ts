// ============================================
// Image Prompt Pipeline — Style Computer
// Computes suggested image style from brand attributes
// ============================================

import type { ImageStylePreset } from './image-prompt-types.ts';
import { INDUSTRY_STYLE_MAP, TONE_STYLE_AFFINITY } from './image-prompt-data.ts';

/**
 * Compute suggested image style from brand attributes (backend version)
 */
export function computeStyleFromBrand(
  industry?: string[],
  toneOfVoice?: string[],
  explicitImageStyle?: string,
  formalityLevel?: string,
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

  // Find top-3 scoring styles, weighted-random pick from them for variation
  // (avoids "always same preset" which makes layouts look identical across generations)
  const ranked = (Object.entries(scores) as [ImageStylePreset, number][])
    .filter(([, s]) => s > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  if (ranked.length === 0) {
    return 'photorealistic'; // default fallback
  }

  // Weighted pick: top style ~55%, 2nd ~30%, 3rd ~15%
  const weights = [0.55, 0.30, 0.15];
  const r = Math.random();
  let cum = 0;
  for (let i = 0; i < ranked.length; i++) {
    cum += weights[i] ?? 0;
    if (r <= cum) return ranked[i][0];
  }
  return ranked[0][0];
}
