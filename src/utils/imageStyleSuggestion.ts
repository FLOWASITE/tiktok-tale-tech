/**
 * Image Style Suggestion Engine
 * 
 * Suggests optimal image styles based on brand attributes:
 * - Industry mapping
 * - Tone of voice affinity
 * - Explicit brand preferences
 * - Formality level adjustments
 */

import { ImageStylePreset } from '@/hooks/useSocialImageGeneration';

// ============================================
// INDUSTRY → STYLE MAPPING
// ============================================

const INDUSTRY_STYLE_MAP: Record<string, ImageStylePreset[]> = {
  // Beauty & Fashion
  beauty: ['minimalist', 'cinematic'],
  skincare: ['minimalist', 'photorealistic'],
  fashion: ['cinematic', 'photorealistic'],
  cosmetics: ['minimalist', 'cinematic'],
  makeup: ['minimalist', 'cinematic'],
  haircare: ['photorealistic', 'minimalist'],
  wellness: ['minimalist', 'watercolor'],
  spa: ['minimalist', 'watercolor'],
  
  // Technology
  technology: ['3d_render', 'flat_design'],
  tech: ['3d_render', 'flat_design'],
  saas: ['flat_design', 'minimalist'],
  software: ['flat_design', '3d_render'],
  ai: ['3d_render', 'minimalist'],
  fintech: ['minimalist', 'flat_design'],
  
  // Food & Beverage
  food: ['photorealistic', 'watercolor'],
  restaurant: ['photorealistic', 'cinematic'],
  beverage: ['photorealistic', 'minimalist'],
  cafe: ['photorealistic', 'watercolor'],
  bakery: ['watercolor', 'photorealistic'],
  fnb: ['photorealistic', 'cinematic'],
  
  // Professional Services
  finance: ['minimalist', 'photorealistic'],
  banking: ['minimalist', 'photorealistic'],
  healthcare: ['photorealistic', 'minimalist'],
  medical: ['photorealistic', 'minimalist'],
  education: ['illustration', 'flat_design'],
  consulting: ['minimalist', 'photorealistic'],
  legal: ['minimalist', 'photorealistic'],
  insurance: ['minimalist', 'photorealistic'],
  
  // Creative Industries
  art: ['watercolor', 'illustration'],
  design: ['minimalist', 'illustration'],
  photography: ['cinematic', 'photorealistic'],
  creative: ['illustration', 'watercolor'],
  agency: ['minimalist', 'cinematic'],
  
  // Real Estate & Property
  realestate: ['photorealistic', 'cinematic'],
  'real estate': ['photorealistic', 'cinematic'],
  property: ['photorealistic', 'cinematic'],
  construction: ['photorealistic', '3d_render'],
  architecture: ['minimalist', '3d_render'],
  
  // E-commerce & Retail
  ecommerce: ['photorealistic', '3d_render'],
  'e-commerce': ['photorealistic', '3d_render'],
  retail: ['photorealistic', 'flat_design'],
  luxury: ['minimalist', 'cinematic'],
  
  // Entertainment & Media
  entertainment: ['cinematic', 'illustration'],
  media: ['cinematic', 'flat_design'],
  gaming: ['3d_render', 'illustration'],
  music: ['cinematic', 'illustration'],
  
  // Travel & Hospitality
  travel: ['photorealistic', 'cinematic'],
  tourism: ['photorealistic', 'cinematic'],
  hotel: ['photorealistic', 'minimalist'],
  hospitality: ['photorealistic', 'cinematic'],
};

// ============================================
// TONE OF VOICE → STYLE AFFINITY
// ============================================

