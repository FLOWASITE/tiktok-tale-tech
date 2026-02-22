import { describe, it, expect, beforeEach } from 'vitest';
import {
  recordFeedback,
  adjustWeights,
  getFeedbackStats,
  resetFeedback,
  getRawFeedback,
} from '@/lib/feedbackEngine';
import { resetAdjustedScores, BASE_SCORES } from '@/config/visualScoringConfig';

describe('feedbackEngine', () => {
  beforeEach(() => {
    resetFeedback();
    resetAdjustedScores();
  });

  describe('recordFeedback', () => {
    it('records a feedback entry and returns stats', () => {
      const stats = recordFeedback('s1', 'photorealistic', 4);
      expect(stats.totalFeedback).toBe(1);
      expect(stats.averageRating).toBe(4);
    });

    it('throws for invalid rating', () => {
      expect(() => recordFeedback('s1', 'photorealistic', 0)).toThrow();
      expect(() => recordFeedback('s1', 'photorealistic', 6)).toThrow();
    });

    it('accumulates multiple entries', () => {
      recordFeedback('s1', 'photorealistic', 5);
      recordFeedback('s2', 'photorealistic', 3);
      const stats = getFeedbackStats();
      expect(stats.totalFeedback).toBe(2);
      expect(stats.averageRating).toBe(4);
    });

    it('tracks per-style stats', () => {
      recordFeedback('s1', 'photorealistic', 5);
      recordFeedback('s2', 'minimalist', 3);
      const stats = getFeedbackStats();
      expect(stats.perStyle['photorealistic'].avgRating).toBe(5);
      expect(stats.perStyle['minimalist'].avgRating).toBe(3);
    });
  });

  describe('getFeedbackStats', () => {
    it('returns zero stats when empty', () => {
      const stats = getFeedbackStats();
      expect(stats.totalFeedback).toBe(0);
      expect(stats.averageRating).toBe(0);
      expect(Object.keys(stats.perStyle)).toHaveLength(0);
    });
  });

  describe('adjustWeights', () => {
    it('does not adjust with fewer than 10 feedback items', () => {
      for (let i = 0; i < 5; i++) {
        recordFeedback(`s${i}`, 'photorealistic', 5);
      }
      const result = adjustWeights();
      expect(result.adjustmentApplied).toBe(false);
      expect(result.feedbackCount).toBe(5);
    });

    it('adjusts weights after 10+ feedback items', () => {
      // 10 high ratings for photorealistic
      for (let i = 0; i < 10; i++) {
        recordFeedback(`s${i}`, 'photorealistic', 5);
      }
      const result = adjustWeights();
      expect(result.adjustmentApplied).toBe(true);
      // Photorealistic should be boosted above base
      expect(result.adjustedScores['photorealistic']).toBeGreaterThan(BASE_SCORES['photorealistic']);
    });

    it('reduces scores for low-rated styles', () => {
      for (let i = 0; i < 10; i++) {
        recordFeedback(`s${i}`, 'abstract', 1);
      }
      const result = adjustWeights();
      expect(result.adjustmentApplied).toBe(true);
      expect(result.adjustedScores['abstract']).toBeLessThan(BASE_SCORES['abstract']);
    });

    it('accepts custom feedback history', () => {
      const history = Array.from({ length: 12 }, (_, i) => ({
        suggestionId: `s${i}`,
        style: 'cinematic' as const,
        rating: 4,
        timestamp: Date.now(),
      }));
      const result = adjustWeights(history);
      expect(result.adjustmentApplied).toBe(true);
    });

    it('keeps scores clamped 0-100', () => {
      for (let i = 0; i < 10; i++) {
        recordFeedback(`s${i}`, 'photorealistic', 5);
      }
      const result = adjustWeights();
      for (const score of Object.values(result.adjustedScores)) {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('resetFeedback', () => {
    it('clears all feedback', () => {
      recordFeedback('s1', 'photorealistic', 4);
      resetFeedback();
      expect(getRawFeedback()).toHaveLength(0);
      expect(getFeedbackStats().totalFeedback).toBe(0);
    });
  });

  describe('getRawFeedback', () => {
    it('returns copy of feedback entries', () => {
      recordFeedback('s1', 'minimalist', 3, 'test reason');
      const raw = getRawFeedback();
      expect(raw).toHaveLength(1);
      expect(raw[0].style).toBe('minimalist');
      expect(raw[0].reason).toBe('test reason');
    });
  });
});
