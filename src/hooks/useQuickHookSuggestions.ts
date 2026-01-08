/**
 * @deprecated Use useHookAI().quickSuggestions instead
 * This hook is kept for backward compatibility and will be removed in a future version.
 * 
 * @example
 * // Old way (deprecated)
 * const { suggestions, isLoading } = useQuickHookSuggestions({ topic, brandVoice });
 * 
 * // New way
 * const { quickSuggestions } = useHookAI({ topic, brandVoice });
 * quickSuggestions.suggestions, quickSuggestions.isLoading
 */

import { useHookAI, QuickHookSuggestion } from './ai/useHookAI';

interface BrandVoice {
  brand_name?: string;
  tone_of_voice?: string[];
  formality_level?: string;
}

interface UseQuickHookSuggestionsOptions {
  topic: string;
  brandVoice?: BrandVoice;
  enabled?: boolean;
}

export function useQuickHookSuggestions({
  topic,
  brandVoice,
  enabled = true,
}: UseQuickHookSuggestionsOptions) {
  const { quickSuggestions } = useHookAI({ topic, brandVoice, enabled });

  return {
    suggestions: quickSuggestions.suggestions,
    isLoading: quickSuggestions.isLoading,
    error: quickSuggestions.error,
    refresh: quickSuggestions.refresh,
  };
}

// Re-export type for backward compatibility
export type { QuickHookSuggestion };