const TONE_STYLE_AFFINITY: Record<string, ImageStylePreset[]> = {
  // Professional tones
  expert: ['minimalist', 'photorealistic'],
  professional: ['photorealistic', 'minimalist'],
  authoritative: ['minimalist', 'photorealistic'],
  formal: ['photorealistic', 'minimalist'],
  
  // Calm/Soft tones
  calm: ['minimalist', 'watercolor'],
  gentle: ['watercolor', 'minimalist'],
  soothing: ['watercolor', 'minimalist'],
  peaceful: ['watercolor', 'minimalist'],
  
  // Friendly/Approachable tones
  friendly: ['illustration', 'flat_design'],
  approachable: ['illustration', 'flat_design'],
  warm: ['watercolor', 'photorealistic'],
  casual: ['illustration', 'flat_design'],
  conversational: ['illustration', 'flat_design'],
  
  // Playful/Fun tones
  playful: ['illustration', 'flat_design', '3d_render'],
  fun: ['illustration', '3d_render'],
  quirky: ['illustration', '3d_render'],
  humorous: ['illustration', 'flat_design'],
  
  // Bold/Energetic tones
  bold: ['cinematic', '3d_render'],
  energetic: ['3d_render', 'cinematic'],
  dynamic: ['cinematic', '3d_render'],
  powerful: ['cinematic', 'photorealistic'],
  
  // Inspiring tones
  inspirational: ['cinematic', 'watercolor'],
  motivational: ['cinematic', 'photorealistic'],
  empowering: ['cinematic', 'photorealistic'],
  
  // Trendy/Modern tones
  trendy: ['3d_render', 'cinematic'],
  modern: ['minimalist', '3d_render'],
  innovative: ['3d_render', 'minimalist'],
  cutting_edge: ['3d_render', 'minimalist'],
  'cutting-edge': ['3d_render', 'minimalist'],
  
  // Elegant tones
  elegant: ['minimalist', 'cinematic'],
  sophisticated: ['minimalist', 'cinematic'],
  refined: ['minimalist', 'photorealistic'],
  luxurious: ['cinematic', 'minimalist'],
};

// ============================================
// FORMALITY LEVEL ADJUSTMENTS
// ============================================

const FORMALITY_BOOST: Record<string, ImageStylePreset[]> = {
  formal: ['photorealistic', 'minimalist'],
  semi_formal: ['minimalist', 'photorealistic'],
  'semi-formal': ['minimalist', 'photorealistic'],
  casual: ['illustration', 'flat_design'],
  informal: ['illustration', 'flat_design'],
};

// ============================================
// TYPES
// ============================================

export interface StyleSuggestion {
  style: ImageStylePreset;
  score: number;
  reasons: string[];
  isRecommended: boolean;
  matchPercentage: number;
}

export interface SuggestImageStylesParams {
  industry?: string[];
  toneOfVoice?: string[];
  explicitImageStyle?: string;
  formalityLevel?: string;
}

// ============================================
// SUGGESTION ENGINE
// ============================================

/**
 * Map explicit image style from brand template to preset
 */
function mapExplicitStyle(imageStyle?: string): ImageStylePreset | null {
  if (!imageStyle) return null;
  
  const styleMapping: Record<string, ImageStylePreset> = {
    'modern_minimalist': 'minimalist',
    'minimalist': 'minimalist',
    'photorealistic': 'photorealistic',
    'realistic': 'photorealistic',
    'professional': 'photorealistic',
    'illustration': 'illustration',
    'illustrated': 'illustration',
    '3d': '3d_render',
    '3d_render': '3d_render',
    'flat': 'flat_design',
    'flat_design': 'flat_design',
    'watercolor': 'watercolor',
    'artistic': 'watercolor',
    'cinematic': 'cinematic',
    'dramatic': 'cinematic',
  };
  
  const normalized = imageStyle.toLowerCase().replace(/[\s-]/g, '_');
  return styleMapping[normalized] || null;
}

/**
 * Normalize industry string for matching
 */
