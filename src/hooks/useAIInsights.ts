import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

export interface AIInsight {
  id: string;
  adCopyId: string | null;
  insightType: 'trend' | 'anomaly' | 'recommendation' | 'forecast';
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'success' | 'critical';
  metricsContext: Record<string, any>;
  suggestedAction: string | null;
  actionImpactEstimate: number | null;
  validFrom: string;
  validUntil: string | null;
  isDismissed: boolean;
  createdAt: string;
}

export function useAIInsights() {
  const { currentOrganization } = useOrganizationContext();
  const queryClient = useQueryClient();

  const { data: insights, isLoading } = useQuery({
    queryKey: ['ai-insights', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];

      const { data, error } = await supabase
        .from('ad_copy_ai_insights')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .eq('is_dismissed', false)
        .or(`valid_until.is.null,valid_until.gt.${new Date().toISOString()}`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      return (data || []).map((i) => ({
        id: i.id,
        adCopyId: i.ad_copy_id,
        insightType: i.insight_type as AIInsight['insightType'],
        title: i.title,
        description: i.description,
        severity: i.severity as AIInsight['severity'],
        metricsContext: (i.metrics_context as Record<string, any>) || {},
        suggestedAction: i.suggested_action,
        actionImpactEstimate: i.action_impact_estimate,
        validFrom: i.valid_from || '',
        validUntil: i.valid_until,
        isDismissed: i.is_dismissed || false,
        createdAt: i.created_at || '',
      })) as AIInsight[];
    },
    enabled: !!currentOrganization?.id,
  });

  const dismissInsightMutation = useMutation({
    mutationFn: async (insightId: string) => {
      const { error } = await supabase
        .from('ad_copy_ai_insights')
        .update({ is_dismissed: true })
        .eq('id', insightId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-insights'] });
    },
    onError: (error) => {
      toast.error('Không thể ẩn insight: ' + (error as Error).message);
    },
  });

  const generateInsightsMutation = useMutation({
    mutationFn: async () => {
      if (!currentOrganization?.id) throw new Error('No organization');

      const { data, error } = await supabase.functions.invoke('generate-ad-analytics-insights', {
        body: { organizationId: currentOrganization.id },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-insights'] });
      toast.success('Đã tạo insights mới');
    },
    onError: (error) => {
      toast.error('Không thể tạo insights: ' + (error as Error).message);
    },
  });

  // Group insights by type
  const insightsByType = (insights || []).reduce(
    (acc, insight) => {
      if (!acc[insight.insightType]) {
        acc[insight.insightType] = [];
      }
      acc[insight.insightType].push(insight);
      return acc;
    },
    {} as Record<AIInsight['insightType'], AIInsight[]>
  );

  // Get insights by severity
  const criticalInsights = (insights || []).filter((i) => i.severity === 'critical');
  const warningInsights = (insights || []).filter((i) => i.severity === 'warning');
  const successInsights = (insights || []).filter((i) => i.severity === 'success');
  const infoInsights = (insights || []).filter((i) => i.severity === 'info');

  return {
    insights,
    insightsByType,
    criticalInsights,
    warningInsights,
    successInsights,
    infoInsights,
    isLoading,
    dismissInsight: dismissInsightMutation.mutate,
    isDismissing: dismissInsightMutation.isPending,
    generateInsights: generateInsightsMutation.mutate,
    isGenerating: generateInsightsMutation.isPending,
  };
}
