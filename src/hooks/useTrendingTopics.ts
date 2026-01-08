/**
 * @deprecated Use `useTopicAI().trending` instead
 * This file is kept for backward compatibility
 */

import { useTopicAI } from './ai';

export type { AIErrorCode, TrendingTopic } from './ai/types';

export function useTrendingTopics(options: { brandTemplateId?: string; autoFetch?: boolean } = {}) {
  const topicAI = useTopicAI({ ...options, autoFetch: options.autoFetch });
  return {
    ...topicAI.trending,
    fetchTrendingTopics: topicAI.trending.fetch,
    clearTopics: topicAI.trending.clear,
  };
}
