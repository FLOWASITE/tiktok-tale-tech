import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTopicHistory } from './useTopicHistory';
import { toast } from 'sonner';

interface UseTopicPerformanceTrackingOptions {
  contentId?: string;
  contentType?: 'carousel' | 'script' | 'multichannel';
  enabled?: boolean;
}

export function useTopicPerformanceTracking(options: UseTopicPerformanceTrackingOptions = {}) {
  const { contentId, contentType = 'multichannel', enabled = true } = options;
  const { markAsPublished, updatePerformance, markAsUsed } = useTopicHistory({ enabled });

  // Find topic history by content ID
  const findTopicByContentId = useCallback(async (cId: string) => {
    try {
      const { data, error } = await supabase
        .from('topic_history')
        .select('id, topic, performance_score')
        .eq('content_id', cId)
        .single();

      if (error) return null;
      return data;
    } catch {
      return null;
    }
  }, []);

  // Link content to topic history (called when content is created from topic)
  const linkContentToTopic = useCallback(async (
    topicId: string,
    createdContentId: string,
    type: 'carousel' | 'script' | 'multichannel'
  ) => {
    await markAsUsed(topicId, createdContentId, type);
  }, [markAsUsed]);

  // Called when content is published
  const onContentPublished = useCallback(async (cId: string) => {
    const topic = await findTopicByContentId(cId);
    if (topic) {
      await markAsPublished(topic.id);
      toast.success('Đã cập nhật trạng thái topic');
    }
  }, [findTopicByContentId, markAsPublished]);

  // Update performance score for content's topic
  const updateTopicPerformance = useCallback(async (
    cId: string,
    score: number,
    engagement?: {
      likes?: number;
      comments?: number;
      shares?: number;
      views?: number;
    }
  ) => {
    const topic = await findTopicByContentId(cId);
    if (topic) {
      await updatePerformance(topic.id, score, engagement);
      toast.success(`Đã cập nhật điểm hiệu suất: ${score}`);
      return true;
    }
    return false;
  }, [findTopicByContentId, updatePerformance]);

  // Calculate performance score from engagement metrics
  const calculatePerformanceScore = useCallback((engagement: {
    likes?: number;
    comments?: number;
    shares?: number;
    views?: number;
    expectedEngagementRate?: number;
  }) => {
    const { likes = 0, comments = 0, shares = 0, views = 0, expectedEngagementRate = 0.03 } = engagement;
    
    if (views === 0) return null;

    // Calculate engagement rate
    const totalEngagement = likes + comments * 2 + shares * 3; // Weighted engagement
    const engagementRate = totalEngagement / views;

    // Score based on how well it performs vs expected
    const performanceRatio = engagementRate / expectedEngagementRate;

    // Scale to 0-100
    let score = Math.min(100, Math.round(performanceRatio * 50 + 25));

    // Bonus for high absolute numbers
    if (views >= 10000) score = Math.min(100, score + 5);
    if (likes >= 500) score = Math.min(100, score + 5);
    if (comments >= 100) score = Math.min(100, score + 5);
    if (shares >= 50) score = Math.min(100, score + 5);

    return score;
  }, []);

  return {
    linkContentToTopic,
    onContentPublished,
    updateTopicPerformance,
    calculatePerformanceScore,
    findTopicByContentId,
  };
}
