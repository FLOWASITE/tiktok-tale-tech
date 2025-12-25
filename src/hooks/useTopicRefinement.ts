import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RefinedTopic {
  topic: string;
  angle: string;
  hook: string;
}

interface UseTopicRefinementOptions {
  rawTopic: string;
  videoType?: string;
  brandTemplateId?: string;
  enabled?: boolean;
}

interface UseTopicRefinementResult {
  refinedTopics: RefinedTopic[];
  isLoading: boolean;
  isTyping: boolean;
  error: string | null;
  refresh: () => void;
}

export function useTopicRefinement({
  rawTopic,
  videoType,
  brandTemplateId,
  enabled = true,
}: UseTopicRefinementOptions): UseTopicRefinementResult {
  const [refinedTopics, setRefinedTopics] = useState<RefinedTopic[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastTopicRef = useRef<string>('');

  const fetchRefinements = useCallback(async () => {
    if (!rawTopic || rawTopic.trim().length < 10) {
      setRefinedTopics([]);
      return;
    }

    // Don't refetch if topic hasn't changed significantly
    if (lastTopicRef.current === rawTopic.trim()) {
      return;
    }

    lastTopicRef.current = rawTopic.trim();
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('generate-topic-suggestions', {
        body: {
          mode: 'refine',
          rawTopic: rawTopic.trim(),
          videoType,
          brandTemplateId,
        },
      });

      if (fnError) throw fnError;

      if (data?.refinedTopics && Array.isArray(data.refinedTopics)) {
        setRefinedTopics(data.refinedTopics);
      } else if (data?.suggestions) {
        // Fallback: convert suggestions to refined topics
        setRefinedTopics(data.suggestions.slice(0, 3).map((s: any) => ({
          topic: s.topic,
          angle: s.category || 'general',
          hook: s.reasoning || '',
        })));
      } else {
        setRefinedTopics([]);
      }
    } catch (err) {
      console.error('Topic refinement error:', err);
      setError(err instanceof Error ? err.message : 'Không thể cải thiện chủ đề');
      setRefinedTopics([]);
    } finally {
      setIsLoading(false);
    }
  }, [rawTopic, videoType, brandTemplateId]);

  const refresh = useCallback(() => {
    lastTopicRef.current = '';
    fetchRefinements();
  }, [fetchRefinements]);

  useEffect(() => {
    if (!enabled || rawTopic.trim().length < 10) {
      setRefinedTopics([]);
      setIsLoading(false);
      setIsTyping(false);
      return;
    }

    // Show typing indicator immediately
    setIsTyping(true);

    // Debounce reduced to 400ms for faster response
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      setIsTyping(false);
      fetchRefinements();
    }, 400);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [rawTopic, enabled, fetchRefinements]);

  return {
    refinedTopics,
    isLoading,
    isTyping,
    error,
    refresh,
  };
}
