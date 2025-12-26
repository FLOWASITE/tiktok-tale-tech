import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { ContentGoal } from '@/types/multichannel';
import { toast } from 'sonner';

export interface TrendingMatch {
  topic: string;
  velocityScore: number;
  source: 'web_search' | 'curated_event' | 'curated_news';
}

export interface NextBestTopic {
  topic: string;
  reason: string;
  confidence: number;
  pillar: string;
  suggestedFormat: string;
  timing: string;
  trendingMatch?: TrendingMatch | null;
}

export interface WeeklyPlanItem {
  day: string;
  topic: string;
  pillar: string;
  format: string;
  reason: string;
  priority: number;
  isTrendingBased?: boolean;
  trendingSource?: string | null;
}

export interface WeeklyPlan {
  weeklyPlan: WeeklyPlanItem[];
  weekTheme: string;
  insights: string;
  trendingTopicsUsed?: number;
}

export interface TopicConflict {
  topics: string[];
  type: 'duplicate' | 'contradiction' | 'cannibalization' | 'timing';
  severity: 'high' | 'medium' | 'low';
  explanation: string;
  resolution: string;
}

export interface ConflictCheckResult {
  conflicts: TopicConflict[];
  summary: string;
}

export interface LearningResult {
  learnings: string[];
  adjustments: {
    preferMore: string[];
    preferLess: string[];
    avoidPatterns: string[];
  };
  confidenceBoost: number;
}

interface UseTopicRecommendationsOptions {
  brandTemplateId?: string;
  contentGoal?: ContentGoal;
}

// Error code type for specific error handling
export type AIErrorCode = 'CREDITS_EXHAUSTED' | 'RATE_LIMIT' | 'UNKNOWN';

export function useTopicRecommendations(options: UseTopicRecommendationsOptions = {}) {
  const { brandTemplateId, contentGoal } = options;
  const { user } = useAuth();
  const { currentOrganization } = useOrganizationContext();

  const [isLoading, setIsLoading] = useState(false);
  const [nextBest, setNextBest] = useState<NextBestTopic | null>(null);
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(null);
  const [conflicts, setConflicts] = useState<ConflictCheckResult | null>(null);
  const [learnings, setLearnings] = useState<LearningResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<AIErrorCode | null>(null);

  // Helper to handle API errors consistently
  const handleApiError = useCallback((err: any, fallbackMessage: string) => {
    console.error(fallbackMessage, err);
    
    // Check for specific error codes from edge function
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
    
    // Check error message for 402/429 patterns
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
    
    setError(errMessage || fallbackMessage);
    setErrorCode('UNKNOWN');
    toast.error(fallbackMessage);
  }, []);

  const getNextBestTopic = useCallback(async () => {
    if (!user) return null;

    setIsLoading(true);
    setError(null);
    setErrorCode(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('recommend-topics', {
        body: {
          brandTemplateId,
          contentGoal,
          organizationId: currentOrganization?.id,
          recommendationType: 'next_best',
        },
      });

      if (fnError) throw fnError;

      if (data.success && data.result) {
        setNextBest(data.result as NextBestTopic);
        return data.result as NextBestTopic;
      } else {
        // Check for error codes in response
        if (data.errorCode) {
          handleApiError({ message: data.error, context: { body: JSON.stringify(data) } }, 'Không thể lấy đề xuất topic');
          return null;
        }
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err: any) {
      handleApiError(err, 'Không thể lấy đề xuất topic');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user, brandTemplateId, contentGoal, currentOrganization?.id, handleApiError]);

  const getWeeklyPlan = useCallback(async () => {
    if (!user) return null;

    setIsLoading(true);
    setError(null);
    setErrorCode(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('recommend-topics', {
        body: {
          brandTemplateId,
          contentGoal,
          organizationId: currentOrganization?.id,
          recommendationType: 'weekly',
        },
      });

      if (fnError) throw fnError;

      if (data.success && data.result) {
        setWeeklyPlan(data.result as WeeklyPlan);
        return data.result as WeeklyPlan;
      } else {
        if (data.errorCode) {
          handleApiError({ message: data.error, context: { body: JSON.stringify(data) } }, 'Không thể tạo kế hoạch tuần');
          return null;
        }
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err: any) {
      handleApiError(err, 'Không thể tạo kế hoạch tuần');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user, brandTemplateId, contentGoal, currentOrganization?.id, handleApiError]);

  const checkConflicts = useCallback(async (topics: string[]) => {
    if (!user || topics.length === 0) return null;

    setIsLoading(true);
    setError(null);
    setErrorCode(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('recommend-topics', {
        body: {
          brandTemplateId,
          contentGoal,
          organizationId: currentOrganization?.id,
          recommendationType: 'conflict_check',
          topics,
        },
      });

      if (fnError) throw fnError;

      if (data.success && data.result) {
        setConflicts(data.result as ConflictCheckResult);
        return data.result as ConflictCheckResult;
      } else {
        if (data.errorCode) {
          handleApiError({ message: data.error, context: { body: JSON.stringify(data) } }, 'Không thể kiểm tra xung đột');
          return null;
        }
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err: any) {
      handleApiError(err, 'Không thể kiểm tra xung đột');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user, brandTemplateId, contentGoal, currentOrganization?.id, handleApiError]);

  const submitFeedback = useCallback(async (
    topicId: string,
    feedback: 'positive' | 'negative',
    reason?: string
  ) => {
    if (!user) return null;

    setIsLoading(true);
    setError(null);
    setErrorCode(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('recommend-topics', {
        body: {
          brandTemplateId,
          contentGoal,
          organizationId: currentOrganization?.id,
          recommendationType: 'learning_feedback',
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
          handleApiError({ message: data.error, context: { body: JSON.stringify(data) } }, 'Không thể gửi feedback');
          return null;
        }
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err: any) {
      handleApiError(err, 'Không thể gửi feedback');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user, brandTemplateId, contentGoal, currentOrganization?.id, handleApiError]);

  const clearResults = useCallback(() => {
    setNextBest(null);
    setWeeklyPlan(null);
    setConflicts(null);
    setLearnings(null);
    setError(null);
    setErrorCode(null);
  }, []);

  return {
    isLoading,
    error,
    errorCode,
    // Next Best Topic
    nextBest,
    getNextBestTopic,
    // Weekly Plan
    weeklyPlan,
    getWeeklyPlan,
    // Conflict Detection
    conflicts,
    checkConflicts,
    // Learning Feedback
    learnings,
    submitFeedback,
    // Utils
    clearResults,
  };
}
