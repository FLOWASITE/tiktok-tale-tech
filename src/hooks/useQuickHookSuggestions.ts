import { useState, useEffect, useCallback } from 'react';
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

  const cacheKey = `${topic}-${brandVoice?.brand_name || 'none'}`;

  const generateSuggestions = useCallback(async () => {
    if (!topic.trim() || topic.length < 10) {
      setSuggestions([]);
      return;
    }

    // Check cache first
    if (suggestionCache.has(cacheKey)) {
      setSuggestions(suggestionCache.get(cacheKey)!);
      return;
    }

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

      if (fnError) throw fnError;

      const hooks = data?.hooks || [];
      setSuggestions(hooks);
      
      // Cache the results
      suggestionCache.set(cacheKey, hooks);
    } catch (err) {
      console.error('Error generating quick hook suggestions:', err);
      setError(err instanceof Error ? err.message : 'Không thể tạo gợi ý hook');
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [topic, cacheKey, brandVoice]);

  useEffect(() => {
    if (!enabled || !topic.trim()) {
      setSuggestions([]);
      return;
    }

    // Debounce the API call
    const timer = setTimeout(() => {
      generateSuggestions();
    }, 500);

    return () => clearTimeout(timer);
  }, [enabled, topic, generateSuggestions]);

  const refresh = useCallback(() => {
    // Clear cache for this key and regenerate
    suggestionCache.delete(cacheKey);
    generateSuggestions();
  }, [cacheKey, generateSuggestions]);

  return {
    suggestions,
    isLoading,
    error,
    refresh,
  };
}
