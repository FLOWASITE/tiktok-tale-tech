/**
 * @deprecated Use `useTopicAI().intelligence` instead
 * This file is kept for backward compatibility
 */

import { useTopicAI } from './ai';
import { ContentGoal } from '@/types/multichannel';

export type { 
  AIErrorCode, TopicGap, TopicCluster, KeywordExpansion, 
  TopicRefinementIntel as TopicRefinement, GapAnalysisResult, ClusterAnalysisResult 
} from './ai/types';

export function useTopicIntelligence(options: { brandTemplateId?: string; contentGoal?: ContentGoal } = {}) {
  const topicAI = useTopicAI(options);
  return topicAI.intelligence;
}
