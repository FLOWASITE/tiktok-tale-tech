import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LearningStats {
  totalFeedback: number;
  positiveFeedback: number;
  negativeFeedback: number;
  feedbackRate: number;
  topPositivePatterns: string[];
  topNegativePatterns: string[];
  personalizationLevel: number;
  learningProgress: {
    dataPoints: number;
    categories: Record<string, number>;
    pillars: Record<string, number>;
  };
}

interface FeedbackResponse {
  success: boolean;
  updatedTopic: {
    id: string;
    topic: string;
    feedback: 'positive' | 'negative';
    feedbackNote?: string;
  };
  learningStats: LearningStats;
}

interface UseTopicFeedbackOptions {
  brandTemplateId?: string;
  contentGoal?: string;
  onSuccess?: (stats: LearningStats) => void;
}

export function useTopicFeedback(options: UseTopicFeedbackOptions = {}) {
  const { brandTemplateId, contentGoal, onSuccess } = options;
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [learningStats, setLearningStats] = useState<LearningStats | null>(null);

  const submitFeedback = useCallback(async (
    topicHistoryId: string,
    feedback: 'positive' | 'negative',
    feedbackNote?: string
  ): Promise<boolean> => {
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('learn-from-feedback', {
        body: {
          topicHistoryId,
          feedback,
          feedbackNote,
          brandTemplateId,
          contentGoal,
        },
      });

      if (error) {
        console.error('Error submitting feedback:', error);
        toast.error('Không thể gửi phản hồi');
        return false;
      }

      const response = data as FeedbackResponse;

      if (response.success) {
        setLearningStats(response.learningStats);
        
        toast.success(
          feedback === 'positive' 
            ? 'Cảm ơn! AI sẽ gợi ý nhiều chủ đề tương tự hơn' 
            : 'Đã ghi nhận! AI sẽ điều chỉnh gợi ý phù hợp hơn'
        );

        onSuccess?.(response.learningStats);
        return true;
      }

      return false;
    } catch (err) {
      console.error('Error in submitFeedback:', err);
      toast.error('Đã xảy ra lỗi khi gửi phản hồi');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [brandTemplateId, contentGoal, onSuccess]);

  const submitPositiveFeedback = useCallback(
    (topicHistoryId: string, note?: string) => submitFeedback(topicHistoryId, 'positive', note),
    [submitFeedback]
  );

  const submitNegativeFeedback = useCallback(
    (topicHistoryId: string, note?: string) => submitFeedback(topicHistoryId, 'negative', note),
    [submitFeedback]
  );

  return {
    submitFeedback,
    submitPositiveFeedback,
    submitNegativeFeedback,
    isSubmitting,
    learningStats,
  };
}
