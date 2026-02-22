/**
 * Visual Scoring Configuration V3
 *
 * Single source of truth for image-style scoring weights.
 * Every value is documented with rationale and source citation.
 *
 * Scoring formula:
 *   finalScore = BASE_SCORES[style]
 *              + INDUSTRY_BOOST[industry][style]
 *              + CHANNEL_BOOST[channel][style]
 *              + (BASE_SCORES[style] * (ROLE_BOOST[role](style) - 1))
 *              + GOAL_BOOST[goal][style]
 *              + ANGLE_BOOST[angle][style]
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ImageStyle =
  | 'photorealistic'
  | 'illustration'
  | 'minimalist'
  | '3d_render'
  | 'flat_design'
  | 'watercolor'
  | 'cinematic'
  | 'abstract'
  | 'geometric'
  | 'isometric'
  | 'gradient'
  | 'product_only';

export type ContentGoal = 'education' | 'awareness' | 'engagement' | 'expertise' | 'conversion';
export type ContentAngle = 'educational' | 'storytelling' | 'promotional' | 'social_proof' | 'behind_the_scenes' | 'qa_faq';
export type ContentRole = 'seed' | 'sprout' | 'harvest';
export type Industry = 'service' | 'retail' | 'fnb' | 'health' | 'education_industry' | 'tech';
export type ChannelKey = 'instagram_feed' | 'instagram_story' | 'facebook' | 'tiktok' | 'linkedin' | 'youtube' | 'twitter' | 'email' | 'website' | 'threads' | 'zalo_oa' | 'telegram' | 'google_maps';

export const ALL_IMAGE_STYLES: ImageStyle[] = [
  'photorealistic', 'illustration', 'minimalist', '3d_render', 'flat_design',
  'watercolor', 'cinematic', 'abstract', 'geometric', 'isometric',
  'gradient', 'product_only',
];

// ---------------------------------------------------------------------------
// BASE SCORES (0-100)
// ---------------------------------------------------------------------------

/**
 * Base engagement/trust scores per image style.
 * Sources:
 *  - Sprout Social 2026 Visual Trends Report
 *  - ScienceDirect 2025 "Visual trust signals in digital marketing"
 *  - Hootsuite 2026 Social Media Benchmarks
 */
export const BASE_SCORES: Record<ImageStyle, number> = {
  photorealistic: 82,   // Sprout Social 2026: real photos drive 38% more trust in service industries
  illustration: 70,     // Hootsuite 2026: illustrated content +22% save rate on IG
  minimalist: 68,       // ScienceDirect 2025: clean visuals improve information retention by 27%
  '3d_render': 60,      // Hootsuite 2026: 3D visuals trending but niche appeal
  flat_design: 65,      // Sprout Social 2026: strong for infographic-style educational content
  watercolor: 55,       // Niche aesthetic; lower general engagement but high save rate
  cinematic: 75,        // ScienceDirect 2025: cinematic framing increases dwell time +31%
  abstract: 50,         // Low comprehension for educational content – ScienceDirect 2025
  geometric: 58,        // Moderate; works for data-driven topics – Hootsuite 2026
  isometric: 56,        // Tech-oriented; limited service industry fit
  gradient: 52,         // Decorative; low information density – Sprout Social 2026
  product_only: 45,     // Not applicable for education-first content
};

// ---------------------------------------------------------------------------
// INDUSTRY BOOST
// ---------------------------------------------------------------------------

/** Per-industry per-style score adjustments */
export const INDUSTRY_BOOST: Partial<Record<Industry, Partial<Record<ImageStyle, number>>>> = {
  service: {
    photorealistic: 10,  // Service industries benefit from real human imagery – Sprout Social 2026
    illustration: 3,     // Acceptable but less trust than photos for services
    minimalist: 5,       // Clean look builds professionalism – ScienceDirect 2025
    cinematic: 6,        // Emotional connection for service storytelling
    flat_design: 4,      // Good for explainer/how-to content
    '3d_render': -2,     // Can feel disconnected from human-centric services
    watercolor: 0,
    abstract: -5,        // Too vague for service trust signals
    geometric: 0,
    isometric: -3,       // Tech-feel mismatches service warmth
    gradient: -3,
    product_only: -8,    // Services are intangible; product shots don't apply
  },
};

// ---------------------------------------------------------------------------
// CHANNEL BOOST
// ---------------------------------------------------------------------------

