// ============================================
// Channel Transformation Types (Frontend)
// Mirrors backend channel-transform-rules.ts for type safety
// ============================================

/**
 * Content extraction percentage - how much of Core Content to use
 */
export type ExtractionLevel = 'minimal' | 'condensed' | 'balanced' | 'comprehensive' | 'full';

/**
 * Focus area - which parts of Core Content to prioritize
 */
export type FocusArea = 
  | 'hook_cta'
  | 'key_points'
  | 'insights'
  | 'storytelling'
  | 'seo_structure'
  | 'script_format'
  | 'summary'
  | 'social_proof';

/**
 * Preservation priority - what elements must be kept
 */
export type PreservePriority = 'hook' | 'cta' | 'key_insight' | 'social_proof' | 'statistic' | 'quote';

/**
 * Channel transformation configuration
 */
export interface ChannelTransformConfig {
  extractionRange: [number, number];
  extractionLevel: ExtractionLevel;
  focusAreas: FocusArea[];
  preserveElements: PreservePriority[];
  transformNotes: string[];
  formatGuidance: string;
  wordCountMultiplier: [number, number];
}

/**
 * Calculated word count target for a channel
 */
export interface ChannelWordCountTarget {
  min: number;
  max: number;
  target: number;
}

/**
 * Transformation validation result
 */
export interface TransformValidationResult {
  valid: boolean;
  warnings: string[];
}

/**
 * Channel transform matrix (simplified for frontend display)
 */
export const CHANNEL_TRANSFORM_SUMMARY: Record<string, {
  extractionLabel: string;
  extractionRange: string;
  focusLabel: string;
  colorClass: string;
}> = {
  // Full extraction channels
  website: {
    extractionLabel: 'Đầy đủ',
    extractionRange: '80-100%',
    focusLabel: 'SEO + Chi tiết',
    colorClass: 'bg-emerald-500/10 text-emerald-600',
  },
  blog: {
    extractionLabel: 'Đầy đủ',
    extractionRange: '80-100%',
    focusLabel: 'SEO + Storytelling',
    colorClass: 'bg-emerald-500/10 text-emerald-600',
  },
  
  // Comprehensive extraction
  youtube: {
    extractionLabel: 'Toàn diện',
    extractionRange: '50-80%',
    focusLabel: 'Script + Hook',
    colorClass: 'bg-blue-500/10 text-blue-600',
  },
  
  // Balanced extraction
  linkedin: {
    extractionLabel: 'Cân bằng',
    extractionRange: '40-60%',
    focusLabel: 'Insights + Analysis',
    colorClass: 'bg-violet-500/10 text-violet-600',
  },
  facebook: {
    extractionLabel: 'Cân bằng',
    extractionRange: '20-40%',
    focusLabel: 'Hook + Key points + Case study',
    colorClass: 'bg-violet-500/10 text-violet-600',
  },
  email: {
    extractionLabel: 'Cân bằng',
    extractionRange: '30-50%',
    focusLabel: 'Key points + CTA',
    colorClass: 'bg-violet-500/10 text-violet-600',
  },
  telegram: {
    extractionLabel: 'Cân bằng',
    extractionRange: '20-40%',
    focusLabel: 'Key points + Summary',
    colorClass: 'bg-violet-500/10 text-violet-600',
  },
  threads: {
    extractionLabel: 'Cô đọng',
    extractionRange: '15-25%',
    focusLabel: 'Hook + Insights',
    colorClass: 'bg-amber-500/10 text-amber-600',
  },
  zalo_oa: {
    extractionLabel: 'Cô đọng',
    extractionRange: '15-25%',
    focusLabel: 'Hook + CTA',
    colorClass: 'bg-amber-500/10 text-amber-600',
  },
  
  // Minimal extraction
  instagram: {
    extractionLabel: 'Tối giản',
    extractionRange: '10-20%',
    focusLabel: 'Hook + Key points',
    colorClass: 'bg-rose-500/10 text-rose-600',
  },
  twitter: {
    extractionLabel: 'Cô đọng',
    extractionRange: '15-25%',
    focusLabel: 'Hook + Thread',
    colorClass: 'bg-amber-500/10 text-amber-600',
  },
  tiktok: {
    extractionLabel: 'Tối giản',
    extractionRange: '10-15%',
    focusLabel: 'Script + Hook',
    colorClass: 'bg-rose-500/10 text-rose-600',
  },
  google_maps: {
    extractionLabel: 'Tối giản',
    extractionRange: '10-20%',
    focusLabel: 'Key points + Proof',
    colorClass: 'bg-rose-500/10 text-rose-600',
  },
};

/**
 * Get extraction summary for a channel
 */
export function getChannelExtractionSummary(channel: string) {
  return CHANNEL_TRANSFORM_SUMMARY[channel] || {
    extractionLabel: 'Cân bằng',
    extractionRange: '30-50%',
    focusLabel: 'Key points',
    colorClass: 'bg-muted text-muted-foreground',
  };
}

/**
 * Calculate estimated word count for channel from Core Content
 */
export function estimateChannelWordCount(
  channel: string,
  coreContentWordCount: number
): ChannelWordCountTarget {
  // Simplified multipliers matching backend
  const multipliers: Record<string, [number, number]> = {
    website: [1.0, 1.5],
    blog: [1.0, 1.8],
    youtube: [0.40, 0.70],
    linkedin: [0.25, 0.45],
    telegram: [0.15, 0.30],
    facebook: [0.20, 0.40],
    email: [0.20, 0.40],
    threads: [0.08, 0.15],
    zalo_oa: [0.08, 0.15],
    instagram: [0.05, 0.12],
    twitter: [0.10, 0.25],
    tiktok: [0.05, 0.10],
    google_maps: [0.08, 0.12],
  };
  
  const [minMult, maxMult] = multipliers[channel] || [0.15, 0.30];
  const min = Math.round(coreContentWordCount * minMult);
  const max = Math.round(coreContentWordCount * maxMult);
  const target = Math.round((min + max) / 2);
  
  return { min, max, target };
}
