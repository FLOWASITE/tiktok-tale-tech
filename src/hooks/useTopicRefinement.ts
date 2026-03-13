/**
 * @deprecated Use `useTopicAI().refinement` instead
 * This file is kept for backward compatibility
 */

import { useEffect, useRef } from 'react';
import { useTopicAI } from './ai';

export type { RefinedTopic, RefineContextUsed } from './ai/types';

export function useTopicRefinement(options: {
  rawTopic: string;
  videoType?: string;
  brandTemplateId?: string;
  contentGoal?: string;
  enabled?: boolean;
}) {
  const { rawTopic, videoType, brandTemplateId, contentGoal, enabled = true } = options;
  const topicAI = useTopicAI({ brandTemplateId, contentGoal, enabled });

  // Use refs to avoid stale closures and dependency issues
  const lastRefinedTopicRef = useRef<string>('');
  const refineRef = useRef(topicAI.refinement.refine);
  
  // Keep refine function ref updated
  refineRef.current = topicAI.refinement.refine;

  useEffect(() => {
    const next = rawTopic?.trim() ?? '';
    if (!enabled || next.length < 10) return;
    if (next === lastRefinedTopicRef.current) return;

    lastRefinedTopicRef.current = next;
    // Use ref to call the latest refine function without it being a dependency
    refineRef.current(next, videoType);
  }, [rawTopic, enabled, videoType]);

  return topicAI.refinement;
}