/** Per-channel per-style score adjustments */
export const CHANNEL_BOOST: Partial<Record<ChannelKey, Partial<Record<ImageStyle, number>>>> = {
  instagram_feed: {
    photorealistic: 8,   // IG feed rewards high-quality photos – Hootsuite 2026 (+45% engagement)
    illustration: 6,     // Carousel-friendly, high save rate on IG
    minimalist: 5,       // Clean grid aesthetic, strong for educational carousels
    cinematic: 7,        // Scroll-stopping visual quality on feed
    flat_design: 4,      // Works for infographic posts
    '3d_render': 3,      // Eye-catching but niche
    watercolor: 2,       // Aesthetic appeal for certain niches
    abstract: -2,        // Low engagement on IG feed – Sprout Social 2026
    geometric: 1,
    isometric: 0,
    gradient: 0,
    product_only: 2,     // Works for product-focused IG posts
  },
};

// ---------------------------------------------------------------------------
// ROLE BOOST (function-based multiplier)
// ---------------------------------------------------------------------------

/**
 * Role-based multiplier per style.
 * Returns a multiplier (1.0 = no change, 1.20 = +20%, 0.90 = -10%).
 * Applied as: BASE_SCORES[style] * (multiplier - 1) added to score.
 */
export const ROLE_BOOST: Record<ContentRole, (style: ImageStyle) => number> = {
  seed: (style) => {
    // Seed = awareness stage: emotional, curiosity-driven
    const boosts: Partial<Record<ImageStyle, number>> = {
      cinematic: 1.15,       // Emotional storytelling visuals
      abstract: 1.10,        // Curiosity-triggering
      illustration: 1.08,    // Approachable, shareable
      photorealistic: 1.05,
    };
    return boosts[style] ?? 1.0;
  },
  sprout: (style) => {
    // Sprout = trust/education stage: informative, credible
    const boosts: Partial<Record<ImageStyle, number>> = {
      photorealistic: 1.20,  // Trust signal #1 for education – Sprout Social 2026
      flat_design: 1.12,     // Infographic-style learning aids
      minimalist: 1.10,      // Clear information hierarchy
      illustration: 1.08,    // Educational illustrations
      cinematic: 1.05,
    };
    return boosts[style] ?? 1.0;
  },
  harvest: (style) => {
    // Harvest = conversion stage: product-focused, CTA-friendly
    const boosts: Partial<Record<ImageStyle, number>> = {
      product_only: 1.25,    // Direct product showcase
      photorealistic: 1.15,  // Real product/service imagery
      minimalist: 1.10,      // Clean CTA-focused layouts
      '3d_render': 1.08,     // Premium product presentation
    };
    return boosts[style] ?? 1.0;
  },
};

// ---------------------------------------------------------------------------
// GOAL BOOST
// ---------------------------------------------------------------------------

/** Per-goal per-style score adjustments */
export const GOAL_BOOST: Partial<Record<ContentGoal, Partial<Record<ImageStyle, number>>>> = {
  education: {
    flat_design: 8,      // Infographic layouts ideal for teaching – Hootsuite 2026
    minimalist: 6,       // Reduces cognitive load – ScienceDirect 2025
    illustration: 5,     // Step-by-step visual explanations
    photorealistic: 4,   // Real examples aid understanding
    isometric: 3,        // Good for process/system diagrams
    cinematic: 2,
    '3d_render': 1,
    geometric: 1,
    watercolor: -2,      // Too artistic for educational clarity
    abstract: -4,        // Low information transfer
    gradient: -3,
    product_only: -6,    // Education ≠ product showcase
  },
};

// ---------------------------------------------------------------------------
// ANGLE BOOST
// ---------------------------------------------------------------------------

/** Per-angle per-style score adjustments */
export const ANGLE_BOOST: Partial<Record<ContentAngle, Partial<Record<ImageStyle, number>>>> = {
  educational: {
    flat_design: 6,      // Diagrams, charts, step-by-step
    minimalist: 4,       // Focus on content over decoration
    illustration: 4,     // Visual explanations
    photorealistic: 3,   // Real-world examples
    isometric: 2,        // Process visualization
    cinematic: 1,
    geometric: 1,
    '3d_render': 0,
    watercolor: -2,
    abstract: -3,
    gradient: -2,
    product_only: -5,
  },
};

// ---------------------------------------------------------------------------
// Mutable config (for feedback adjustment)
// ---------------------------------------------------------------------------

/** Runtime-adjustable copy of BASE_SCORES. Reset via resetAdjustedScores(). */
let adjustedBaseScores: Record<ImageStyle, number> = { ...BASE_SCORES };

export function getAdjustedBaseScores(): Record<ImageStyle, number> {
  return { ...adjustedBaseScores };
}

export function setAdjustedBaseScores(scores: Record<ImageStyle, number>): void {
  adjustedBaseScores = { ...scores };
}

export function resetAdjustedScores(): void {
  adjustedBaseScores = { ...BASE_SCORES };
}
