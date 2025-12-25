import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface QuickHookSuggestion {
  framework: string;
  opening_line: string;
  visual_direction?: string;
  text_overlay?: string;
}

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

// Simple cache to avoid re-fetching for same topic
const suggestionCache = new Map<string, QuickHookSuggestion[]>();

export function useQuickHookSuggestions({
  topic,
  brandVoice,
  enabled = true,
}: UseQuickHookSuggestionsOptions) {
  const [suggestions, setSuggestions] = useState<QuickHookSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Serialize brandVoice to stable string for dependency comparison
  const brandVoiceKey = brandVoice 
    ? JSON.stringify({
        brand_name: brandVoice.brand_name || '',
        tone_of_voice: brandVoice.tone_of_voice || [],
        formality_level: brandVoice.formality_level || '',
      })
    : 'none';

  const cacheKey = `${topic}-${brandVoiceKey}`;
  
  // Track pending request to prevent duplicates
  const pendingRequestRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const generateSuggestions = useCallback(async () => {
    if (!topic.trim() || topic.length < 10) {
      setSuggestions([]);
      return;
    }

    // Skip if same request is already pending
    if (pendingRequestRef.current === cacheKey) {
      return;
    }

    // Check cache first
    if (suggestionCache.has(cacheKey)) {
      setSuggestions(suggestionCache.get(cacheKey)!);
      return;
    }

    // Cancel previous request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    pendingRequestRef.current = cacheKey;
    abortControllerRef.current = new AbortController();
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('generate-hooks', {
        body: {
          topic,
          brandVoice,
          count: 3,
          platform: 'tiktok',
        },
      });

      // Check if request was aborted or superseded
      if (pendingRequestRef.current !== cacheKey) {
        return;
      }

      if (fnError) throw fnError;

      const hooks = data?.hooks || [];
      setSuggestions(hooks);
      
      // Cache the results
      suggestionCache.set(cacheKey, hooks);
    } catch (err) {
      // Ignore abort errors
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      console.error('Error generating quick hook suggestions:', err);
      setError(err instanceof Error ? err.message : 'Không thể tạo gợi ý hook');
      setSuggestions([]);
    } finally {
      if (pendingRequestRef.current === cacheKey) {
        pendingRequestRef.current = null;
        setIsLoading(false);
      }
    }
  }, [topic, cacheKey, brandVoice]);

  useEffect(() => {
    if (!enabled || !topic.trim()) {
      setSuggestions([]);
      return;
    }

    // Increased debounce to 800ms to reduce API calls
    const timer = setTimeout(() => {
      generateSuggestions();
    }, 800);

    return () => {
      clearTimeout(timer);
      // Abort pending request on cleanup
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [enabled, topic, generateSuggestions]);

  const refresh = useCallback(() => {
    // Clear cache for this key and regenerate
    suggestionCache.delete(cacheKey);
    pendingRequestRef.current = null;
    generateSuggestions();
  }, [cacheKey, generateSuggestions]);

  return {
    suggestions,
    isLoading,
    error,
    refresh,
  };
}
