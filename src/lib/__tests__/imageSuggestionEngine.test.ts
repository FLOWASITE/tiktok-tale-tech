import { describe, it, expect, beforeEach } from 'vitest';
import { suggestImageStylesV3, type SuggestionInputV3 } from '@/lib/imageSuggestionEngine';
import { resetAdjustedScores } from '@/config/visualScoringConfig';

const DEFAULT_INPUT: SuggestionInputV3 = {
  contentGoal: 'education',
  contentAngle: 'educational',
  contentRole: 'sprout',
  channel: 'instagram_feed',
  industry: 'service',
};

describe('suggestImageStylesV3', () => {
  beforeEach(() => {
    resetAdjustedScores();
  });

  it('returns exactly 5 suggestions', () => {
    const result = suggestImageStylesV3(DEFAULT_INPUT);
    expect(result).toHaveLength(5);
  });

  it('returns suggestions sorted by score descending', () => {
    const result = suggestImageStylesV3(DEFAULT_INPUT);
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].score).toBeGreaterThanOrEqual(result[i].score);
    }
  });

  it('does not return duplicate styles', () => {
    const result = suggestImageStylesV3(DEFAULT_INPUT);
    const styles = result.map((s) => s.style);
    expect(new Set(styles).size).toBe(styles.length);
  });

  it('each suggestion has required fields', () => {
    const result = suggestImageStylesV3(DEFAULT_INPUT);
    for (const s of result) {
      expect(s.id).toBeTruthy();
      expect(s.style).toBeTruthy();
      expect(typeof s.score).toBe('number');
      expect(s.reason).toBeTruthy();
      expect(['background_only', 'with_text']).toContain(s.suggestedType);
      expect(s.typography).toBeTruthy();
      expect(s.matchPercentage).toBeGreaterThanOrEqual(0);
      expect(s.matchPercentage).toBeLessThanOrEqual(100);
    }
  });

  it('scores are clamped between 0 and 100', () => {
    const result = suggestImageStylesV3(DEFAULT_INPUT);
    for (const s of result) {
      expect(s.score).toBeGreaterThanOrEqual(0);
      expect(s.score).toBeLessThanOrEqual(100);
    }
  });

  it('reason includes source citation', () => {
    const result = suggestImageStylesV3(DEFAULT_INPUT);
    const topReason = result[0].reason;
    // Should mention at least one source
    expect(
      topReason.includes('Sprout Social') ||
      topReason.includes('Hootsuite') ||
      topReason.includes('ScienceDirect')
    ).toBe(true);
  });

  it('photorealistic ranks high for service/education/sprout', () => {
    const result = suggestImageStylesV3(DEFAULT_INPUT);
    const photoIndex = result.findIndex((s) => s.style === 'photorealistic');
    // Should be in top 3
    expect(photoIndex).toBeLessThan(3);
  });

  it('sprout role produces with_text suggestedType', () => {
    const result = suggestImageStylesV3(DEFAULT_INPUT);
    expect(result[0].suggestedType).toBe('with_text');
  });

  it('seed role produces background_only for instagram_feed', () => {
    const result = suggestImageStylesV3({ ...DEFAULT_INPUT, contentRole: 'seed' });
    expect(result[0].suggestedType).toBe('background_only');
  });

  it('different roles produce different rankings', () => {
    const sprout = suggestImageStylesV3({ ...DEFAULT_INPUT, contentRole: 'sprout' });
    const harvest = suggestImageStylesV3({ ...DEFAULT_INPUT, contentRole: 'harvest' });
    // At least one style should differ in top 5
    const sproutStyles = sprout.map((s) => s.style);
    const harvestStyles = harvest.map((s) => s.style);
    // Rankings or scores should differ between roles
    const sproutScores = sprout.map((s) => `${s.style}:${s.score}`).join(',');
    const harvestScores = harvest.map((s) => `${s.style}:${s.score}`).join(',');
    expect(sproutScores).not.toBe(harvestScores);
  });
});
