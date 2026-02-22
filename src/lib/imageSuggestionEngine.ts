/**
 * Image Suggestion Engine V3
 *
 * Scores and ranks image styles based on content context.
 * V3 is additive – V2 in imageStyleSuggestion.ts remains untouched.
 */

import {
  type ImageStyle,
  type ContentGoal,
  type ContentAngle,
  type ContentRole,
  type Industry,
  type ChannelKey,
  ALL_IMAGE_STYLES,
  getAdjustedBaseScores,
  INDUSTRY_BOOST,
  CHANNEL_BOOST,
  ROLE_BOOST,
  GOAL_BOOST,
  ANGLE_BOOST,
} from '@/config/visualScoringConfig';

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface SuggestionInputV3 {
  contentGoal: ContentGoal;
  contentAngle: ContentAngle;
  contentRole: ContentRole;
  channel: ChannelKey;
  industry: Industry;
  hookMessage?: string;
}

export interface SuggestionV3 {
  id: string;
  style: ImageStyle;
  score: number;
  reason: string;
  suggestedType: 'background_only' | 'with_text';
  typography: string;
  matchPercentage: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(style: ImageStyle, index: number): string {
  return `v3_${style}_${index}_${Date.now().toString(36)}`;
}

/** Determine whether the image should carry text overlay */
function determineSuggestedType(role: ContentRole, channel: ChannelKey): 'background_only' | 'with_text' {
  // Sprout & harvest on feed channels benefit from text overlay for education / CTA
  if (role === 'sprout' || role === 'harvest') return 'with_text';
  // Seed is more emotional / curiosity – background works better
  if (channel === 'instagram_feed' && role === 'seed') return 'background_only';
  return 'with_text';
}

/** Suggest typography style based on channel + role */
function determineTypography(role: ContentRole, channel: ChannelKey): string {
  const map: Record<ContentRole, string> = {
    seed: 'bold',       // Attention-grabbing for awareness
    sprout: 'clean',    // Readable for educational content
    harvest: 'modern',  // Professional for conversion
  };
  if (channel === 'instagram_feed') {
    return role === 'sprout' ? 'clean' : map[role] ?? 'modern';
  }
  return map[role] ?? 'modern';
}

/** Build a human-readable reason with source citation */
function buildReason(style: ImageStyle, role: ContentRole, industry: Industry, goal: ContentGoal): string {
  const reasons: Partial<Record<ImageStyle, string>> = {
    photorealistic: `Photorealistic – recommended per Sprout Social 2026 for ${industry} industry trust`,
    illustration: 'Illustration – high save rate on Instagram (Hootsuite 2026), good for visual explanations',
    minimalist: 'Minimalist – reduces cognitive load, improves retention (ScienceDirect 2025)',
    flat_design: 'Flat design – ideal for infographic-style educational content (Hootsuite 2026)',
    cinematic: 'Cinematic – increases dwell time +31% (ScienceDirect 2025)',
    '3d_render': '3D render – trending visual style, eye-catching (Hootsuite 2026)',
    watercolor: 'Watercolor – niche aesthetic appeal, high save rate',
    abstract: 'Abstract – curiosity-triggering but lower comprehension for education',
    geometric: 'Geometric – suitable for data-driven visual topics',
    isometric: 'Isometric – good for process/system diagrams',
    gradient: 'Gradient – decorative, low information density',
    product_only: 'Product only – direct showcase style',
  };

  const base = reasons[style] ?? `${style} style`;
  const roleLabel = role === 'sprout' ? 'trust-building' : role === 'seed' ? 'awareness' : 'conversion';
  return `${base} | Role: ${roleLabel}, Goal: ${goal}`;
}

// ---------------------------------------------------------------------------
// Main engine
// ---------------------------------------------------------------------------

/**
 * Suggest top 5 image styles scored for the given content context.
 *
 * Scoring formula per style:
 *   score = adjustedBase
 *         + industryBoost
 *         + channelBoost
 *         + adjustedBase * (roleMultiplier - 1)
 *         + goalBoost
 *         + angleBoost
 */
export function suggestImageStylesV3(input: SuggestionInputV3): SuggestionV3[] {
  const { contentGoal, contentAngle, contentRole, channel, industry } = input;
  const baseScores = getAdjustedBaseScores();

  const seen = new Set<ImageStyle>();
  const scored: SuggestionV3[] = [];

  for (const style of ALL_IMAGE_STYLES) {
    if (seen.has(style)) continue;
    seen.add(style);

    const base = baseScores[style] ?? 50;
    const indBoost = INDUSTRY_BOOST[industry]?.[style] ?? 0;
    const chBoost = CHANNEL_BOOST[channel]?.[style] ?? 0;
    const roleMultiplier = ROLE_BOOST[contentRole]?.(style) ?? 1.0;
    const roleDelta = base * (roleMultiplier - 1);
    const goalBoost = GOAL_BOOST[contentGoal]?.[style] ?? 0;
    const angleBoost = ANGLE_BOOST[contentAngle]?.[style] ?? 0;

    const rawScore = base + indBoost + chBoost + roleDelta + goalBoost + angleBoost;
    // Clamp to 0-100
    const score = Math.round(Math.max(0, Math.min(100, rawScore)) * 100) / 100;

    scored.push({
      id: generateId(style, scored.length),
      style,
      score,
      reason: buildReason(style, contentRole, industry, contentGoal),
      suggestedType: determineSuggestedType(contentRole, channel),
      typography: determineTypography(contentRole, channel),
      matchPercentage: Math.round(score),
    });
  }

  // Sort descending by score, return top 5
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 5);
}
