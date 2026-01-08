/**
 * useKPIAI - Consolidated KPI AI Hook
 * 
 * Merges 2 KPI-related hooks into one with sub-modules:
 * - suggestions: AI-powered KPI suggestions for campaigns
 * - adjustments: KPI adjustment recommendations based on performance trends
 * 
 * @example
 * const kpiAI = useKPIAI({ campaignId, campaign, kpiLogs });
 * kpiAI.suggestions.fetchSuggestions({ campaignType, budget, ... });
 * kpiAI.adjustments.checkNow();
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useAIErrorHandler } from './useAIErrorHandler';
import type { CampaignType, CampaignMetric } from '@/types/campaign';

// ============== SUGGESTION TYPES ==============
export interface AISuggestion {
  metric: CampaignMetric;
  label: string;
  target: number;
  current: number;
  unit?: string;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  comparisonNote?: string;
  industryBenchmark?: number;
  historicalAvg?: number;
}

export interface AIKPISuggestionsResult {
  suggestions: AISuggestion[];
  analysis: string;
  recommendations: string[];
  metadata: {
    campaignType: string;
    budget: number;
    budgetRange: string;
    industry: string;
    seasonalContext: string;
    historicalCampaignsCount: number;
    benchmarks: {
      avgCPM: number;
      avgCPC: number;
      engagementRate: number;
      ctr: number;
    };
  };
  fromCache: boolean;
  cachedAt?: string;
}

export interface KPISuggestionsParams {
  campaignType: CampaignType;
  budget: number;
  budgetCurrency: string;
  startDate: string;
  endDate: string;
  targetChannels: string[];
  industries: string[] | null;
  organizationId: string;
}

// ============== ADJUSTMENT TYPES ==============
export interface AdjustmentSuggestion {
  metric: string;
  currentTarget: number;
  currentValue: number;
  suggestedTarget: number;
  changePercent: number;
  reason: string;
  trigger: 'overperforming' | 'underperforming' | 'anomaly' | 'on_track';
  confidence: 'high' | 'medium' | 'low';
  priority: 'urgent' | 'recommended' | 'optional';
  projectedEndValue: number;
  achievementRate: number;
  riskNote?: string;
}

export interface AdjustmentAnalysis {
  needsAdjustment: boolean;
  overallAssessment: string;
  suggestions: AdjustmentSuggestion[];
  actionItems: string[];
  analyzedAt: string;
}

export interface CampaignGoal {
  metric: string;
  target: number;
  current: number;
}

export interface KPILog {
  logged_at: string;
  metrics: Record<string, number>;
}

export interface Campaign {
  id: string;
  name: string;
  organization_id: string;
  campaign_type: string;
  start_date: string;
  end_date: string;
  goals?: CampaignGoal[] | null;
}

// ============== OPTIONS INTERFACE ==============
export interface UseKPIAIOptions {
  campaignId?: string;
  campaign?: Campaign | null;
  kpiLogs?: KPILog[];
  enabled?: boolean;
  autoCheck?: boolean;
}

// ============== HOOK IMPLEMENTATION ==============
export function useKPIAI(options: UseKPIAIOptions = {}) {
  const { 
    campaignId = '', 
    campaign = null, 
    kpiLogs = [], 
    enabled = true, 
    autoCheck = false 
  } = options;
  
  const { user } = useAuth();
  const { handleApiError } = useAIErrorHandler();

  // ============== SUGGESTIONS MODULE ==============
  const [suggestionsResult, setSuggestionsResult] = useState<AIKPISuggestionsResult | null>(null);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);

  const fetchSuggestions = useCallback(async (params: KPISuggestionsParams): Promise<AIKPISuggestionsResult | null> => {
    setSuggestionsLoading(true);
    setSuggestionsError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('suggest-campaign-kpis', {
        body: {
          campaignType: params.campaignType,
          budget: params.budget,
          budgetCurrency: params.budgetCurrency,
          startDate: params.startDate,
          endDate: params.endDate,
          targetChannels: params.targetChannels,
          industries: params.industries || [],
          organizationId: params.organizationId,
        },
      });

      if (functionError) {
        throw new Error(functionError.message);
      }

      if (data.error) {
        if (data.error.includes('Rate limits')) {
          toast.error('Đã vượt giới hạn, vui lòng thử lại sau');
        } else if (data.error.includes('Payment required')) {
          toast.error('Cần nạp thêm credits để sử dụng AI');
        }
        throw new Error(data.error);
      }

      setSuggestionsResult(data as AIKPISuggestionsResult);
      return data as AIKPISuggestionsResult;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Không thể tải gợi ý AI';
      setSuggestionsError(errorMessage);
      handleApiError(err, errorMessage);
      return null;
    } finally {
      setSuggestionsLoading(false);
    }
  }, [handleApiError]);

  const resetSuggestions = useCallback(() => {
    setSuggestionsResult(null);
    setSuggestionsError(null);
  }, []);

  // ============== ADJUSTMENTS MODULE ==============
  const [analysis, setAnalysis] = useState<AdjustmentAnalysis | null>(null);
  const [adjustmentsLoading, setAdjustmentsLoading] = useState(false);
  const [adjustmentsError, setAdjustmentsError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkForAdjustments = useCallback(async () => {
    if (!campaign || !enabled) return;

    // Need at least 2 KPI logs to analyze trends
    if (!kpiLogs || kpiLogs.length < 2) {
      setAnalysis({
        needsAdjustment: false,
        overallAssessment: 'Cần ít nhất 2 lần log KPI để phân tích trend.',
        suggestions: [],
        actionItems: [],
        analyzedAt: new Date().toISOString(),
      });
      return;
    }

    // Check if campaign is active
    const now = new Date();
    const startDate = new Date(campaign.start_date);
    const endDate = new Date(campaign.end_date);
    
    if (now < startDate || now > endDate) {
      setAnalysis({
        needsAdjustment: false,
        overallAssessment: 'Campaign chưa bắt đầu hoặc đã kết thúc.',
        suggestions: [],
        actionItems: [],
        analyzedAt: new Date().toISOString(),
      });
      return;
    }

    setAdjustmentsLoading(true);
    setAdjustmentsError(null);

    try {
      const goals = campaign.goals as CampaignGoal[] | null;
      
      if (!goals || goals.length === 0) {
        setAnalysis({
          needsAdjustment: false,
          overallAssessment: 'Chưa có KPI goals nào được thiết lập.',
          suggestions: [],
          actionItems: [],
          analyzedAt: new Date().toISOString(),
        });
        return;
      }

      const { data, error: fnError } = await supabase.functions.invoke('suggest-kpi-adjustments', {
        body: {
          campaignId,
          organizationId: campaign.organization_id,
          currentGoals: goals,
          kpiLogs,
          startDate: campaign.start_date,
          endDate: campaign.end_date,
          campaignType: campaign.campaign_type,
          campaignName: campaign.name,
        },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setAnalysis(data as AdjustmentAnalysis);
      setLastChecked(new Date());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không thể phân tích KPI';
      setAdjustmentsError(message);
      handleApiError(err, message);
    } finally {
      setAdjustmentsLoading(false);
    }
  }, [campaign, campaignId, kpiLogs, enabled, handleApiError]);

  // Auto-check on mount or when kpiLogs change significantly
  useEffect(() => {
    if (autoCheck && campaign && kpiLogs.length >= 2 && !lastChecked) {
      checkForAdjustments();
    }
  }, [autoCheck, campaign, kpiLogs.length, lastChecked, checkForAdjustments]);

  const dismissSuggestion = useCallback(async (metric: string, hours: number = 24) => {
    if (!user) return;

    try {
      const dismissedUntil = new Date();
      dismissedUntil.setHours(dismissedUntil.getHours() + hours);

      const { error: insertError } = await supabase
        .from('kpi_adjustment_dismissals')
        .upsert({
          campaign_id: campaignId,
          metric,
          dismissed_until: dismissedUntil.toISOString(),
          user_id: user.id,
        }, {
          onConflict: 'campaign_id,metric',
        });

      if (insertError) throw insertError;

      // Remove from current suggestions
      if (analysis) {
        setAnalysis({
          ...analysis,
          suggestions: analysis.suggestions.filter((s) => s.metric !== metric),
          needsAdjustment: analysis.suggestions.filter((s) => s.metric !== metric).length > 0,
        });
      }

      toast.success(`Đã ẩn đề xuất cho ${metric} trong ${hours} giờ`);
    } catch (err) {
      console.error('Failed to dismiss suggestion:', err);
      toast.error('Không thể ẩn đề xuất');
    }
  }, [user, campaignId, analysis]);

  const dismissAll = useCallback(async (hours: number = 24) => {
    if (!analysis || !user) return;

    try {
      const dismissedUntil = new Date();
      dismissedUntil.setHours(dismissedUntil.getHours() + hours);

      const dismissals = analysis.suggestions.map((s) => ({
        campaign_id: campaignId,
        metric: s.metric,
        dismissed_until: dismissedUntil.toISOString(),
        user_id: user.id,
      }));

      for (const dismissal of dismissals) {
        await supabase
          .from('kpi_adjustment_dismissals')
          .upsert(dismissal, { onConflict: 'campaign_id,metric' });
      }

      setAnalysis({
        ...analysis,
        suggestions: [],
        needsAdjustment: false,
      });

      toast.success(`Đã ẩn tất cả đề xuất trong ${hours} giờ`);
    } catch (err) {
      console.error('Failed to dismiss all suggestions:', err);
      toast.error('Không thể ẩn đề xuất');
    }
  }, [analysis, user, campaignId]);

  // ============== RETURN ==============
  return {
    // Suggestions module
    suggestions: {
      result: suggestionsResult,
      isLoading: suggestionsLoading,
      error: suggestionsError,
      fetchSuggestions,
      reset: resetSuggestions,
    },

    // Adjustments module
    adjustments: {
      analysis,
      suggestions: analysis?.suggestions || [],
      needsAdjustment: analysis?.needsAdjustment || false,
      overallAssessment: analysis?.overallAssessment || '',
      actionItems: analysis?.actionItems || [],
      isLoading: adjustmentsLoading,
      error: adjustmentsError,
      lastChecked,
      checkNow: checkForAdjustments,
      dismissSuggestion,
      dismissAll,
    },
  };
}

// ============== TYPE EXPORTS ==============
export interface UseKPIAIResult {
  suggestions: {
    result: AIKPISuggestionsResult | null;
    isLoading: boolean;
    error: string | null;
    fetchSuggestions: (params: KPISuggestionsParams) => Promise<AIKPISuggestionsResult | null>;
    reset: () => void;
  };
  adjustments: {
    analysis: AdjustmentAnalysis | null;
    suggestions: AdjustmentSuggestion[];
    needsAdjustment: boolean;
    overallAssessment: string;
    actionItems: string[];
    isLoading: boolean;
    error: string | null;
    lastChecked: Date | null;
    checkNow: () => Promise<void>;
    dismissSuggestion: (metric: string, hours?: number) => Promise<void>;
    dismissAll: (hours?: number) => Promise<void>;
  };
}
