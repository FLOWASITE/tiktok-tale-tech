import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { ContentGoal } from '@/types/multichannel';
import { toast } from 'sonner';

export interface NextBestTopic {
  topic: string;
  reason: string;
  confidence: number;
  pillar: string;
  suggestedFormat: string;
  timing: string;
}

export interface WeeklyPlanItem {
  day: string;
  topic: string;
  pillar: string;
  format: string;
  reason: string;
  priority: number;
}

export interface WeeklyPlan {
  weeklyPlan: WeeklyPlanItem[];
  weekTheme: string;
  insights: string;
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

  const getNextBestTopic = useCallback(async () => {
    if (!user) return null;

    setIsLoading(true);
    setError(null);

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
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err: any) {
      console.error('Next best topic error:', err);
      setError(err.message);
      toast.error('Không thể lấy đề xuất topic');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user, brandTemplateId, contentGoal, currentOrganization?.id]);

  const getWeeklyPlan = useCallback(async () => {
    if (!user) return null;

    setIsLoading(true);
    setError(null);

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
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err: any) {
      console.error('Weekly plan error:', err);
      setError(err.message);
      toast.error('Không thể tạo kế hoạch tuần');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user, brandTemplateId, contentGoal, currentOrganization?.id]);

  const checkConflicts = useCallback(async (topics: string[]) => {
    if (!user || topics.length === 0) return null;

    setIsLoading(true);
    setError(null);

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
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err: any) {
      console.error('Conflict check error:', err);
      setError(err.message);
      toast.error('Không thể kiểm tra xung đột');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user, brandTemplateId, contentGoal, currentOrganization?.id]);

  const submitFeedback = useCallback(async (
    topicId: string,
    feedback: 'positive' | 'negative',
    reason?: string
  ) => {
    if (!user) return null;

    setIsLoading(true);
    setError(null);

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
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err: any) {
      console.error('Feedback submission error:', err);
      setError(err.message);
      toast.error('Không thể gửi feedback');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user, brandTemplateId, contentGoal, currentOrganization?.id]);

  const clearResults = useCallback(() => {
    setNextBest(null);
    setWeeklyPlan(null);
    setConflicts(null);
    setLearnings(null);
    setError(null);
  }, []);

  return {
    isLoading,
    error,
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
