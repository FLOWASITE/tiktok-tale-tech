import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ReportFilters } from './useReportFilters';

export interface ReportOverviewData {
  contentCreated: number;
  contentDelta: number; // vs previous period
  publishedCount: number;
  publishedDelta: number;
  failedCount: number;
  engagementTotal: number; // likes+comments+shares from social_post_engagements
  activeChannels: number;
}

function rangeDays(filters: ReportFilters) {
  return Math.max(1, Math.round((filters.dateTo.getTime() - filters.dateFrom.getTime()) / 86400000));
}

export function useReportOverview(orgId: string | null, filters: ReportFilters) {
  return useQuery({
    queryKey: ['report-overview', orgId, filters.dateFrom.toISOString(), filters.dateTo.toISOString(), filters.brandId, filters.channel],
    enabled: !!orgId,
    queryFn: async (): Promise<ReportOverviewData> => {
      const days = rangeDays(filters);
      const prevTo = new Date(filters.dateFrom);
      const prevFrom = new Date(filters.dateFrom);
      prevFrom.setDate(prevFrom.getDate() - days);

      // Content created (current period)
      let cQ = supabase
        .from('multi_channel_contents')
        .select('id, selected_channels', { count: 'exact', head: false })
        .eq('organization_id', orgId!)
        .gte('created_at', filters.dateFrom.toISOString())
        .lte('created_at', filters.dateTo.toISOString());
      if (filters.brandId) cQ = cQ.eq('brand_template_id', filters.brandId);
      if (filters.channel) cQ = cQ.contains('selected_channels', [filters.channel]);
      const { data: contentRows, count: contentCount } = await cQ;

      // Content created (previous period) for delta
      const { count: prevContentCount } = await supabase
        .from('multi_channel_contents')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId!)
        .gte('created_at', prevFrom.toISOString())
        .lte('created_at', prevTo.toISOString());

      // Content created (previous period) for delta
      const { count: prevContentCount } = await supabase
        .from('multi_channel_contents')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId!)
        .gte('created_at', prevFrom.toISOString())
        .lte('created_at', prevTo.toISOString());

      // Publishing logs
      let pQ = supabase
        .from('content_publishing_logs')
        .select('id, action')
        .eq('organization_id', orgId!)
        .gte('performed_at', filters.dateFrom.toISOString())
        .lte('performed_at', filters.dateTo.toISOString());
      if (filters.channel) pQ = pQ.eq('channel', filters.channel);
      const { data: pubRows } = await pQ;

      const { data: prevPubRows } = await supabase
        .from('content_publishing_logs')
        .select('id, action')
        .eq('organization_id', orgId!)
        .gte('performed_at', prevFrom.toISOString())
        .lte('performed_at', prevTo.toISOString());

      // Engagement from social_post_engagements
      const { data: engRows } = await supabase
        .from('social_post_engagements')
        .select('event_type')
        .eq('organization_id', orgId!)
        .gte('created_at', filters.dateFrom.toISOString())
        .lte('created_at', filters.dateTo.toISOString());

      const publishedCount = (pubRows ?? []).filter((r) => r.action === 'published').length;
      const failedCount = (pubRows ?? []).filter((r) => r.action === 'failed').length;
      const prevPublishedCount = (prevPubRows ?? []).filter((r) => r.action === 'published').length;

      const channels = new Set<string>();
      for (const r of contentRows ?? []) if (r.channel) channels.add(r.channel as string);

      return {
        contentCreated: contentCount ?? 0,
        contentDelta: (contentCount ?? 0) - (prevContentCount ?? 0),
        publishedCount,
        publishedDelta: publishedCount - prevPublishedCount,
        failedCount,
        engagementTotal: (engRows ?? []).length,
        activeChannels: channels.size,
      };
    },
  });
}
