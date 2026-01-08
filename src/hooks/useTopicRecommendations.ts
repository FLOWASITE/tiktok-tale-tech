/**
 * @deprecated Use `useTopicAI().recommendations` instead
 * This file is kept for backward compatibility
 */

import { useTopicAI } from './ai';
import { ContentGoal } from '@/types/multichannel';

export type { 
  AIErrorCode, TrendingMatch, NextBestTopic, WeeklyPlan, WeeklyPlanItem, 
  TopicConflict, ConflictCheckResult, LearningResult 
} from './ai/types';

export function useTopicRecommendations(options: { brandTemplateId?: string; contentGoal?: ContentGoal } = {}) {
  const topicAI = useTopicAI(options);
  return topicAI.recommendations;
}
