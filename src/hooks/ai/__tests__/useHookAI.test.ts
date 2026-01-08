/**
 * Unit tests for useHookAI consolidated hook
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { mockGeneratedHooks, mockQuickSuggestions, mockMultiChannelHooks } from './testUtils';

// Mock modules before imports
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: vi.fn() } },
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
import { supabase } from '@/integrations/supabase/client';

describe('useHookAI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('returns all three modules', () => {
      const { result } = renderHook(() => useHookAI({ topic: 'test topic' }));
      expect(result.current).toHaveProperty('generator');
      expect(result.current).toHaveProperty('quickSuggestions');
      expect(result.current).toHaveProperty('multiChannel');
    });

    it('initializes with empty states', () => {
      const { result } = renderHook(() => useHookAI({ topic: 'test topic' }));
      expect(result.current.generator.hooks).toEqual([]);
      expect(result.current.generator.loading).toBe(false);
      expect(result.current.generator.error).toBeNull();
    });
  });

  describe('generator module', () => {
    it('generateHooks calls edge function with correct params', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
        data: { hooks: mockGeneratedHooks },
        error: null,
      });

      const { result } = renderHook(() => useHookAI({ topic: 'marketing tips' }));

      await act(async () => {
        await result.current.generator.generateHooks({ topic: 'marketing tips' });
      });

      expect(supabase.functions.invoke).toHaveBeenCalledWith(
        'generate-hooks',
        expect.objectContaining({
          body: expect.objectContaining({ topic: 'marketing tips' }),
        })
      );
    });

    it('sets hooks on successful generation', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
        data: { hooks: mockGeneratedHooks },
        error: null,
      });

      const { result } = renderHook(() => useHookAI({ topic: 'test' }));

      await act(async () => {
        await result.current.generator.generateHooks({ topic: 'test' });
      });

      expect(result.current.generator.hooks).toEqual(mockGeneratedHooks);
      expect(result.current.generator.loading).toBe(false);
    });

    it('clearHooks resets state', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
        data: { hooks: mockGeneratedHooks },
        error: null,
      });

      const { result } = renderHook(() => useHookAI({ topic: 'test' }));

      await act(async () => {
        await result.current.generator.generateHooks({ topic: 'test' });
      });

      expect(result.current.generator.hooks.length).toBeGreaterThan(0);

      act(() => {
        result.current.generator.clearHooks();
      });

      expect(result.current.generator.hooks).toEqual([]);
    });
  });

  describe('quickSuggestions module', () => {
    it('does not auto-fetch with short topic', async () => {
      renderHook(() => useHookAI({ topic: 'short' }));

      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      expect(supabase.functions.invoke).not.toHaveBeenCalled();
    });
  });

  describe('multiChannel module', () => {
    it('has refresh function', () => {
      const { result } = renderHook(() => useHookAI({ topic: 'test topic', channels: ['youtube'] }));
      expect(typeof result.current.multiChannel.refresh).toBe('function');
    });
  });
});
