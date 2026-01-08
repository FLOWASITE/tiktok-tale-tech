/**
 * Backward Compatibility Tests
 * Ensures deprecated hooks maintain the same interface as consolidated hooks
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: vi.fn(() => Promise.resolve({ data: {}, error: null })) },
    from: vi.fn(() => ({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ order: vi.fn(() => Promise.resolve({ data: [], error: null })) })) })),
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      upsert: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'test-user-id' }, isLoading: false })),
}));

vi.mock('@/contexts/OrganizationContext', () => ({
  useOrganizationContext: vi.fn(() => ({ currentOrganization: { id: 'test-org-id' }, isLoading: false })),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

import { useHookAI } from '../useHookAI';
import { useKPIAI } from '../useKPIAI';
import { useTopicAI } from '../useTopicAI';

describe('Backward Compatibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useHookAI interface', () => {
    it('generator module has required properties', () => {
      const { result } = renderHook(() => useHookAI({ topic: 'test' }));
      const { generator } = result.current;

      expect(generator).toHaveProperty('hooks');
      expect(generator).toHaveProperty('loading');
      expect(generator).toHaveProperty('error');
      expect(typeof generator.generateHooks).toBe('function');
      expect(typeof generator.clearHooks).toBe('function');
    });

    it('quickSuggestions module has required properties', () => {
      const { result } = renderHook(() => useHookAI({ topic: 'test' }));
      const { quickSuggestions } = result.current;

      expect(quickSuggestions).toHaveProperty('suggestions');
      expect(quickSuggestions).toHaveProperty('isLoading');
      expect(typeof quickSuggestions.refresh).toBe('function');
    });

    it('multiChannel module has required properties', () => {
      const { result } = renderHook(() => useHookAI({ topic: 'test' }));
      const { multiChannel } = result.current;

      expect(multiChannel).toHaveProperty('hooks');
      expect(multiChannel).toHaveProperty('isLoading');
      expect(typeof multiChannel.refresh).toBe('function');
    });
  });

  describe('useKPIAI interface', () => {
    it('suggestions module has required properties', () => {
      const { result } = renderHook(() => useKPIAI({}));
      const { suggestions } = result.current;

      expect(suggestions).toHaveProperty('result');
      expect(suggestions).toHaveProperty('isLoading');
      expect(suggestions).toHaveProperty('error');
      expect(typeof suggestions.fetchSuggestions).toBe('function');
      expect(typeof suggestions.reset).toBe('function');
    });

    it('adjustments module has required properties', () => {
      const { result } = renderHook(() => useKPIAI({}));
      const { adjustments } = result.current;

      expect(adjustments).toHaveProperty('analysis');
      expect(adjustments).toHaveProperty('isLoading');
      expect(typeof adjustments.checkNow).toBe('function');
      expect(typeof adjustments.dismissSuggestion).toBe('function');
      expect(typeof adjustments.dismissAll).toBe('function');
    });
  });

  describe('useTopicAI interface', () => {
    it('refinement module has required properties', () => {
      const { result } = renderHook(() => useTopicAI({}));
      const { refinement } = result.current;

      expect(refinement).toHaveProperty('refinedTopics');
      expect(refinement).toHaveProperty('isLoading');
      expect(refinement).toHaveProperty('isTyping');
      expect(typeof refinement.refine).toBe('function');
      expect(typeof refinement.refresh).toBe('function');
    });

    it('intelligence module has required properties', () => {
      const { result } = renderHook(() => useTopicAI({}));
      const { intelligence } = result.current;

      expect(intelligence).toHaveProperty('gaps');
      expect(intelligence).toHaveProperty('clusters');
      expect(intelligence).toHaveProperty('keywords');
      expect(typeof intelligence.analyzeGaps).toBe('function');
      expect(typeof intelligence.clearResults).toBe('function');
    });

    it('recommendations module has required properties', () => {
      const { result } = renderHook(() => useTopicAI({}));
      const { recommendations } = result.current;

      expect(recommendations).toHaveProperty('nextBest');
      expect(recommendations).toHaveProperty('weeklyPlan');
      expect(typeof recommendations.getNextBestTopic).toBe('function');
      expect(typeof recommendations.getWeeklyPlan).toBe('function');
    });

    it('trending module has required properties', () => {
      const { result } = renderHook(() => useTopicAI({}));
      const { trending } = result.current;

      expect(trending).toHaveProperty('topics');
      expect(trending).toHaveProperty('source');
      expect(typeof trending.fetch).toBe('function');
      expect(typeof trending.clear).toBe('function');
    });

    it('suggestions module has required properties', () => {
      const { result } = renderHook(() => useTopicAI({}));
      const { suggestions } = result.current;

      expect(suggestions).toHaveProperty('suggestions');
      expect(suggestions).toHaveProperty('sortBy');
      expect(suggestions).toHaveProperty('minScore');
      expect(typeof suggestions.setSortBy).toBe('function');
      expect(typeof suggestions.refresh).toBe('function');
    });
  });

  describe('Default values', () => {
    it('useHookAI has correct defaults', () => {
      const { result } = renderHook(() => useHookAI({ topic: 'test' }));
      expect(result.current.generator.hooks).toEqual([]);
      expect(result.current.generator.loading).toBe(false);
    });

    it('useKPIAI has correct defaults', () => {
      const { result } = renderHook(() => useKPIAI({}));
      expect(result.current.suggestions.result).toBeNull();
      expect(result.current.suggestions.isLoading).toBe(false);
    });

    it('useTopicAI has correct defaults', () => {
      const { result } = renderHook(() => useTopicAI({}));
      expect(result.current.refinement.refinedTopics).toEqual([]);
      expect(result.current.suggestions.sortBy).toBe('overall');
      expect(result.current.suggestions.minScore).toBe(0);
    });
  });
});
