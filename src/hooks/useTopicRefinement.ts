/**
 * @deprecated Use `useTopicAI().refinement` instead
 * This file is kept for backward compatibility
 */

import { useTopicAI } from './ai';

export type { RefinedTopic, RefineContextUsed } from './ai/types';

export function useTopicRefinement(options: {
  rawTopic: string;
  videoType?: string;
  brandTemplateId?: string;
  enabled?: boolean;
}) {
  const { rawTopic, videoType, brandTemplateId, enabled = true } = options;
  const topicAI = useTopicAI({ brandTemplateId, enabled });

  // Auto-refine when rawTopic changes
  if (rawTopic && enabled && rawTopic.trim().length >= 10) {
    topicAI.refinement.refine(rawTopic, videoType);
  }

  return topicAI.refinement;
}
