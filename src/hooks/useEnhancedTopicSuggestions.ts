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
  const suggestionsModule = topicAI.suggestions;
  
  // Return individual properties for backward compatibility
  // `suggestions` should be the array, not the module object
  return {
    suggestions: suggestionsModule.suggestions || [],
    allSuggestions: suggestionsModule.allSuggestions || [],
    source: suggestionsModule.source,
    isLoading: suggestionsModule.isLoading,
    isEnhancing: suggestionsModule.isEnhancing,
    error: suggestionsModule.error,
    errorCode: suggestionsModule.errorCode,
    sortBy: suggestionsModule.sortBy,
    setSortBy: suggestionsModule.setSortBy,
    minScore: suggestionsModule.minScore,
    setMinScore: suggestionsModule.setMinScore,
    stats: suggestionsModule.stats,
    autoSavedCount: suggestionsModule.autoSavedCount,
    refresh: suggestionsModule.refresh as (categoryHint?: string) => void,
    autoSaveSuggestions: suggestionsModule.autoSaveSuggestions,
    submitFeedback: suggestionsModule.submitFeedback,
    saveSuggestion: suggestionsModule.saveSuggestion,
  };
}
