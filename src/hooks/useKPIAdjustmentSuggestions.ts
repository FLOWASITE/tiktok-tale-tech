/**
 * @deprecated Use useKPIAI().adjustments instead
 * This hook is kept for backward compatibility and will be removed in a future version.
 * 
 * @example
 * // Old way (deprecated)
 * const { analysis, checkNow, dismissSuggestion } = useKPIAdjustmentSuggestions({ campaignId, campaign, kpiLogs });
 * 
 * // New way
 * const { adjustments } = useKPIAI({ campaignId, campaign, kpiLogs });
 * adjustments.analysis, adjustments.checkNow, adjustments.dismissSuggestion
 */

import { useKPIAI } from './ai/useKPIAI';

// Re-export types for backward compatibility
export type { 
  AdjustmentSuggestion, 
  AdjustmentAnalysis, 
  CampaignGoal as CampaignGoalType,
  KPILog as KPILogType,
  Campaign as CampaignType,
} from './ai/useKPIAI';

interface CampaignGoal {
  metric: string;
  target: number;
  current: number;
}

interface KPILog {
  logged_at: string;
  metrics: Record<string, number>;
}

interface Campaign {
  id: string;
  name: string;
  organization_id: string;
  campaign_type: string;
  start_date: string;
  end_date: string;
  goals?: CampaignGoal[] | null;
}

interface UseKPIAdjustmentOptions {
  campaignId: string;
  campaign: Campaign | null;
  kpiLogs: KPILog[];
  enabled?: boolean;
  autoCheck?: boolean;
}

export function useKPIAdjustmentSuggestions({
  campaignId,
  campaign,
  kpiLogs,
  enabled = true,
  autoCheck = false,
}: UseKPIAdjustmentOptions) {
  const { adjustments } = useKPIAI({ 
    campaignId, 
    campaign, 
    kpiLogs, 
    enabled, 
    autoCheck 
  });

  return {
    analysis: adjustments.analysis,
    suggestions: adjustments.suggestions,
    needsAdjustment: adjustments.needsAdjustment,
    overallAssessment: adjustments.overallAssessment,
    actionItems: adjustments.actionItems,
    isLoading: adjustments.isLoading,
    error: adjustments.error,
    lastChecked: adjustments.lastChecked,
    checkNow: adjustments.checkNow,
    dismissSuggestion: adjustments.dismissSuggestion,
    dismissAll: adjustments.dismissAll,
  };
}
