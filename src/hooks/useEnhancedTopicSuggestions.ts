/**
 * @deprecated Use `useTopicAI().suggestions` instead
 * This file is kept for backward compatibility
 */

import { useTopicAI } from './ai';
import { ContentGoal } from '@/types/multichannel';
import type { TopicFormat } from './ai/types';

export type { EnhancedTopicSuggestion, TopicScores, TopicCategory, TopicFormat, SortOption } from './ai/types';

export function useEnhancedTopicSuggestions(options: {
  brandTemplateId?: string;
  contentGoal: ContentGoal;
  format?: TopicFormat;
  enabled?: boolean;
}) {
  const topicAI = useTopicAI(options);
  return topicAI.suggestions;
}
