/**
 * Unit tests for useKPIAI consolidated hook
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { mockKPISuggestions, mockAdjustmentAnalysis } from './testUtils';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: vi.fn() },
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

import { useKPIAI } from '../useKPIAI';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

describe('useKPIAI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('returns both modules', () => {
      const { result } = renderHook(() => useKPIAI({}));
      expect(result.current).toHaveProperty('suggestions');
      expect(result.current).toHaveProperty('adjustments');
    });

    it('initializes with empty states', () => {
      const { result } = renderHook(() => useKPIAI({}));
      expect(result.current.suggestions.result).toBeNull();
      expect(result.current.suggestions.isLoading).toBe(false);
      expect(result.current.adjustments.analysis).toBeNull();
    });
  });

  describe('suggestions module', () => {
    it('fetchSuggestions calls edge function with action=suggest', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
        data: mockKPISuggestions,
        error: null,
      });

      const { result } = renderHook(() => useKPIAI({ campaignId: 'camp-123' }));

      await act(async () => {
        await result.current.suggestions.fetchSuggestions({
          objective: 'awareness',
          platform: 'facebook',
          industry: 'technology',
        });
      });

      expect(supabase.functions.invoke).toHaveBeenCalledWith(
        'kpi-ai',
        expect.objectContaining({
          body: expect.objectContaining({ action: 'suggest' }),
        })
      );
    });

    it('reset clears suggestion state', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
        data: mockKPISuggestions,
        error: null,
      });

      const { result } = renderHook(() => useKPIAI({}));

      await act(async () => {
        await result.current.suggestions.fetchSuggestions({ objective: 'awareness' });
      });

      act(() => {
        result.current.suggestions.reset();
      });

      expect(result.current.suggestions.result).toBeNull();
    });
  });

  describe('adjustments module', () => {
    it('checkNow calls edge function with action=adjust', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
        data: mockAdjustmentAnalysis,
        error: null,
      });

      const { result } = renderHook(() => useKPIAI({ campaignId: 'camp-123' }));

      await act(async () => {
        await result.current.adjustments.checkNow();
      });

      expect(supabase.functions.invoke).toHaveBeenCalledWith(
        'kpi-ai',
        expect.objectContaining({
          body: expect.objectContaining({ action: 'adjust' }),
        })
      );
    });

    it('dismissAll clears all suggestions', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
        data: mockAdjustmentAnalysis,
        error: null,
      });

      const { result } = renderHook(() => useKPIAI({ campaignId: 'camp-123' }));

      await act(async () => {
        await result.current.adjustments.checkNow();
      });

      await act(async () => {
        await result.current.adjustments.dismissAll();
      });

      expect(result.current.adjustments.analysis?.suggestions).toEqual([]);
    });
  });
});
