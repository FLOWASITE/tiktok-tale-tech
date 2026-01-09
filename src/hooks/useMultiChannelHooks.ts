/**
 * @deprecated Use useHookAI().multiChannel instead
 * This hook is kept for backward compatibility and will be removed in a future version.
 * 
 * @example
 * // Old way (deprecated)
 * const { hooks, isLoading } = useMultiChannelHooks({ topic, channels, brandVoice });
 * 
 * // New way
 * const { multiChannel } = useHookAI({ topic, channels, brandVoice });
 * multiChannel.hooks, multiChannel.isLoading
 */

import { useHookAI, MultiChannelHook, CHANNEL_HOOK_TYPES } from './ai/useHookAI';
import { Channel } from '@/types/multichannel';

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
  organizationId?: string;
  brandTemplateId?: string;
}

export function useMultiChannelHooks({
  topic,
  channels,
  brandVoice,
  enabled = true,
  organizationId,
  brandTemplateId,
}: UseMultiChannelHooksOptions) {
  const { multiChannel } = useHookAI({ topic, channels, brandVoice, enabled, organizationId, brandTemplateId });

  return {
    hooks: multiChannel.hooks,
    isLoading: multiChannel.isLoading,
    error: multiChannel.error,
    refresh: multiChannel.refresh,
    regenerateForChannel: multiChannel.regenerateForChannel,
    regeneratingChannel: multiChannel.regeneratingChannel,
    channelHookTypes: CHANNEL_HOOK_TYPES,
  };
}

// Re-export types for backward compatibility
export type { MultiChannelHook };
