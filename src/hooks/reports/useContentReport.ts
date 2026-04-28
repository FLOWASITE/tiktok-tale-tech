import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ReportFilters } from './useReportFilters';
import { bucketByDay, fillDateGaps } from '@/lib/reports/aggregators';

export interface ContentReportData {
  total: number;
  byChannel: { channel: string; count: number }[];
  byBrand: { brand: string; count: number }[];
  byDay: { date: string; value: number }[];
  rows: { id: string; title: string; channels: string[]; brand_id: string | null; created_at: string }[];
}

export function useContentReport(orgId: string | null, filters: ReportFilters) {
  return useQuery({
    queryKey: [
      'report-content',
      orgId,
      filters.dateFrom.toISOString(),
      filters.dateTo.toISOString(),
      filters.brandId,
      filters.channel,
    ],
    enabled: !!orgId,
    queryFn: async (): Promise<ContentReportData> => {
      let q = supabase
        .from('multi_channel_contents')
        .select('id, title, topic, selected_channels, brand_template_id, created_at')
        .eq('organization_id', orgId!)
        .gte('created_at', filters.dateFrom.toISOString())
        .lte('created_at', filters.dateTo.toISOString())
        .order('created_at', { ascending: false })
        .limit(1000);

      if (filters.brandId) q = q.eq('brand_template_id', filters.brandId);
      if (filters.channel) q = q.contains('selected_channels', [filters.channel]);

      const { data, error } = await q;
      if (error) throw error;

      const rows = (data ?? []).map((r: any) => ({
        id: r.id as string,
        title: (r.title as string) ?? (r.topic as string) ?? '(Không có tiêu đề)',
        channels: (r.selected_channels as string[]) ?? [],
        brand_id: (r.brand_template_id as string) ?? null,
        created_at: r.created_at as string,
      }));

      const channelCount = new Map<string, number>();
      for (const r of rows) for (const c of r.channels) channelCount.set(c, (channelCount.get(c) ?? 0) + 1);

      const brandCount = new Map<string | null, number>();
      for (const r of rows) brandCount.set(r.brand_id, (brandCount.get(r.brand_id) ?? 0) + 1);

      const dayMap = bucketByDay(rows, (r) => r.created_at);
      const counts = new Map<string, number>();
      for (const [k, v] of dayMap) counts.set(k, v.length);
      const byDay = fillDateGaps(filters.dateFrom, filters.dateTo, counts);

      const brandIds = [...brandCount.keys()].filter((b): b is string => !!b);
      let brandNames: Record<string, string> = {};
      if (brandIds.length > 0) {
        const { data: brands } = await supabase
          .from('brand_templates')
          .select('id, brand_name')
          .in('id', brandIds);
        brandNames = Object.fromEntries(
          (brands ?? []).map((b: any) => [b.id as string, (b.brand_name as string) ?? 'Brand']),
        );
      }

      return {
        total: rows.length,
        byChannel: [...channelCount.entries()].map(([channel, count]) => ({ channel, count })).sort((a, b) => b.count - a.count),
        byBrand: [...brandCount.entries()].map(([id, count]) => ({
          brand: id ? brandNames[id] ?? 'Brand' : 'Không gán brand',
          count,
        })).sort((a, b) => b.count - a.count),
        byDay,
        rows,
      };
    },
  });
}
