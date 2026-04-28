import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ReportFilters } from './useReportFilters';
import { bucketByDay, fillDateGaps } from '@/lib/reports/aggregators';

export interface PublishingReportData {
  total: number;
  published: number;
  failed: number;
  scheduled: number;
  byChannel: { channel: string; published: number; failed: number }[];
  byDay: { date: string; published: number; failed: number }[];
  rows: {
    id: string;
    channel: string;
    action: string;
    performed_at: string;
    error: string | null;
    content_id: string | null;
  }[];
}

export function usePublishingReport(orgId: string | null, filters: ReportFilters) {
  return useQuery({
    queryKey: ['report-publishing', orgId, filters.dateFrom.toISOString(), filters.dateTo.toISOString(), filters.brandId, filters.campaignId, filters.channel],
    enabled: !!orgId,
    queryFn: async (): Promise<PublishingReportData> => {
      let q = supabase
        .from('content_publishing_logs')
        .select('id, channel, action, performed_at, error_message, content_id')
        .eq('organization_id', orgId!)
        .gte('performed_at', filters.dateFrom.toISOString())
        .lte('performed_at', filters.dateTo.toISOString())
        .order('performed_at', { ascending: false })
        .limit(1000);

      if (filters.channel) q = q.eq('channel', filters.channel);

      const { data, error } = await q;
      if (error) throw error;

      const rows = (data ?? []).map((r) => ({
        id: r.id as string,
        channel: (r.channel as string) ?? 'unknown',
        action: (r.action as string) ?? 'unknown',
        performed_at: (r.performed_at as string) ?? new Date().toISOString(),
        error: (r.error_message as string) ?? null,
        content_id: (r.content_id as string) ?? null,
      }));

      const total = rows.length;
      const published = rows.filter((r) => r.action === 'published').length;
      const failed = rows.filter((r) => r.action === 'failed').length;
      const scheduled = rows.filter((r) => r.action === 'scheduled').length;

      // by channel
      const channelMap = new Map<string, { published: number; failed: number }>();
      for (const r of rows) {
        const c = channelMap.get(r.channel) ?? { published: 0, failed: 0 };
        if (r.action === 'published') c.published++;
        if (r.action === 'failed') c.failed++;
        channelMap.set(r.channel, c);
      }
      const byChannel = [...channelMap.entries()]
        .map(([channel, v]) => ({ channel, ...v }))
        .sort((a, b) => b.published + b.failed - (a.published + a.failed));

      // by day
      const dayMap = bucketByDay(rows, (r) => r.performed_at);
      const pubMap = new Map<string, number>();
      const failMap = new Map<string, number>();
      for (const [k, v] of dayMap) {
        pubMap.set(k, v.filter((x) => x.action === 'published').length);
        failMap.set(k, v.filter((x) => x.action === 'failed').length);
      }
      const pubSeries = fillDateGaps(filters.dateFrom, filters.dateTo, pubMap);
      const failSeries = fillDateGaps(filters.dateFrom, filters.dateTo, failMap);
      const byDay = pubSeries.map((p, i) => ({
        date: p.date,
        published: p.value,
        failed: failSeries[i]?.value ?? 0,
      }));

      return { total, published, failed, scheduled, byChannel, byDay, rows };
    },
  });
}
