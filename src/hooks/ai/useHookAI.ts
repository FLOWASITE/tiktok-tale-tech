/**
 * useHookAI - Consolidated Hook AI Hook
 * 
 * Merges 3 hook-related hooks into one with sub-modules:
 * - generator: Generate hooks for video content
 * - quickSuggestions: Quick hook suggestions with caching
 * - multiChannel: Multi-channel hook generation
 * 
 * @example
 * const hookAI = useHookAI({ topic: 'AI marketing', brandVoice, channels: ['tiktok'] });
 * hookAI.generator.generateHooks({ topic, platform: 'tiktok' });
 * hookAI.quickSuggestions.suggestions
 * hookAI.multiChannel.hooks
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Channel } from '@/types/multichannel';
import { useAIErrorHandler } from './useAIErrorHandler';
import { invokeWithTimeout } from '@/lib/invokeEdgeFunctionWithTimeout';

// Needs to cover up to 5 retries (~16s backoff) + cold-start request (~10s) = ~30s safety margin
const AUXILIARY_HOOK_TIMEOUT_MS = 60_000;

async function invokeHookGenerator<T = any>(payload: Record<string, unknown>, timeoutMs = AUXILIARY_HOOK_TIMEOUT_MS) {
  return invokeWithTimeout<T>('generate-hooks', {
    body: payload,
    timeoutMs,
  });
}

// ============== TYPES ==============
export interface GeneratedHook {
  id?: string;
  framework: string;
  opening_line: string;
  visual_direction?: string;
  text_overlay?: string;
  psychology_reason?: string;
}

export interface QuickHookSuggestion {
  framework: string;
  opening_line: string;
  visual_direction?: string;
  text_overlay?: string;
}

export interface HookEvaluationScore {
  score: number;        // 0-18 combined score
  issues: string[];     // Quality issues
  strengths: string[];  // Quality strengths
}

export interface MultiChannelHook {
  channel: Channel;
  opening_line: string;
  hook_type: string;
  psychology?: string;
  evaluation?: HookEvaluationScore;
}

export interface BrandVoice {
  brand_name?: string;
  tone_of_voice?: string[];
  formality_level?: string;
  preferred_words?: string[];
  forbidden_words?: string[];
  brand_positioning?: string;
}

export interface GenerateHooksOptions {
  topic: string;
  brandVoice?: BrandVoice;
  platform?: string;
  duration?: string;
  count?: number;
  organizationId?: string;
  brandTemplateId?: string;
}

export interface UseHookAIOptions {
  topic?: string;
  brandVoice?: BrandVoice;
  channels?: Channel[];
  enabled?: boolean;
  organizationId?: string;
  brandTemplateId?: string;
}

// Pre-defined hook frameworks per channel
export const CHANNEL_HOOK_TYPES: Record<Channel, string[]> = {
  facebook: ['Câu hỏi gợi mở', 'Thống kê gây sốc', 'Tuyên bố táo bạo', 'Kể chuyện'],
  instagram: ['Hook ngắn + emoji', 'Câu hỏi tò mò', 'Số liệu ấn tượng', 'Quote truyền cảm hứng'],
  pinterest: ['Hook ngắn + emoji', 'Câu hỏi tò mò', 'Số liệu ấn tượng', 'Quote truyền cảm hứng'],
  linkedin: ['Professional insight', 'Bài học kinh doanh', 'Xu hướng ngành', 'Case study mở đầu'],
  twitter: ['Hot take', 'Thread opener', 'Controversial opinion', 'Breaking news style'],
  tiktok: ['Stop scrolling hook', 'Trend reference', 'POV opener', 'Secret reveal'],
  youtube: ['Thumbnail bait', 'Promise value', 'Mystery opener', 'Pain point'],
  website: ['SEO headline', 'Problem-solution', 'How-to intro', 'Listicle opener'],
  blogger: ['SEO headline', 'Problem-solution', 'How-to intro', 'Listicle opener'],
  wordpress: ['SEO headline', 'Problem-solution', 'How-to intro', 'Listicle opener'],
  email: ['Subject line', 'Personal opener', 'Urgency hook', 'Curiosity gap'],
  zalo_oa: ['Lời chào thân thiện', 'Ưu đãi mở đầu', 'Tin nhắn gợi nhớ', 'Flash sale'],
  telegram: ['News alert', 'Exclusive content', 'Community update', 'Quick tip'],
  google_maps: ['Review response', 'Local highlight', 'Event announcement', 'Promotion'],
  threads: ['Conversation starter', 'Hot take', 'Story thread', 'Opinion piece'],
  bluesky: ['Short take', 'Conversation starter', 'Hot take', 'Quick insight'],
};

// Shared caches
const quickSuggestionCache = new Map<string, QuickHookSuggestion[]>();
const multiChannelCache = new Map<string, MultiChannelHook[]>();

// ============== HOOK IMPLEMENTATION ==============
export function useHookAI(options: UseHookAIOptions = {}) {
  const { topic = '', brandVoice, channels = [], enabled = true, organizationId, brandTemplateId } = options;
  const { handleApiError } = useAIErrorHandler();

  // ============== GENERATOR MODULE ==============
  const [generatedHooks, setGeneratedHooks] = useState<GeneratedHook[]>([]);
  const [generatorLoading, setGeneratorLoading] = useState(false);
  const [generatorError, setGeneratorError] = useState<string | null>(null);

  const generateHooks = useCallback(async (genOptions: GenerateHooksOptions): Promise<GeneratedHook[]> => {
    const { topic: genTopic, brandVoice: genBrandVoice, platform, duration, count = 5 } = genOptions;
    
    if (!genTopic.trim()) {
      toast.error('Vui lòng nhập chủ đề');
      return [];
    }

    setGeneratorLoading(true);
    setGeneratorError(null);

    try {
      console.log('[useHookAI.generator] Generating hooks for:', genTopic);
      
      const { data, error: fnError } = await invokeHookGenerator({
        topic: genTopic,
        brandVoice: genBrandVoice,
        platform,
        duration,
        count,
        organizationId: genOptions.organizationId,
        brandTemplateId: genOptions.brandTemplateId,
      });

      if (fnError) {
        throw new Error(fnError.message || 'Failed to generate hooks');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const hooks = data?.hooks || [];
      setGeneratedHooks(hooks);
      
      if (hooks.length > 0) {
        toast.success(`Đã tạo ${hooks.length} hook`);
      }
      
      return hooks;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không thể tạo hooks';
      console.error('[useHookAI.generator] Error:', err);
      setGeneratorError(message);
      handleApiError(err, message);
      return [];
    } finally {
      setGeneratorLoading(false);
    }
  }, [handleApiError]);

  const clearGeneratedHooks = useCallback(() => {
    setGeneratedHooks([]);
    setGeneratorError(null);
  }, []);

  // ============== QUICK SUGGESTIONS MODULE ==============
  const [quickSuggestions, setQuickSuggestions] = useState<QuickHookSuggestion[]>([]);
  const [quickLoading, setQuickLoading] = useState(false);
  const [quickError, setQuickError] = useState<string | null>(null);

  const brandVoiceKey = brandVoice 
    ? JSON.stringify({
        brand_name: brandVoice.brand_name || '',
        tone_of_voice: brandVoice.tone_of_voice || [],
        formality_level: brandVoice.formality_level || '',
      })
    : 'none';

  const quickCacheKey = `${topic}-${brandVoiceKey}`;
  const quickPendingRef = useRef<string | null>(null);
  const quickAbortRef = useRef<AbortController | null>(null);
  const quickFailureCountRef = useRef(0);
  const quickCooldownUntilRef = useRef(0);

  const fetchQuickSuggestions = useCallback(async () => {
    if (!topic.trim() || topic.length < 10) {
      setQuickSuggestions([]);
      return;
    }

    // Cooldown after repeated failures (e.g. Lovable Gateway 402 / circuit OPEN)
    if (Date.now() < quickCooldownUntilRef.current) {
      return;
    }

    if (quickPendingRef.current === quickCacheKey) {
      return;
    }

    if (quickSuggestionCache.has(quickCacheKey)) {
      setQuickSuggestions(quickSuggestionCache.get(quickCacheKey)!);
      return;
    }

    if (quickAbortRef.current) {
      quickAbortRef.current.abort();
    }

    quickPendingRef.current = quickCacheKey;
    quickAbortRef.current = new AbortController();
    setQuickLoading(true);
    setQuickError(null);

    try {
      const { data, error: fnError } = await invokeHookGenerator({
        topic,
        brandVoice,
        count: 3,
        platform: 'tiktok',
        organizationId,
        brandTemplateId,
      });

      if (quickPendingRef.current !== quickCacheKey) {
        return;
      }

      if (fnError) throw fnError;

      const hooks = data?.hooks || [];
      setQuickSuggestions(hooks);
      quickSuggestionCache.set(quickCacheKey, hooks);
      quickFailureCountRef.current = 0;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      quickFailureCountRef.current += 1;
      // After 3 consecutive failures, back off for 5 minutes and stop logging
      if (quickFailureCountRef.current >= 3) {
        quickCooldownUntilRef.current = Date.now() + 5 * 60 * 1000;
      } else {
        console.warn('[useHookAI.quickSuggestions] Auxiliary hook request failed silently:', err instanceof Error ? err.message : err);
      }
      setQuickError(null);
      setQuickSuggestions([]);
    } finally {
      if (quickPendingRef.current === quickCacheKey) {
        quickPendingRef.current = null;
        setQuickLoading(false);
      }
    }
  }, [topic, quickCacheKey, brandVoice]);

  useEffect(() => {
    if (!enabled || !topic.trim()) {
      setQuickSuggestions([]);
      return;
    }

    const timer = setTimeout(() => {
      fetchQuickSuggestions();
    }, 800);

    return () => {
      clearTimeout(timer);
      if (quickAbortRef.current) {
        quickAbortRef.current.abort();
      }
    };
  }, [enabled, topic, fetchQuickSuggestions]);

  const refreshQuickSuggestions = useCallback(() => {
    quickSuggestionCache.delete(quickCacheKey);
    quickPendingRef.current = null;
    fetchQuickSuggestions();
  }, [quickCacheKey, fetchQuickSuggestions]);

  // ============== MULTI-CHANNEL MODULE ==============
  const [multiChannelHooks, setMultiChannelHooks] = useState<MultiChannelHook[]>([]);
  const [multiChannelLoading, setMultiChannelLoading] = useState(false);
  const [multiChannelError, setMultiChannelError] = useState<string | null>(null);
  const [regeneratingChannel, setRegeneratingChannel] = useState<Channel | null>(null);

  const channelsKey = channels.sort().join(',');
  const multiChannelCacheKey = `mc-${topic}-${channelsKey}-${brandVoiceKey}-${organizationId || 'no-org'}-${brandTemplateId || 'no-brand'}`;
  const mcPendingRef = useRef<string | null>(null);
  const mcAbortRef = useRef<AbortController | null>(null);

  const fetchMultiChannelHooks = useCallback(async () => {
    if (!topic.trim() || topic.length < 10 || channels.length === 0) {
      setMultiChannelHooks([]);
      return;
    }

    if (mcPendingRef.current === multiChannelCacheKey) {
      return;
    }

    if (multiChannelCache.has(multiChannelCacheKey)) {
      setMultiChannelHooks(multiChannelCache.get(multiChannelCacheKey)!);
      return;
    }

    if (mcAbortRef.current) {
      mcAbortRef.current.abort();
    }

    mcPendingRef.current = multiChannelCacheKey;
    mcAbortRef.current = new AbortController();
    setMultiChannelLoading(true);
    setMultiChannelError(null);

    try {
      // Generate hooks for ALL selected channels (no limit)
      const { data, error: fnError } = await invokeHookGenerator({
        topic,
        brandVoice,
        count: channels.length,
        platforms: channels,
        multiChannel: true,
        organizationId,
        brandTemplateId,
      });

      if (mcPendingRef.current !== multiChannelCacheKey) {
        return;
      }

      if (fnError) throw fnError;

      // Map hooks using platform field from API (not by index)
      const generatedHooks: MultiChannelHook[] = (data?.hooks || []).map((hook: any) => {
        const hookChannel = (hook.platform as Channel) || channels[0];
        return {
          channel: hookChannel,
          opening_line: hook.opening_line,
          hook_type: hook.framework || CHANNEL_HOOK_TYPES[hookChannel]?.[0] || 'General',
          psychology: hook.psychology_reason,
          evaluation: hook.evaluation,
        };
      });

      setMultiChannelHooks(generatedHooks);
      multiChannelCache.set(multiChannelCacheKey, generatedHooks);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      console.warn('[useHookAI.multiChannel] Auxiliary multi-channel hook request failed silently:', err instanceof Error ? err.message : err);
      setMultiChannelError(null);
      setMultiChannelHooks([]);
    } finally {
      if (mcPendingRef.current === multiChannelCacheKey) {
        mcPendingRef.current = null;
        setMultiChannelLoading(false);
      }
    }
  }, [topic, channelsKey, multiChannelCacheKey, brandVoice, channels]);

  useEffect(() => {
    if (!enabled || !topic.trim() || channels.length === 0) {
      setMultiChannelHooks([]);
      return;
    }

    const timer = setTimeout(() => {
      fetchMultiChannelHooks();
    }, 1000);

    return () => {
      clearTimeout(timer);
      if (mcAbortRef.current) {
        mcAbortRef.current.abort();
      }
    };
  }, [enabled, topic, channelsKey, fetchMultiChannelHooks]);

  const refreshMultiChannelHooks = useCallback(() => {
    multiChannelCache.delete(multiChannelCacheKey);
    mcPendingRef.current = null;
    fetchMultiChannelHooks();
  }, [multiChannelCacheKey, fetchMultiChannelHooks]);

  // Regenerate hook for a SINGLE channel
  const regenerateForChannel = useCallback(async (channel: Channel): Promise<MultiChannelHook | null> => {
    if (!topic.trim() || topic.length < 10) {
      toast.error('Cần có chủ đề hợp lệ');
      return null;
    }

    setRegeneratingChannel(channel);

    try {
      console.log('[useHookAI.multiChannel] Regenerating hook for:', channel);
      
      const { data, error: fnError } = await invokeHookGenerator({
        topic,
        brandVoice,
        platforms: [channel], // Single channel
        organizationId,
        brandTemplateId,
      });

      if (fnError) throw fnError;

      const hook = data?.hooks?.[0];
      if (!hook) {
        throw new Error('Không nhận được hook từ API');
      }

      const newHook: MultiChannelHook = {
        channel,
        opening_line: hook.opening_line,
        hook_type: hook.framework || CHANNEL_HOOK_TYPES[channel]?.[0] || 'General',
        psychology: hook.psychology_reason,
        evaluation: hook.evaluation,
      };

      // Update state - replace old hook for this channel
      setMultiChannelHooks(prev => {
        const updated = prev.filter(h => h.channel !== channel);
        return [...updated, newHook];
      });

      // Update cache
      const cached = multiChannelCache.get(multiChannelCacheKey);
      if (cached) {
        const updatedCache = cached.filter(h => h.channel !== channel);
        multiChannelCache.set(multiChannelCacheKey, [...updatedCache, newHook]);
      }

      toast.success(`Đã tạo lại hook cho ${channel}`);
      return newHook;
    } catch (err) {
      console.error('[useHookAI.multiChannel] Regenerate error:', err);
      toast.error(err instanceof Error ? err.message : 'Không thể tạo lại hook');
      return null;
    } finally {
      setRegeneratingChannel(null);
    }
  }, [topic, brandVoice, organizationId, brandTemplateId, multiChannelCacheKey]);

  // ============== RETURN ==============
  return {
    // Generator module
    generator: {
      hooks: generatedHooks,
      loading: generatorLoading,
      error: generatorError,
      generateHooks,
      clearHooks: clearGeneratedHooks,
    },

    // Quick suggestions module
    quickSuggestions: {
      suggestions: quickSuggestions,
      isLoading: quickLoading,
      error: quickError,
      refresh: refreshQuickSuggestions,
    },

    // Multi-channel module
    multiChannel: {
      hooks: multiChannelHooks,
      isLoading: multiChannelLoading,
      error: multiChannelError,
      refresh: refreshMultiChannelHooks,
      regenerateForChannel,
      regeneratingChannel,
      channelHookTypes: CHANNEL_HOOK_TYPES,
    },
  };
}

// ============== TYPE EXPORTS ==============
export interface UseHookAIResult {
  generator: {
    hooks: GeneratedHook[];
    loading: boolean;
    error: string | null;
    generateHooks: (options: GenerateHooksOptions) => Promise<GeneratedHook[]>;
    clearHooks: () => void;
  };
  quickSuggestions: {
    suggestions: QuickHookSuggestion[];
    isLoading: boolean;
    error: string | null;
    refresh: () => void;
  };
  multiChannel: {
    hooks: MultiChannelHook[];
    isLoading: boolean;
    error: string | null;
    refresh: () => void;
    regenerateForChannel: (channel: Channel) => Promise<MultiChannelHook | null>;
    regeneratingChannel: Channel | null;
    channelHookTypes: Record<Channel, string[]>;
  };
}
