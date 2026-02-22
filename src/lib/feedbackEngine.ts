/**
 * Feedback Engine V3
 *
 * In-memory feedback collection and weight adjustment.
 * Designed with a DB-hook interface for future persistence.
 */

import {
  type ImageStyle,
  ALL_IMAGE_STYLES,
  BASE_SCORES,
  getAdjustedBaseScores,
  setAdjustedBaseScores,
} from '@/config/visualScoringConfig';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ImageFeedback {
  suggestionId: string;
  style: ImageStyle;
  rating: number; // 1-5
  reason?: string;
  timestamp: number;
}

export interface FeedbackStats {
  totalFeedback: number;
  averageRating: number;
  perStyle: Record<string, { count: number; avgRating: number }>;
}

export interface AdjustedConfig {
  adjustedScores: Record<ImageStyle, number>;
  feedbackCount: number;
  adjustmentApplied: boolean;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

let feedbackStore: ImageFeedback[] = [];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Record a single feedback entry. Returns current stats. */
export function recordFeedback(
  suggestionId: string,
  style: ImageStyle,
  rating: number,
  reason?: string,
): FeedbackStats {
  if (rating < 1 || rating > 5) {
    throw new Error(`Rating must be between 1 and 5, got ${rating}`);
  }

  feedbackStore.push({
    suggestionId,
    style,
    rating,
    reason,
    timestamp: Date.now(),
  });

  return getFeedbackStats();
}

/** Get summary statistics of collected feedback. */
export function getFeedbackStats(): FeedbackStats {
  if (feedbackStore.length === 0) {
    return { totalFeedback: 0, averageRating: 0, perStyle: {} };
  }

  const perStyle: Record<string, { count: number; totalRating: number }> = {};
  let totalRating = 0;

  for (const fb of feedbackStore) {
    totalRating += fb.rating;
    if (!perStyle[fb.style]) {
      perStyle[fb.style] = { count: 0, totalRating: 0 };
    }
    perStyle[fb.style].count += 1;
    perStyle[fb.style].totalRating += fb.rating;
  }

  const perStyleAvg: Record<string, { count: number; avgRating: number }> = {};
  for (const [style, data] of Object.entries(perStyle)) {
    perStyleAvg[style] = {
      count: data.count,
      avgRating: Math.round((data.totalRating / data.count) * 100) / 100,
    };
  }

  return {
    totalFeedback: feedbackStore.length,
    averageRating: Math.round((totalRating / feedbackStore.length) * 100) / 100,
    perStyle: perStyleAvg,
  };
}

/**
 * Adjust BASE_SCORES proportionally based on feedback.
 * Only applies when there are >= minFeedback items (default 10).
 *
 * Adjustment logic:
 *   For each style with feedback, avgRating is compared to neutral (3.0).
 *   Positive delta → boost score, negative → reduce.
 *   Adjustment = (avgRating - 3.0) / 2.0 * BASE_SCORES[style] * scaleFactor
 *   scaleFactor = 0.10 (max 10% adjustment per cycle)
 */
export function adjustWeights(
  feedbackHistory?: ImageFeedback[],
  minFeedback: number = 10,
): AdjustedConfig {
  const history = feedbackHistory ?? feedbackStore;

  if (history.length < minFeedback) {
    return {
      adjustedScores: getAdjustedBaseScores(),
      feedbackCount: history.length,
      adjustmentApplied: false,
    };
  }

  // Calculate average rating per style
  const styleRatings: Record<string, { total: number; count: number }> = {};
  for (const fb of history) {
    if (!styleRatings[fb.style]) {
      styleRatings[fb.style] = { total: 0, count: 0 };
    }
    styleRatings[fb.style].total += fb.rating;
    styleRatings[fb.style].count += 1;
  }

  const SCALE_FACTOR = 0.10; // Max 10% adjustment
  const NEUTRAL_RATING = 3.0;
  const adjusted = { ...BASE_SCORES };

  for (const style of ALL_IMAGE_STYLES) {
    const data = styleRatings[style];
    if (!data || data.count === 0) continue;

    const avgRating = data.total / data.count;
    const delta = (avgRating - NEUTRAL_RATING) / 2.0;
    const adjustment = delta * BASE_SCORES[style] * SCALE_FACTOR;
    adjusted[style] = Math.round(Math.max(0, Math.min(100, adjusted[style] + adjustment)) * 100) / 100;
  }

  setAdjustedBaseScores(adjusted);

  return {
    adjustedScores: { ...adjusted },
    feedbackCount: history.length,
    adjustmentApplied: true,
  };
}

/** Clear all in-memory feedback. */
export function resetFeedback(): void {
  feedbackStore = [];
}

/** Get raw feedback entries (for debugging / export). */
export function getRawFeedback(): ImageFeedback[] {
  return [...feedbackStore];
}
