import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PromptRewriteSuggestion {
  type: 'add_data' | 'add_urgency' | 'add_emotion' | 'simplify' | 'strengthen_cta' | 'improve_flow';
  label: string;
  suggestion: string;
  reason: string;
}

interface GetSuggestionsParams {
  promptContent: string;
  promptNumber: number;
  totalPrompts: number;
  videoType?: string;
  characterType?: string;
  scriptPurpose?: string;
  fullScriptContext?: string;
}

export function usePromptSuggestions() {
  const [suggestions, setSuggestions] = useState<PromptRewriteSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getSuggestions = useCallback(async (params: GetSuggestionsParams) => {
    setIsLoading(true);
    setError(null);
    setSuggestions([]);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('suggest-prompt-rewrite', {
        body: params,
      });

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setSuggestions(data.suggestions || []);
      return data.suggestions || [];
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Lỗi lấy gợi ý';
      setError(message);
      console.error('[usePromptSuggestions] Error:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setError(null);
  }, []);

  return {
    suggestions,
    isLoading,
    error,
    getSuggestions,
    clearSuggestions,
  };
}
