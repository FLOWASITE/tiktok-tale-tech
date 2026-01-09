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
  enabled?: boolean;
}) {
  const { rawTopic, videoType, brandTemplateId, enabled = true } = options;
  const topicAI = useTopicAI({ brandTemplateId, enabled });

  // Auto-refine when rawTopic changes (avoid calling setState during render)
  const lastRefinedTopicRef = useRef<string>('');

  useEffect(() => {
    const next = rawTopic?.trim() ?? '';
    if (!enabled || next.length < 10) return;
    if (next === lastRefinedTopicRef.current) return;

    lastRefinedTopicRef.current = next;
    topicAI.refinement.refine(next, videoType);
  }, [rawTopic, enabled, videoType, topicAI.refinement]);

  return topicAI.refinement;
}
