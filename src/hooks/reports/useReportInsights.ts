import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ReportFilters } from './useReportFilters';
import type { ReportOverviewData } from './useReportOverview';
import type { EngagementReportData } from './useEngagementReport';
import type { ContentReportData } from './useContentReport';

export interface ReportInsightCard {
  type: 'trend' | 'anomaly' | 'recommendation' | 'highlight';
  severity: 'info' | 'warning' | 'success' | 'critical';
  title: string;
  description: string;
  action?: string;
}

export interface ReportInsightsResult {
  insights: ReportInsightCard[];
  summary: string;
  generatedAt: string;
}

interface BuildArgs {
  organizationId: string;
  filters: ReportFilters;
  brandName?: string | null;
  overview: ReportOverviewData;
  engagement: EngagementReportData;
  content: ContentReportData;
}

function buildMetricsPayload(args: BuildArgs) {
  const { overview, engagement, content, filters, organizationId, brandName } = args;
  const failureRate = overview.publishedCount + overview.failedCount > 0
    ? Math.round((overview.failedCount / (overview.publishedCount + overview.failedCount)) * 100)
    : 0;
  return {
    organizationId,
    brandId: filters.brandId,
    brandName,
    dateFrom: filters.dateFrom.toISOString(),
    dateTo: filters.dateTo.toISOString(),
    metrics: {
      dateFrom: filters.dateFrom.toISOString(),
      dateTo: filters.dateTo.toISOString(),
      contentCreated: overview.contentCreated,
      publishedCount: overview.publishedCount,
      failedCount: overview.failedCount,
      engagementTotal: overview.engagementTotal,
      totalReach: engagement.totalReach,
      totalLikes: engagement.totalLikes,
      totalComments: engagement.totalComments,
      totalShares: engagement.totalShares,
      topChannels: content.byChannel.slice(0, 8).map((c) => ({ channel: c.channel, count: c.count })),
      topPlatforms: engagement.byPlatform.slice(0, 8).map((p) => ({ platform: p.platform, reach: p.reach, likes: p.likes })),
      failureRate,
      engagementRate: engagement.engagementRate,
    },
  };
}

export function useReportInsights(args: BuildArgs | null) {
  const queryClient = useQueryClient();

  const queryKey = args
    ? ['report-insights', args.organizationId, args.filters.brandId, args.filters.dateFrom.toISOString(), args.filters.dateTo.toISOString()]
    : ['report-insights', null];

  const query = useQuery({
    queryKey,
    enabled: !!args,
    staleTime: 60 * 60 * 1000,
    queryFn: async (): Promise<ReportInsightsResult> => {
      if (!args) throw new Error('No args');
      const payload = buildMetricsPayload(args);
      const { data, error } = await supabase.functions.invoke('generate-report-insights', {
        body: payload,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.insights as ReportInsightsResult;
    },
  });

  const refresh = useMutation({
    mutationFn: async () => {
      if (!args) throw new Error('No args');
      const payload = buildMetricsPayload(args);
      const { data, error } = await supabase.functions.invoke('generate-report-insights', {
        body: { ...payload, _bust: Date.now() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.insights as ReportInsightsResult;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
    },
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refresh: refresh.mutate,
    isRefreshing: refresh.isPending,
  };
}
