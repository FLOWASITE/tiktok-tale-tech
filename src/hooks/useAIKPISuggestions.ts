/**
 * @deprecated Use useKPIAI().suggestions instead
 * This hook is kept for backward compatibility and will be removed in a future version.
 * 
 * @example
 * // Old way (deprecated)
 * const { fetchSuggestions, result } = useAIKPISuggestions();
 * 
 * // New way
 * const { suggestions } = useKPIAI();
 * suggestions.fetchSuggestions(params), suggestions.result
 */

import { useKPIAI } from './ai/useKPIAI';
import type { CampaignType } from '@/types/campaign';

// Re-export types for backward compatibility
export type { AISuggestion, AIKPISuggestionsResult } from './ai/useKPIAI';

interface UseAIKPISuggestionsParams {
  campaignType: CampaignType;
  budget: number;
  budgetCurrency: string;
  startDate: string;
  endDate: string;
  targetChannels: string[];
  industries: string[] | null;
  organizationId: string;
}

export function useAIKPISuggestions() {
  const { suggestions } = useKPIAI();

  return {
    fetchSuggestions: suggestions.fetchSuggestions,
    reset: suggestions.reset,
    isLoading: suggestions.isLoading,
    error: suggestions.error,
    result: suggestions.result,
  };
}
