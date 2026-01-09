/**
 * Unit tests for useTopicAI consolidated hook
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { mockRefinedTopics, mockTrendingTopics, mockGapAnalysis, mockClusterAnalysis, mockWeeklyPlan } from './testUtils';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: vi.fn() },
    from: vi.fn(() => ({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ order: vi.fn(() => Promise.resolve({ data: [], error: null })) })) })),
      insert: vi.fn(() => Promise.resolve({ data: [{ id: 'new-id' }], error: null })),
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

import { useTopicAI } from '../useTopicAI';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

describe('useTopicAI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('returns all five modules', () => {
      const { result } = renderHook(() => useTopicAI({}));
      expect(result.current).toHaveProperty('refinement');
      expect(result.current).toHaveProperty('intelligence');
      expect(result.current).toHaveProperty('recommendations');
      expect(result.current).toHaveProperty('trending');
      expect(result.current).toHaveProperty('suggestions');
    });

    it('initializes with empty states', () => {
      const { result } = renderHook(() => useTopicAI({}));
      expect(result.current.refinement.refinedTopics).toEqual([]);
      expect(result.current.intelligence.gaps).toBeNull();
      expect(result.current.trending.topics).toEqual([]);
    });
  });

  describe('refinement module', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it('refine validates minimum topic length', async () => {
      const { result } = renderHook(() => useTopicAI({}));

      act(() => {
        result.current.refinement.refine('short');
      });

      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      expect(supabase.functions.invoke).not.toHaveBeenCalled();
    });

    it('refine debounces requests (600ms)', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { refinedTopics: mockRefinedTopics },
        error: null,
      });

      const { result } = renderHook(() => useTopicAI({}));

      act(() => {
        result.current.refinement.refine('this is a long enough topic');
      });

      await act(async () => {
        vi.advanceTimersByTime(300);
      });
      expect(supabase.functions.invoke).not.toHaveBeenCalled();

      await act(async () => {
        vi.advanceTimersByTime(400);
      });
      expect(supabase.functions.invoke).toHaveBeenCalled();
    });
  });

  describe('intelligence module', () => {
    it('analyzeGaps calls correct edge function', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
        data: { success: true, result: mockGapAnalysis },
        error: null,
      });

      const { result } = renderHook(() => useTopicAI({ brandTemplateId: 'brand-123' }));

      await act(async () => {
        await result.current.intelligence.analyzeGaps();
      });

      expect(supabase.functions.invoke).toHaveBeenCalledWith(
        'topic-ai',
        expect.objectContaining({
          body: expect.objectContaining({ action: 'gap_analysis' }),
        })
      );
    });

    it('clearResults resets intelligence state', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
        data: { success: true, result: mockGapAnalysis },
        error: null,
      });

      const { result } = renderHook(() => useTopicAI({}));

      await act(async () => {
        await result.current.intelligence.analyzeGaps();
      });

      act(() => {
        result.current.intelligence.clearResults();
      });

      expect(result.current.intelligence.gaps).toBeNull();
    });
  });

  describe('recommendations module', () => {
    it('getWeeklyPlan returns plan items', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
        data: { success: true, result: mockWeeklyPlan },
        error: null,
      });

      const { result } = renderHook(() => useTopicAI({}));

      await act(async () => {
        await result.current.recommendations.getWeeklyPlan();
      });

      expect(result.current.recommendations.weeklyPlan).toEqual(mockWeeklyPlan);
    });
  });

  describe('trending module', () => {
    it('fetch calls topic-ai with trending action', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
        data: { topics: mockTrendingTopics, source: 'ai' },
        error: null,
      });

      const { result } = renderHook(() => useTopicAI({}));

      await act(async () => {
        await result.current.trending.fetch();
      });

      expect(supabase.functions.invoke).toHaveBeenCalledWith(
        'topic-ai',
        expect.objectContaining({
          body: expect.objectContaining({ action: 'trending' }),
        })
      );
    });

    it('clear resets trending state', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
        data: { topics: mockTrendingTopics, source: 'ai' },
        error: null,
      });

      const { result } = renderHook(() => useTopicAI({}));

      await act(async () => {
        await result.current.trending.fetch();
      });

      act(() => {
        result.current.trending.clear();
      });

      expect(result.current.trending.topics).toEqual([]);
    });
  });

  describe('suggestions module', () => {
    it('setSortBy updates sort option', () => {
      const { result } = renderHook(() => useTopicAI({}));
      expect(result.current.suggestions.sortBy).toBe('overall');

      act(() => {
        result.current.suggestions.setSortBy('engagement');
      });

      expect(result.current.suggestions.sortBy).toBe('engagement');
    });

    it('setMinScore filters suggestions', () => {
      const { result } = renderHook(() => useTopicAI({}));

      act(() => {
        result.current.suggestions.setMinScore(50);
      });

      expect(result.current.suggestions.minScore).toBe(50);
    });
  });
});
