import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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
  const { user } = useAuth();
  const [analysis, setAnalysis] = useState<AdjustmentAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

    setIsLoading(true);
    setError(null);

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
      setError(message);
      console.error('KPI adjustment check error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [campaign, campaignId, kpiLogs, enabled]);

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

  return {
    analysis,
    suggestions: analysis?.suggestions || [],
    needsAdjustment: analysis?.needsAdjustment || false,
    overallAssessment: analysis?.overallAssessment || '',
    actionItems: analysis?.actionItems || [],
    isLoading,
    error,
    lastChecked,
    checkNow: checkForAdjustments,
    dismissSuggestion,
    dismissAll,
  };
}