function normalizeIndustry(industry: string): string {
  return industry.toLowerCase()
    .replace(/[\s&-]+/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Suggest image styles based on brand attributes
 */
export function suggestImageStyles(params: SuggestImageStylesParams): StyleSuggestion[] {
  const { industry, toneOfVoice, explicitImageStyle, formalityLevel } = params;
  
  // Initialize scores for all styles
  const styleScores: Record<ImageStylePreset, { score: number; reasons: string[] }> = {
    photorealistic: { score: 0, reasons: [] },
    illustration: { score: 0, reasons: [] },
    minimalist: { score: 0, reasons: [] },
    '3d_render': { score: 0, reasons: [] },
    flat_design: { score: 0, reasons: [] },
    watercolor: { score: 0, reasons: [] },
    cinematic: { score: 0, reasons: [] },
  };
  
  // 1. Explicit brand preference (highest priority)
  const explicitStyle = mapExplicitStyle(explicitImageStyle);
  if (explicitStyle) {
    styleScores[explicitStyle].score += 5;
    styleScores[explicitStyle].reasons.push('Brand preference');
  }
  
  // 2. Industry matching
  if (industry && industry.length > 0) {
    industry.forEach((ind) => {
      const normalized = normalizeIndustry(ind);
      
      // Check for exact and partial matches
      for (const [key, styles] of Object.entries(INDUSTRY_STYLE_MAP)) {
        const normalizedKey = normalizeIndustry(key);
        
        if (normalizedKey === normalized || normalized.includes(normalizedKey) || normalizedKey.includes(normalized)) {
          // Primary match (first style) gets higher score
          if (styles[0]) {
            styleScores[styles[0]].score += 3;
            if (!styleScores[styles[0]].reasons.includes(`Industry: ${ind}`)) {
              styleScores[styles[0]].reasons.push(`Industry: ${ind}`);
            }
          }
          // Secondary match
          if (styles[1]) {
            styleScores[styles[1]].score += 1;
            if (!styleScores[styles[1]].reasons.includes(`Industry: ${ind}`)) {
              styleScores[styles[1]].reasons.push(`Industry: ${ind}`);
            }
          }
        }
      }
    });
  }
  
  // 3. Tone of voice affinity
  if (toneOfVoice && toneOfVoice.length > 0) {
    toneOfVoice.forEach((tone) => {
      const normalizedTone = tone.toLowerCase().replace(/[\s-]/g, '_');
      const styles = TONE_STYLE_AFFINITY[normalizedTone];
      
      if (styles) {
        styles.forEach((style, index) => {
          const points = index === 0 ? 2 : 1;
          styleScores[style].score += points;
          if (!styleScores[style].reasons.includes(`Tone: ${tone}`)) {
            styleScores[style].reasons.push(`Tone: ${tone}`);
          }
        });
      }
    });
  }
  
  // 4. Formality level adjustment
  if (formalityLevel) {
    const normalizedFormality = formalityLevel.toLowerCase().replace(/[\s-]/g, '_');
    const styles = FORMALITY_BOOST[normalizedFormality];
    
    if (styles) {
      styles.forEach((style, index) => {
        const points = index === 0 ? 1.5 : 0.5;
        styleScores[style].score += points;
        if (!styleScores[style].reasons.includes(`Formality: ${formalityLevel}`)) {
          styleScores[style].reasons.push(`Formality: ${formalityLevel}`);
        }
      });
    }
  }
  
  // Convert to sorted array
  const suggestions: StyleSuggestion[] = Object.entries(styleScores)
    .map(([style, data]) => ({
      style: style as ImageStylePreset,
      score: data.score,
      reasons: data.reasons,
      isRecommended: false,
      matchPercentage: 0,
    }))
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score);
  
  // Calculate match percentage and mark recommended
  if (suggestions.length > 0) {
    const maxScore = suggestions[0].score;
    
    suggestions.forEach((suggestion, index) => {
      suggestion.matchPercentage = Math.round((suggestion.score / maxScore) * 100);
      suggestion.isRecommended = index === 0;
    });
  }
  
  return suggestions;
}

/**
 * Get style label in Vietnamese
 */
export function getStyleLabel(style: ImageStylePreset): string {
  const labels: Record<ImageStylePreset, string> = {
    photorealistic: 'Chân thực',
    illustration: 'Minh họa',
    minimalist: 'Tối giản',
    '3d_render': '3D Render',
    flat_design: 'Flat Design',
    watercolor: 'Màu nước',
    cinematic: 'Điện ảnh',
  };
  return labels[style] || style;
}

/**
 * Format reasons for display
 */
export function formatReasons(reasons: string[]): string {
  if (reasons.length === 0) return '';
  if (reasons.length === 1) return reasons[0];
  return reasons.slice(0, 2).join(' • ');
}
