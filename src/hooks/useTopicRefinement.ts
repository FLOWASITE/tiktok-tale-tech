import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RefinedTopic {
  topic: string;
  angle: string;
  hook: string;
  targetPersona?: string;
  targetPersonaId?: string;
  productFit?: string;
  productFitId?: string;
  suggestedJourneyStage?: 'awareness' | 'consideration' | 'decision' | 'loyalty';
  suggestedContentAngle?: string;
}

export interface RefineContextUsed {
  hasPersonas: boolean;
  hasProducts: boolean;
  hasIndustryMemory: boolean;
  hasLearningContext: boolean;
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
  contextUsed: RefineContextUsed | null;
  // Progress tracking
  elapsedMs: number;
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
  const [contextUsed, setContextUsed] = useState<RefineContextUsed | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastTopicRef = useRef<string>('');
  const startTimeRef = useRef<number>(0);
  const elapsedTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchRefinements = useCallback(async () => {
    if (!rawTopic || rawTopic.trim().length < 10) {
      setRefinedTopics([]);
      setContextUsed(null);
      return;
    }

    // Don't refetch if topic hasn't changed significantly
    if (lastTopicRef.current === rawTopic.trim()) {
      return;
    }

    lastTopicRef.current = rawTopic.trim();
    setIsLoading(true);
    setError(null);
    setElapsedMs(0);
    
    // Start elapsed time tracking
    startTimeRef.current = Date.now();
    elapsedTimerRef.current = setInterval(() => {
      setElapsedMs(Date.now() - startTimeRef.current);
    }, 100);

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

      // Store context metadata
      if (data?.contextUsed) {
        setContextUsed(data.contextUsed);
      } else {
        setContextUsed(null);
      }
    } catch (err) {
      console.error('Topic refinement error:', err);
      setError(err instanceof Error ? err.message : 'Không thể cải thiện chủ đề');
      setRefinedTopics([]);
      setContextUsed(null);
    } finally {
      setIsLoading(false);
      // Stop elapsed timer
      if (elapsedTimerRef.current) {
        clearInterval(elapsedTimerRef.current);
        elapsedTimerRef.current = null;
      }
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
      setElapsedMs(0);
      return;
    }

    // Show typing indicator immediately
    setIsTyping(true);

    // Debounce increased to 600ms for full context fetch
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      setIsTyping(false);
      fetchRefinements();
    }, 600);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (elapsedTimerRef.current) {
        clearInterval(elapsedTimerRef.current);
      }
    };
  }, [rawTopic, enabled, fetchRefinements]);

  return {
    refinedTopics,
    isLoading,
    isTyping,
    error,
    refresh,
    contextUsed,
    elapsedMs,
  };
}
