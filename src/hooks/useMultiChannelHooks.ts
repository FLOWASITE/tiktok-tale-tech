import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Channel } from '@/types/multichannel';

export interface MultiChannelHook {
  channel: Channel;
  opening_line: string;
  hook_type: string;
  psychology?: string;
}

interface BrandVoice {
  brand_name?: string;
  tone_of_voice?: string[];
  formality_level?: string;
}

interface UseMultiChannelHooksOptions {
  topic: string;
  channels: Channel[];
  brandVoice?: BrandVoice;
  enabled?: boolean;
}

// Cache to avoid re-fetching
const hookCache = new Map<string, MultiChannelHook[]>();

// Pre-defined hook frameworks per channel
const CHANNEL_HOOK_TYPES: Record<Channel, string[]> = {
  facebook: ['Câu hỏi gợi mở', 'Thống kê gây sốc', 'Tuyên bố táo bạo', 'Kể chuyện'],
  instagram: ['Hook ngắn + emoji', 'Câu hỏi tò mò', 'Số liệu ấn tượng', 'Quote truyền cảm hứng'],
  linkedin: ['Professional insight', 'Bài học kinh doanh', 'Xu hướng ngành', 'Case study mở đầu'],
  twitter: ['Hot take', 'Thread opener', 'Controversial opinion', 'Breaking news style'],
  tiktok: ['Stop scrolling hook', 'Trend reference', 'POV opener', 'Secret reveal'],
  youtube: ['Thumbnail bait', 'Promise value', 'Mystery opener', 'Pain point'],
  website: ['SEO headline', 'Problem-solution', 'How-to intro', 'Listicle opener'],
  email: ['Subject line', 'Personal opener', 'Urgency hook', 'Curiosity gap'],
  zalo_oa: ['Lời chào thân thiện', 'Ưu đãi mở đầu', 'Tin nhắn gợi nhớ', 'Flash sale'],
  telegram: ['News alert', 'Exclusive content', 'Community update', 'Quick tip'],
  google_maps: ['Review response', 'Local highlight', 'Event announcement', 'Promotion'],
  threads: ['Conversation starter', 'Hot take', 'Story thread', 'Opinion piece'],
};

export function useMultiChannelHooks({
  topic,
  channels,
  brandVoice,
  enabled = true,
}: UseMultiChannelHooksOptions) {
  const [hooks, setHooks] = useState<MultiChannelHook[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const brandVoiceKey = brandVoice
    ? JSON.stringify({
        brand_name: brandVoice.brand_name || '',
        tone_of_voice: brandVoice.tone_of_voice || [],
        formality_level: brandVoice.formality_level || '',
      })
    : 'none';

  const channelsKey = channels.sort().join(',');
  const cacheKey = `mc-${topic}-${channelsKey}-${brandVoiceKey}`;

  const pendingRequestRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const generateHooks = useCallback(async () => {
    if (!topic.trim() || topic.length < 10 || channels.length === 0) {
      setHooks([]);
      return;
    }

    if (pendingRequestRef.current === cacheKey) {
      return;
    }

    if (hookCache.has(cacheKey)) {
      setHooks(hookCache.get(cacheKey)!);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    pendingRequestRef.current = cacheKey;
    abortControllerRef.current = new AbortController();
    setIsLoading(true);
    setError(null);

    try {
      // Generate hooks for top 3 priority channels
      const priorityChannels = channels.slice(0, 3);
      
      const { data, error: fnError } = await supabase.functions.invoke('generate-hooks', {
        body: {
          topic,
          brandVoice,
          count: priorityChannels.length,
          platforms: priorityChannels,
          multiChannel: true,
        },
      });

      if (pendingRequestRef.current !== cacheKey) {
        return;
      }

      if (fnError) throw fnError;

      // Map response to MultiChannelHook format
      const generatedHooks: MultiChannelHook[] = (data?.hooks || []).map((hook: any, idx: number) => ({
        channel: priorityChannels[idx] || priorityChannels[0],
        opening_line: hook.opening_line,
        hook_type: hook.framework || CHANNEL_HOOK_TYPES[priorityChannels[idx]]?.[0] || 'General',
        psychology: hook.psychology_reason,
      }));

      setHooks(generatedHooks);
      hookCache.set(cacheKey, generatedHooks);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      console.error('Error generating multi-channel hooks:', err);
      setError(err instanceof Error ? err.message : 'Không thể tạo hook');
      setHooks([]);
    } finally {
      if (pendingRequestRef.current === cacheKey) {
        pendingRequestRef.current = null;
        setIsLoading(false);
      }
    }
  }, [topic, channelsKey, cacheKey, brandVoice, channels]);

  useEffect(() => {
    if (!enabled || !topic.trim() || channels.length === 0) {
      setHooks([]);
      return;
    }

    const timer = setTimeout(() => {
      generateHooks();
    }, 1000);

    return () => {
      clearTimeout(timer);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [enabled, topic, channelsKey, generateHooks]);

  const refresh = useCallback(() => {
    hookCache.delete(cacheKey);
    pendingRequestRef.current = null;
    generateHooks();
  }, [cacheKey, generateHooks]);

  return {
    hooks,
    isLoading,
    error,
    refresh,
    channelHookTypes: CHANNEL_HOOK_TYPES,
  };
}
