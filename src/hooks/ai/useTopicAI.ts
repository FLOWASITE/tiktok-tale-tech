/**
 * Consolidated Topic AI Hook
 * Combines: useTopicRefinement, useTopicIntelligence, useTopicRecommendations,
 *           useTrendingTopics, useEnhancedTopicSuggestions
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useAIErrorHandler } from './useAIErrorHandler';
import { toast } from 'sonner';
import type {
  AIErrorCode,
  RefinedTopic,
  RefineContextUsed,
  TopicGap,
  TopicCluster,
  KeywordExpansion,
  TopicRefinementIntel,
  GapAnalysisResult,
  ClusterAnalysisResult,
  NextBestTopic,
  WeeklyPlan,
  WeeklyPlanItem,
  TopicConflict,
  ConflictCheckResult,
  LearningResult,
  TrendingTopic,
  EnhancedTopicSuggestion,
  TopicScores,
  TopicCategory,
  TopicFormat,
  SortOption,
  calculateOverallScore,
  SuggestAudienceResult,
} from './types';
import { ContentGoal } from '@/types/multichannel';

export interface UseTopicAIOptions {
  brandTemplateId?: string;
  contentGoal?: ContentGoal;
  format?: TopicFormat;
  autoFetch?: boolean;
  enabled?: boolean;
}

// ============== REFINEMENT MODULE ==============
interface RefinementModule {
  refinedTopics: RefinedTopic[];
  contextUsed: RefineContextUsed | null;
  elapsedMs: number;
  isLoading: boolean;
  isTyping: boolean;
  error: string | null;
  refine: (rawTopic: string, videoType?: string) => void;
  refresh: () => void;
}

// ============== INTELLIGENCE MODULE ==============
interface IntelligenceModule {
  gaps: GapAnalysisResult | null;
  clusters: ClusterAnalysisResult | null;
  keywords: KeywordExpansion | null;
  refinement: TopicRefinementIntel | null;
  isLoading: boolean;
  error: string | null;
  errorCode: AIErrorCode | null;
  analyzeGaps: () => Promise<GapAnalysisResult | null>;
  analyzeClusters: () => Promise<ClusterAnalysisResult | null>;
  expandKeywords: () => Promise<KeywordExpansion | null>;
  refineTopic: (topicToRefine: string) => Promise<TopicRefinementIntel | null>;
  clearResults: () => void;
}

// ============== RECOMMENDATIONS MODULE ==============
interface RecommendationsModule {
  nextBest: NextBestTopic | null;
  weeklyPlan: WeeklyPlan | null;
  conflicts: ConflictCheckResult | null;
  learnings: LearningResult | null;
  isLoading: boolean;
  error: string | null;
  errorCode: AIErrorCode | null;
  getNextBestTopic: () => Promise<NextBestTopic | null>;
  getWeeklyPlan: () => Promise<WeeklyPlan | null>;
  checkConflicts: (topics: string[]) => Promise<ConflictCheckResult | null>;
  submitFeedback: (topicId: string, feedback: 'positive' | 'negative', reason?: string) => Promise<LearningResult | null>;
  clearResults: () => void;
}

// ============== TRENDING MODULE ==============
interface TrendingModule {
  topics: TrendingTopic[];
  source: 'cache' | 'ai' | null;
  isLoading: boolean;
  error: string | null;
  errorCode: AIErrorCode | null;
  fetch: (forceRefresh?: boolean) => Promise<void>;
  refresh: () => Promise<void>;
  clear: () => void;
}

// ============== SUGGESTIONS MODULE ==============
interface SuggestionsModule {
  suggestions: EnhancedTopicSuggestion[];
  allSuggestions: EnhancedTopicSuggestion[];
  source: 'ai' | 'cache' | 'fallback';
  isLoading: boolean;
  isEnhancing: boolean;
  error: string | null;
  errorCode: AIErrorCode | null;
  sortBy: SortOption;
  setSortBy: (sort: SortOption) => void;
  minScore: number;
  setMinScore: (score: number) => void;
  stats: { averageScore: number; topPerformersCount: number; totalCount: number } | null;
  autoSavedCount: number;
  refresh: () => void;
  autoSaveSuggestions: (topics: EnhancedTopicSuggestion[]) => Promise<void>;
  submitFeedback: (suggestion: EnhancedTopicSuggestion, feedback: 'positive' | 'negative') => Promise<void>;
  saveSuggestion: (suggestion: EnhancedTopicSuggestion) => Promise<string | null>;
}

// ============== AUDIENCE MODULE ==============
interface AudienceModule {
  result: SuggestAudienceResult | null;
  isLoading: boolean;
  error: string | null;
  errorCode: AIErrorCode | null;
  suggestAudience: (topic: string, contentGoal?: string) => Promise<SuggestAudienceResult | null>;
  clear: () => void;
}

export interface UseTopicAIResult {
  refinement: RefinementModule;
  intelligence: IntelligenceModule;
  recommendations: RecommendationsModule;
  trending: TrendingModule;
  suggestions: SuggestionsModule;
  audience: AudienceModule;
}

export function useTopicAI(options: UseTopicAIOptions = {}): UseTopicAIResult {
  const { brandTemplateId, contentGoal, format, autoFetch = false, enabled = true } = options;
  const { handleApiError } = useAIErrorHandler();
  const { user } = useAuth();
  const { currentOrganization } = useOrganizationContext();

  // ============== REFINEMENT STATE ==============
  const [refinedTopics, setRefinedTopics] = useState<RefinedTopic[]>([]);
  const [refineContextUsed, setRefineContextUsed] = useState<RefineContextUsed | null>(null);
  const [refineElapsedMs, setRefineElapsedMs] = useState(0);
  const [refineLoading, setRefineLoading] = useState(false);
  const [refineTyping, setRefineTyping] = useState(false);
  const [refineError, setRefineError] = useState<string | null>(null);
  const refineDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastRefineTopicRef = useRef<string>('');
  const refineStartTimeRef = useRef<number>(0);
  const refineElapsedTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ============== INTELLIGENCE STATE ==============
  const [gaps, setGaps] = useState<GapAnalysisResult | null>(null);
  const [clusters, setClusters] = useState<ClusterAnalysisResult | null>(null);
  const [keywords, setKeywords] = useState<KeywordExpansion | null>(null);
  const [intelRefinement, setIntelRefinement] = useState<TopicRefinementIntel | null>(null);
  const [intelLoading, setIntelLoading] = useState(false);
  const [intelError, setIntelError] = useState<string | null>(null);
  const [intelErrorCode, setIntelErrorCode] = useState<AIErrorCode | null>(null);

  // ============== RECOMMENDATIONS STATE ==============
  const [nextBest, setNextBest] = useState<NextBestTopic | null>(null);
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(null);
  const [conflicts, setConflicts] = useState<ConflictCheckResult | null>(null);
  const [learnings, setLearnings] = useState<LearningResult | null>(null);
  const [recLoading, setRecLoading] = useState(false);
  const [recError, setRecError] = useState<string | null>(null);
  const [recErrorCode, setRecErrorCode] = useState<AIErrorCode | null>(null);

  // ============== TRENDING STATE ==============
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [trendingSource, setTrendingSource] = useState<'cache' | 'ai' | null>(null);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [trendingError, setTrendingError] = useState<string | null>(null);
  const [trendingErrorCode, setTrendingErrorCode] = useState<AIErrorCode | null>(null);
  const trendingFetchedRef = useRef(false);

  // ============== SUGGESTIONS STATE ==============
  const [allSuggestions, setAllSuggestions] = useState<EnhancedTopicSuggestion[]>([]);
  const [suggestSource, setSuggestSource] = useState<'ai' | 'cache' | 'fallback'>('fallback');
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestEnhancing, setSuggestEnhancing] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [suggestErrorCode, setSuggestErrorCode] = useState<AIErrorCode | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('overall');
  const [minScore, setMinScore] = useState<number>(0);
  const [autoSavedCount, setAutoSavedCount] = useState(0);
  const suggestPrevParamsRef = useRef<string>('');
  const suggestHasLoadedRef = useRef(false);
  const autoSavedTopicsRef = useRef<Set<string>>(new Set());
  const suggestAbortControllerRef = useRef<AbortController | null>(null);
  const suggestIsFetchingRef = useRef(false);

  // ============== AUDIENCE STATE ==============
  const [audienceResult, setAudienceResult] = useState<SuggestAudienceResult | null>(null);
  const [audienceLoading, setAudienceLoading] = useState(false);
  const [audienceError, setAudienceError] = useState<string | null>(null);
  const [audienceErrorCode, setAudienceErrorCode] = useState<AIErrorCode | null>(null);

  // ============== CONSOLIDATED ERROR HANDLER (Phase 4) ==============
  /**
   * Factory function to create module-specific error handlers
   * Eliminates duplicate code between Intel, Rec, Trending, and Audience modules
   */
  const createApiErrorHandler = useCallback((
    setError: (error: string | null) => void,
    setErrorCode: (code: AIErrorCode | null) => void,
    moduleName: string
  ) => {
    return (err: any, fallbackMessage: string) => {
      // Only log unknown errors as console.error; credits/rate-limit are expected states.
      // (Some monitoring setups treat console.error as "runtime crash".)
      
      // Try to extract structured error from response body
      if (err?.context?.body) {
        try {
          const body = JSON.parse(err.context.body);
          if (body.errorCode === 'CREDITS_EXHAUSTED') {
            setError(body.error || 'AI credits đã hết');
            setErrorCode('CREDITS_EXHAUSTED');
            toast.error('AI credits đã hết. Vui lòng nạp thêm tại Settings → Usage.');
            return;
          }
          if (body.errorCode === 'RATE_LIMIT') {
            setError(body.error || 'Rate limit exceeded');
            setErrorCode('RATE_LIMIT');
            toast.error('Quá giới hạn request. Vui lòng thử lại sau.');
            return;
          }
        } catch {
          // Ignore parse errors
        }
      }
      
      // Fallback: check error message for known patterns
      const errMessage = err?.message || '';
      if (errMessage.includes('402') || errMessage.includes('credits')) {
        setError('AI credits đã hết');
        setErrorCode('CREDITS_EXHAUSTED');
        toast.error('AI credits đã hết. Vui lòng nạp thêm tại Settings → Usage.');
        return;
      }
      if (errMessage.includes('429') || errMessage.includes('rate')) {
        setError('Rate limit exceeded');
        setErrorCode('RATE_LIMIT');
        toast.error('Quá giới hạn request. Vui lòng thử lại sau.');
        return;
      }
      
      // Default: unknown error
      console.error(`[${moduleName}] ${fallbackMessage}`, err);
      setError(errMessage || fallbackMessage);
      setErrorCode('UNKNOWN');
      toast.error(fallbackMessage);
    };
  }, []);

  // Create module-specific error handlers using the factory
  const handleIntelApiError = useMemo(
    () => createApiErrorHandler(setIntelError, setIntelErrorCode, 'Intelligence'),
    [createApiErrorHandler]
  );

  const handleRecApiError = useMemo(
    () => createApiErrorHandler(setRecError, setRecErrorCode, 'Recommendations'),
    [createApiErrorHandler]
  );

  const handleTrendingApiError = useMemo(
    () => createApiErrorHandler(setTrendingError, setTrendingErrorCode, 'Trending'),
    [createApiErrorHandler]
  );

  const handleAudienceApiError = useMemo(
    () => createApiErrorHandler(setAudienceError, setAudienceErrorCode, 'Audience'),
    [createApiErrorHandler]
  );

  const handleSuggestApiError = useMemo(
    () => createApiErrorHandler(setSuggestError, setSuggestErrorCode, 'Suggestions'),
    [createApiErrorHandler]
  );

  // ============== REFINEMENT METHODS ==============
  const fetchRefinements = useCallback(async (rawTopic: string, videoType?: string) => {
    if (!rawTopic || rawTopic.trim().length < 10) {
      setRefinedTopics([]);
      setRefineContextUsed(null);
      return;
    }

    if (lastRefineTopicRef.current === rawTopic.trim()) {
      return;
    }

    lastRefineTopicRef.current = rawTopic.trim();
    setRefineLoading(true);
    setRefineError(null);
    setRefineElapsedMs(0);
    
    refineStartTimeRef.current = Date.now();
    refineElapsedTimerRef.current = setInterval(() => {
      setRefineElapsedMs(Date.now() - refineStartTimeRef.current);
    }, 100);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('topic-ai', {
        body: {
          action: 'refine',
          rawTopic: rawTopic.trim(),
          videoType,
          brandTemplateId,
          contentGoal,
        },
      });

      if (fnError) throw fnError;

      if (data?.refinedTopics && Array.isArray(data.refinedTopics)) {
        setRefinedTopics(data.refinedTopics);
      } else if (data?.suggestions) {
        setRefinedTopics(data.suggestions.slice(0, 3).map((s: any) => ({
          topic: s.topic,
          angle: s.category || 'general',
          hook: s.reasoning || '',
        })));
      } else {
        setRefinedTopics([]);
      }

      if (data?.contextUsed) {
        setRefineContextUsed(data.contextUsed);
      } else {
        setRefineContextUsed(null);
      }
    } catch (err) {
      console.error('Topic refinement error:', err);
      setRefineError(err instanceof Error ? err.message : 'Không thể cải thiện chủ đề');
      setRefinedTopics([]);
      setRefineContextUsed(null);
    } finally {
      setRefineLoading(false);
      if (refineElapsedTimerRef.current) {
        clearInterval(refineElapsedTimerRef.current);
        refineElapsedTimerRef.current = null;
      }
    }
  }, [brandTemplateId]);

  const refine = useCallback((rawTopic: string, videoType?: string) => {
    if (!enabled || rawTopic.trim().length < 10) {
      setRefinedTopics([]);
      setRefineLoading(false);
      setRefineTyping(false);
      setRefineElapsedMs(0);
      return;
    }

    setRefineTyping(true);

    if (refineDebounceRef.current) {
      clearTimeout(refineDebounceRef.current);
    }

    // OPTIMIZATION: Increased debounce from 600ms to 1200ms to reduce rapid AI calls
    refineDebounceRef.current = setTimeout(() => {
      setRefineTyping(false);
      fetchRefinements(rawTopic, videoType);
    }, 1200);
  }, [enabled, fetchRefinements]);

  const refreshRefinement = useCallback(() => {
    const topic = lastRefineTopicRef.current;
    if (topic) {
      lastRefineTopicRef.current = '';
      fetchRefinements(topic);
    }
  }, [fetchRefinements]);

  // Cleanup refinement timers
  useEffect(() => {
    return () => {
      if (refineDebounceRef.current) clearTimeout(refineDebounceRef.current);
      if (refineElapsedTimerRef.current) clearInterval(refineElapsedTimerRef.current);
    };
  }, []);

  // ============== INTELLIGENCE METHODS ==============
  const analyzeGaps = useCallback(async (): Promise<GapAnalysisResult | null> => {
    if (!user) return null;
    
    setIntelLoading(true);
    setIntelError(null);
    setIntelErrorCode(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('topic-ai', {
        body: {
          action: 'gap_analysis',
          brandTemplateId,
          contentGoal,
          organizationId: currentOrganization?.id,
        },
      });

      if (fnError) throw fnError;
      
      if (data.success && data.result?.gaps) {
        setGaps(data.result as GapAnalysisResult);
        return data.result as GapAnalysisResult;
      } else {
        if (data.errorCode) {
          handleIntelApiError({ message: data.error, context: { body: JSON.stringify(data) } }, 'Không thể phân tích gaps');
          return null;
        }
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err: any) {
      handleIntelApiError(err, 'Không thể phân tích gaps');
      return null;
    } finally {
      setIntelLoading(false);
    }
  }, [user, brandTemplateId, contentGoal, currentOrganization?.id, handleIntelApiError]);

  const analyzeClusters = useCallback(async (): Promise<ClusterAnalysisResult | null> => {
    if (!user) return null;
    
    setIntelLoading(true);
    setIntelError(null);
    setIntelErrorCode(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('topic-ai', {
        body: {
          action: 'cluster',
          brandTemplateId,
          contentGoal,
          organizationId: currentOrganization?.id,
        },
      });

      if (fnError) throw fnError;
      
      if (data.success && data.result?.clusters) {
        setClusters(data.result as ClusterAnalysisResult);
        return data.result as ClusterAnalysisResult;
      } else {
        if (data.errorCode) {
          handleIntelApiError({ message: data.error, context: { body: JSON.stringify(data) } }, 'Không thể phân cụm topics');
          return null;
        }
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err: any) {
      handleIntelApiError(err, 'Không thể phân cụm topics');
      return null;
    } finally {
      setIntelLoading(false);
    }
  }, [user, brandTemplateId, contentGoal, currentOrganization?.id, handleIntelApiError]);

  const expandKeywords = useCallback(async (): Promise<KeywordExpansion | null> => {
    if (!user) return null;
    
    setIntelLoading(true);
    setIntelError(null);
    setIntelErrorCode(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('topic-ai', {
        body: {
          action: 'keywords',
          brandTemplateId,
          contentGoal,
          organizationId: currentOrganization?.id,
        },
      });

      if (fnError) throw fnError;
      
      if (data.success && data.result?.lsiKeywords) {
        setKeywords(data.result as KeywordExpansion);
        return data.result as KeywordExpansion;
      } else {
        if (data.errorCode) {
          handleIntelApiError({ message: data.error, context: { body: JSON.stringify(data) } }, 'Không thể mở rộng keywords');
          return null;
        }
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err: any) {
      handleIntelApiError(err, 'Không thể mở rộng keywords');
      return null;
    } finally {
      setIntelLoading(false);
    }
  }, [user, brandTemplateId, contentGoal, currentOrganization?.id, handleIntelApiError]);

  const refineTopicIntel = useCallback(async (topicToRefine: string): Promise<TopicRefinementIntel | null> => {
    if (!user || !topicToRefine) return null;
    
    setIntelLoading(true);
    setIntelError(null);
    setIntelErrorCode(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('topic-ai', {
        body: {
          action: 'refine_intel',
          brandTemplateId,
          contentGoal,
          organizationId: currentOrganization?.id,
          topicToRefine,
        },
      });

      if (fnError) throw fnError;
      
      if (data.success && data.result?.refinedVersions) {
        setIntelRefinement(data.result as TopicRefinementIntel);
        return data.result as TopicRefinementIntel;
      } else {
        if (data.errorCode) {
          handleIntelApiError({ message: data.error, context: { body: JSON.stringify(data) } }, 'Không thể tinh chỉnh topic');
          return null;
        }
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err: any) {
      handleIntelApiError(err, 'Không thể tinh chỉnh topic');
      return null;
    } finally {
      setIntelLoading(false);
    }
  }, [user, brandTemplateId, contentGoal, currentOrganization?.id, handleIntelApiError]);

  const clearIntelResults = useCallback(() => {
    setGaps(null);
    setClusters(null);
    setKeywords(null);
    setIntelRefinement(null);
    setIntelError(null);
    setIntelErrorCode(null);
  }, []);

  // ============== RECOMMENDATIONS METHODS ==============
  const getNextBestTopic = useCallback(async (): Promise<NextBestTopic | null> => {
    if (!user) return null;

    setRecLoading(true);
    setRecError(null);
    setRecErrorCode(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('topic-ai', {
        body: {
          action: 'next_best',
          brandTemplateId,
          contentGoal,
          organizationId: currentOrganization?.id,
        },
      });

      if (fnError) throw fnError;

      if (data.success && data.result) {
        setNextBest(data.result as NextBestTopic);
        return data.result as NextBestTopic;
      } else {
        if (data.errorCode) {
          handleRecApiError({ message: data.error, context: { body: JSON.stringify(data) } }, 'Không thể lấy đề xuất topic');
          return null;
        }
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err: any) {
      handleRecApiError(err, 'Không thể lấy đề xuất topic');
      return null;
    } finally {
      setRecLoading(false);
    }
  }, [user, brandTemplateId, contentGoal, currentOrganization?.id, handleRecApiError]);

  const getWeeklyPlan = useCallback(async (): Promise<WeeklyPlan | null> => {
    if (!user) return null;

    setRecLoading(true);
    setRecError(null);
    setRecErrorCode(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('topic-ai', {
        body: {
          action: 'weekly_plan',
          brandTemplateId,
          contentGoal,
          organizationId: currentOrganization?.id,
        },
      });

      if (fnError) throw fnError;

      if (data.success && data.result) {
        setWeeklyPlan(data.result as WeeklyPlan);
        return data.result as WeeklyPlan;
      } else {
        if (data.errorCode) {
          handleRecApiError({ message: data.error, context: { body: JSON.stringify(data) } }, 'Không thể tạo kế hoạch tuần');
          return null;
        }
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err: any) {
      handleRecApiError(err, 'Không thể tạo kế hoạch tuần');
      return null;
    } finally {
      setRecLoading(false);
    }
  }, [user, brandTemplateId, contentGoal, currentOrganization?.id, handleRecApiError]);

  const checkConflicts = useCallback(async (topics: string[]): Promise<ConflictCheckResult | null> => {
    if (!user || topics.length === 0) return null;

    setRecLoading(true);
    setRecError(null);
    setRecErrorCode(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('topic-ai', {
        body: {
          action: 'conflict_check',
          brandTemplateId,
          contentGoal,
          organizationId: currentOrganization?.id,
          topics,
        },
      });

      if (fnError) throw fnError;

      if (data.success && data.result) {
        setConflicts(data.result as ConflictCheckResult);
        return data.result as ConflictCheckResult;
      } else {
        if (data.errorCode) {
          handleRecApiError({ message: data.error, context: { body: JSON.stringify(data) } }, 'Không thể kiểm tra xung đột');
          return null;
        }
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err: any) {
      handleRecApiError(err, 'Không thể kiểm tra xung đột');
      return null;
    } finally {
      setRecLoading(false);
    }
  }, [user, brandTemplateId, contentGoal, currentOrganization?.id, handleRecApiError]);

  const submitRecFeedback = useCallback(async (
    topicId: string,
    feedback: 'positive' | 'negative',
    reason?: string
  ): Promise<LearningResult | null> => {
    if (!user) return null;

    setRecLoading(true);
    setRecError(null);
    setRecErrorCode(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('topic-ai', {
        body: {
          action: 'learning',
          brandTemplateId,
          contentGoal,
          organizationId: currentOrganization?.id,
          feedbackData: { topicId, feedback, reason },
        },
      });

      if (fnError) throw fnError;

      if (data.success && data.result) {
        setLearnings(data.result as LearningResult);
        toast.success('Đã ghi nhận feedback');
        return data.result as LearningResult;
      } else {
        if (data.errorCode) {
          handleRecApiError({ message: data.error, context: { body: JSON.stringify(data) } }, 'Không thể gửi feedback');
          return null;
        }
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err: any) {
      handleRecApiError(err, 'Không thể gửi feedback');
      return null;
    } finally {
      setRecLoading(false);
    }
  }, [user, brandTemplateId, contentGoal, currentOrganization?.id, handleRecApiError]);

  const clearRecResults = useCallback(() => {
    setNextBest(null);
    setWeeklyPlan(null);
    setConflicts(null);
    setLearnings(null);
    setRecError(null);
    setRecErrorCode(null);
  }, []);

  // ============== TRENDING METHODS ==============
  const fetchTrending = useCallback(async (forceRefresh = false) => {
    if (!user || !currentOrganization) {
      setTrendingError('Cần đăng nhập và chọn tổ chức');
      return;
    }

    setTrendingLoading(true);
    setTrendingError(null);
    setTrendingErrorCode(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('topic-ai', {
        body: {
          action: 'trending',
          brandTemplateId,
          organizationId: currentOrganization.id,
          forceRefresh,
        },
      });

      if (fnError) {
        const wrappedErr: any = new Error(fnError.message);
        wrappedErr.context = (fnError as any).context;
        throw wrappedErr;
      }

      if (!data.success) {
        if (data.errorCode === 'RATE_LIMIT') {
          setTrendingErrorCode('RATE_LIMIT');
          toast.error('Đã vượt giới hạn. Vui lòng thử lại sau.');
        } else if (data.errorCode === 'CREDITS_EXHAUSTED') {
          setTrendingErrorCode('CREDITS_EXHAUSTED');
          toast.error('Đã hết credits AI. Vui lòng nâng cấp gói.');
        } else {
          throw new Error(data.error || 'Không thể lấy trending topics');
        }
        return;
      }

      setTrendingTopics(data.data || []);
      setTrendingSource(data.source);
      
      if (data.source === 'ai') {
        toast.success(`Đã phát hiện ${data.data?.length || 0} xu hướng mới`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Lỗi không xác định';
      setTrendingError(message);
      toast.error('Lỗi khi lấy trending topics: ' + message);
    } finally {
      setTrendingLoading(false);
    }
  }, [user, currentOrganization, brandTemplateId]);

  const refreshTrending = useCallback(() => {
    return fetchTrending(true);
  }, [fetchTrending]);

  const clearTrending = useCallback(() => {
    setTrendingTopics([]);
    setTrendingSource(null);
    setTrendingError(null);
    setTrendingErrorCode(null);
  }, []);

  // Auto-fetch trending on mount
  useEffect(() => {
    if (autoFetch && user && currentOrganization && !trendingFetchedRef.current) {
      trendingFetchedRef.current = true;
      fetchTrending();
    }
  }, [autoFetch, user, currentOrganization, fetchTrending]);

  // Reset fetch flag when org/brand changes
  useEffect(() => {
    trendingFetchedRef.current = false;
  }, [currentOrganization?.id, brandTemplateId]);

  // ============== SUGGESTIONS METHODS ==============
  const fetchSuggestions = useCallback(async (forceRefresh = false) => {
    if (!enabled) return;

    // OPTIMIZATION: Prevent duplicate parallel calls
    if (suggestIsFetchingRef.current && !forceRefresh) {
      console.log('[useTopicAI] Skipping duplicate fetch - already in progress');
      return;
    }

    // Cancel any pending request
    if (suggestAbortControllerRef.current) {
      suggestAbortControllerRef.current.abort();
    }
    suggestAbortControllerRef.current = new AbortController();

    suggestIsFetchingRef.current = true;
    setSuggestEnhancing(true);
    setSuggestError(null);
    setSuggestErrorCode(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('topic-ai', {
        body: {
          action: 'suggest',
          contentGoal,
          brandTemplateId,
          organizationId: currentOrganization?.id,
          format,
          enhanced: true,
          forceRefresh,
        },
      });

      if (functionError) {
        // Preserve context from FunctionsHttpError for structured error handling
        const wrappedErr: any = new Error(functionError.message);
        wrappedErr.context = (functionError as any).context;
        throw wrappedErr;
      }

      if (data?.suggestions && data.suggestions.length > 0) {
        const enhancedSuggestions: EnhancedTopicSuggestion[] = data.suggestions.map((s: any) => {
          if (typeof s === 'string') {
            return {
              topic: s,
              category: 'evergreen' as TopicCategory,
              formats: ['carousel', 'script', 'multichannel'] as TopicFormat[],
              estimatedEngagement: 'medium',
              reasoning: 'Gợi ý từ AI dựa trên brand context',
              relatedKeywords: [],
              scores: { brandFit: 70, trend: 60, competition: 65, engagement: 70 },
            };
          }
          return {
            ...s,
            scores: s.scores || { brandFit: 70, trend: 60, competition: 65, engagement: 70 },
          } as EnhancedTopicSuggestion;
        });

        setAllSuggestions(enhancedSuggestions);
        setSuggestSource(data.source);
      } else {
        setAllSuggestions([]);
        setSuggestSource('fallback');
      }

      if (data?.error) {
        setSuggestError(data.error);
      }
    } catch (err) {
      // Ignore abort errors
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('[useTopicAI] Request aborted');
        return;
      }
      handleSuggestApiError(err, 'Không thể tải gợi ý chủ đề');
      setAllSuggestions([]);
      setSuggestSource('fallback');
    } finally {
      suggestIsFetchingRef.current = false;
      setSuggestEnhancing(false);
    }
  }, [brandTemplateId, contentGoal, format, enabled, currentOrganization?.id]);

  // Auto-fetch suggestions with STALE-WHILE-REVALIDATE strategy
  // Keep old suggestions visible while fetching new ones
  useEffect(() => {
    const paramsKey = `${contentGoal}:${brandTemplateId || ''}:${format || ''}`;
    
    if (paramsKey !== suggestPrevParamsRef.current) {
      suggestHasLoadedRef.current = false;
      // SWR: Do NOT clear allSuggestions here — keep stale data visible
      // Only set loading if we have no data at all
      if (allSuggestions.length === 0) {
        setSuggestLoading(true);
      }
    }
    
    if (!enabled) return;

    // Skip if already loaded with same params
    if (paramsKey === suggestPrevParamsRef.current && suggestHasLoadedRef.current) return;
    
    suggestPrevParamsRef.current = paramsKey;

    // Reduced debounce from 2000ms to 800ms for faster feedback
    const timer = setTimeout(() => {
      fetchSuggestions().then(() => {
        suggestHasLoadedRef.current = true;
        setSuggestLoading(false);
      });
    }, 800);

    return () => clearTimeout(timer);
  }, [contentGoal, brandTemplateId, format, enabled, fetchSuggestions]);

  const refreshSuggestions = useCallback(() => {
    suggestPrevParamsRef.current = '';
    suggestHasLoadedRef.current = false;
    fetchSuggestions(true);
  }, [fetchSuggestions]);

  // Sort and filter suggestions
  const sortedSuggestions = useMemo(() => {
    let result = [...allSuggestions];

    if (minScore > 0) {
      result = result.filter((s) => {
        if (!s.scores) return false;
        const overall = Math.round((s.scores.brandFit + s.scores.trend + s.scores.competition + s.scores.engagement) / 4);
        return overall >= minScore;
      });
    }

    const sortByField = (field: keyof TopicScores) => (a: EnhancedTopicSuggestion, b: EnhancedTopicSuggestion): number => {
      const scoreA = a.scores?.[field] || 0;
      const scoreB = b.scores?.[field] || 0;
      return scoreB - scoreA;
    };

    const sortByOverall = (a: EnhancedTopicSuggestion, b: EnhancedTopicSuggestion): number => {
      const scoreA = a.scores ? Math.round((a.scores.brandFit + a.scores.trend + a.scores.competition + a.scores.engagement) / 4) : 0;
      const scoreB = b.scores ? Math.round((b.scores.brandFit + b.scores.trend + b.scores.competition + b.scores.engagement) / 4) : 0;
      return scoreB - scoreA;
    };

    switch (sortBy) {
      case 'brandFit':
        result.sort(sortByField('brandFit'));
        break;
      case 'trend':
        result.sort(sortByField('trend'));
        break;
      case 'engagement':
        result.sort(sortByField('engagement'));
        break;
      case 'competition':
        result.sort(sortByField('competition'));
        break;
      case 'overall':
      default:
        result.sort(sortByOverall);
        break;
    }

    return result;
  }, [allSuggestions, sortBy, minScore]);

  const filteredSuggestions = format
    ? sortedSuggestions.filter((s) =>
        (s.formats || []).some((f) => {
          const normalizedF = f.toLowerCase();
          const normalizedFormat = format.toLowerCase();
          return normalizedF.includes(normalizedFormat) || normalizedFormat.includes(normalizedF);
        })
      )
    : sortedSuggestions;

  const stats = useMemo(() => {
    const withScores = allSuggestions.filter((s) => s.scores);
    if (withScores.length === 0) return null;

    const overallScores = withScores.map((s) => 
      Math.round((s.scores!.brandFit + s.scores!.trend + s.scores!.competition + s.scores!.engagement) / 4)
    );
    const averageScore = Math.round(overallScores.reduce((a, b) => a + b, 0) / overallScores.length);
    const topPerformers = withScores.filter((s) => {
      const overall = Math.round((s.scores!.brandFit + s.scores!.trend + s.scores!.competition + s.scores!.engagement) / 4);
      return overall >= 75;
    });

    return {
      averageScore,
      topPerformersCount: topPerformers.length,
      totalCount: allSuggestions.length,
    };
  }, [allSuggestions]);

  const autoSaveSuggestions = useCallback(async (topics: EnhancedTopicSuggestion[]) => {
    if (!user || topics.length === 0) return;

    const newTopics = topics.filter(t => !autoSavedTopicsRef.current.has(t.topic));
    if (newTopics.length === 0) return;

    try {
      const topicTexts = newTopics.map(t => t.topic);
      const { data: existing } = await supabase
        .from('topic_history')
        .select('topic')
        .in('topic', topicTexts)
        .eq('organization_id', currentOrganization?.id || '')
        .limit(100);

      const existingSet = new Set((existing || []).map(e => e.topic));
      const toInsert = newTopics.filter(t => !existingSet.has(t.topic));

      if (toInsert.length === 0) {
        newTopics.forEach(t => autoSavedTopicsRef.current.add(t.topic));
        return;
      }

      const insertData = toInsert.map(topic => ({
        topic: topic.topic,
        category: topic.category,
        content_goal: contentGoal,
        format: format || 'multichannel',
        pillar: topic.pillar || null,
        scores: topic.scores || {},
        related_keywords: topic.relatedKeywords || [],
        reasoning: topic.reasoning || null,
        usage_status: 'draft',
        was_used: false,
        is_favorite: false,
        user_id: user.id,
        organization_id: currentOrganization?.id || null,
        brand_template_id: brandTemplateId || null,
      }));

      const { error: insertError } = await supabase
        .from('topic_history')
        .insert(insertData);

      if (!insertError) {
        toInsert.forEach(t => autoSavedTopicsRef.current.add(t.topic));
        setAutoSavedCount(prev => prev + toInsert.length);
        toast.success(`Đã lưu ${toInsert.length} ý tưởng vào Kho`, {
          description: 'Bạn có thể xem trong Kho Ý tưởng',
          duration: 3000,
        });
      }
    } catch (err) {
      console.error('Error auto-saving suggestions:', err);
    }
  }, [user, currentOrganization?.id, brandTemplateId, contentGoal, format]);

  const submitSuggestFeedback = useCallback(async (
    suggestion: EnhancedTopicSuggestion,
    feedback: 'positive' | 'negative'
  ) => {
    if (!user) return;

    try {
      const { data: existing } = await supabase
        .from('topic_history')
        .select('id')
        .eq('topic', suggestion.topic)
        .eq('organization_id', currentOrganization?.id || '')
        .single();

      if (existing) {
        await supabase
          .from('topic_history')
          .update({ feedback })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('topic_history')
          .insert({
            topic: suggestion.topic,
            category: suggestion.category,
            content_goal: contentGoal,
            format: format || 'multichannel',
            scores: suggestion.scores || {},
            reasoning: suggestion.reasoning || null,
            usage_status: 'suggested',
            was_used: false,
            is_favorite: false,
            feedback,
            user_id: user.id,
            organization_id: currentOrganization?.id || null,
            brand_template_id: brandTemplateId || null,
          });
      }
    } catch (err) {
      console.error('Error submitting feedback:', err);
    }
  }, [user, currentOrganization?.id, brandTemplateId, contentGoal, format]);

  const saveSuggestion = useCallback(async (suggestion: EnhancedTopicSuggestion): Promise<string | null> => {
    if (!user) return null;

    try {
      const { data, error: insertError } = await supabase
        .from('topic_history')
        .insert({
          topic: suggestion.topic,
          category: suggestion.category,
          content_goal: contentGoal,
          format: format || 'multichannel',
          pillar: suggestion.pillar || null,
          scores: suggestion.scores || {},
          related_keywords: suggestion.relatedKeywords || [],
          reasoning: suggestion.reasoning || null,
          usage_status: 'suggested',
          was_used: false,
          is_favorite: false,
          user_id: user.id,
          organization_id: currentOrganization?.id || null,
          brand_template_id: brandTemplateId || null,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      autoSavedTopicsRef.current.add(suggestion.topic);
      return data?.id;
    } catch (err) {
      console.error('Error saving suggestion:', err);
      return null;
    }
  }, [user, currentOrganization?.id, brandTemplateId, contentGoal, format]);

  // ============== AUDIENCE METHODS ==============
  const suggestAudience = useCallback(async (
    topic: string,
    goalOverride?: string
  ): Promise<SuggestAudienceResult | null> => {
    if (!topic || topic.trim().length < 5) {
      return null;
    }

    setAudienceLoading(true);
    setAudienceError(null);
    setAudienceErrorCode(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('topic-ai', {
        body: {
          action: 'suggest_audience',
          topic: topic.trim(),
          contentGoal: goalOverride || contentGoal,
          brandTemplateId,
          organizationId: currentOrganization?.id,
        },
      });

      if (fnError) throw fnError;

      if (data?.success) {
        const result: SuggestAudienceResult = {
          success: true,
          matchedPersonaId: data.matchedPersonaId || undefined,
          matchedPersonaName: data.matchedPersonaName || undefined,
          matchScore: data.matchScore || 0,
          suggestedAudience: data.suggestedAudience || '',
          reasoning: data.reasoning || '',
          keyCharacteristics: data.keyCharacteristics || [],
          alternativePersonaIds: data.alternativePersonaIds || [],
          alternativePersonaNames: data.alternativePersonaNames || [],
          matchMethod: data.matchMethod,
        };
        setAudienceResult(result);
        return result;
      } else {
        if (data?.errorCode) {
          handleAudienceApiError({ message: data.error, context: { body: JSON.stringify(data) } }, 'Không thể gợi ý audience');
          return null;
        }
        throw new Error(data?.error || 'Unknown error');
      }
    } catch (err: any) {
      handleAudienceApiError(err, 'Không thể gợi ý audience');
      return null;
    } finally {
      setAudienceLoading(false);
    }
  }, [brandTemplateId, contentGoal, currentOrganization?.id, handleIntelApiError]);

  const clearAudienceResult = useCallback(() => {
    setAudienceResult(null);
    setAudienceError(null);
    setAudienceErrorCode(null);
  }, []);

  // ============== RETURN CONSOLIDATED RESULT ==============
  return {
    refinement: {
      refinedTopics,
      contextUsed: refineContextUsed,
      elapsedMs: refineElapsedMs,
      isLoading: refineLoading,
      isTyping: refineTyping,
      error: refineError,
      refine,
      refresh: refreshRefinement,
    },
    intelligence: {
      gaps,
      clusters,
      keywords,
      refinement: intelRefinement,
      isLoading: intelLoading,
      error: intelError,
      errorCode: intelErrorCode,
      analyzeGaps,
      analyzeClusters,
      expandKeywords,
      refineTopic: refineTopicIntel,
      clearResults: clearIntelResults,
    },
    recommendations: {
      nextBest,
      weeklyPlan,
      conflicts,
      learnings,
      isLoading: recLoading,
      error: recError,
      errorCode: recErrorCode,
      getNextBestTopic,
      getWeeklyPlan,
      checkConflicts,
      submitFeedback: submitRecFeedback,
      clearResults: clearRecResults,
    },
    trending: {
      topics: trendingTopics,
      source: trendingSource,
      isLoading: trendingLoading,
      error: trendingError,
      errorCode: trendingErrorCode,
      fetch: fetchTrending,
      refresh: refreshTrending,
      clear: clearTrending,
    },
    suggestions: {
      suggestions: filteredSuggestions,
      allSuggestions: sortedSuggestions,
      source: suggestSource,
      isLoading: suggestLoading,
      isEnhancing: suggestEnhancing,
      error: suggestError,
      errorCode: suggestErrorCode,
      sortBy,
      setSortBy,
      minScore,
      setMinScore,
      stats,
      autoSavedCount,
      refresh: refreshSuggestions,
      autoSaveSuggestions,
      submitFeedback: submitSuggestFeedback,
      saveSuggestion,
    },
    audience: {
      result: audienceResult,
      isLoading: audienceLoading,
      error: audienceError,
      errorCode: audienceErrorCode,
      suggestAudience,
      clear: clearAudienceResult,
    },
  };
}
