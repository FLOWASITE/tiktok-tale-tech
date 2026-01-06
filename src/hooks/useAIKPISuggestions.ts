import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { CampaignType, CampaignMetric } from '@/types/campaign';

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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AIKPISuggestionsResult | null>(null);

  const fetchSuggestions = useCallback(async (params: UseAIKPISuggestionsParams) => {
    setIsLoading(true);
    setError(null);

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

      setResult(data as AIKPISuggestionsResult);
      return data as AIKPISuggestionsResult;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Không thể tải gợi ý AI';
      setError(errorMessage);
      console.error('AI KPI suggestions error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    fetchSuggestions,
    reset,
    isLoading,
    error,
    result,
  };
}
