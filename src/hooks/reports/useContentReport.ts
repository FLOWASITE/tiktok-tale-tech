import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ReportFilters } from './useReportFilters';
import { bucketByDay, fillDateGaps } from '@/lib/reports/aggregators';
import type { ContentType } from '@/components/reports/ContentTypeBadge';

export type DerivedStatus = 'draft' | 'approved' | 'scheduled' | 'published' | 'partially_published' | 'failed';

export interface ContentRow {
  id: string;
  type: ContentType;
  title: string;
  topic: string | null;
  status: string;
  derivedStatus: DerivedStatus;
  channels: string[];
  brand_id: string | null;
  brand_name?: string;
  created_at: string;
  approved_at?: string | null;
  nextScheduledAt?: string | null;
  lastPublishedAt?: string | null;
  scheduledCount?: number;
  failedCount?: number;
}

export interface HistoryEvent {
  type: 'approval' | 'scheduled' | 'published' | 'failed' | 'rescheduled';
  at: string;
  channel?: string;
  notes?: string;
  error?: string;
  actor?: string | null;
}

export interface ContentReportData {
  total: number;
  byType: { type: ContentType; count: number }[];
  byStatus: { status: string; count: number }[];
  byTypeStatus: {
    type: ContentType;
    typeLabel: string;
    draft: number;
    approved: number;
    scheduled: number;
    published: number;
    partially_published: number;
    failed: number;
  }[];
  byChannel: { channel: string; count: number }[];
  byBrand: { brand: string; count: number }[];
  byDay: { date: string; value: number }[];
  topTopics: { topic: string; count: number }[];
  funnel: { created: number; approved: number; scheduled: number; published: number; failed: number };
  rows: ContentRow[];
  history: Record<string, HistoryEvent[]>;
}

const TYPE_LABEL: Record<ContentType, string> = {
  multichannel: 'Multi-channel',
  script: 'Script',
  carousel: 'Carousel',
  core: 'Core content',
  ad_copy: 'Ad copy',
};

interface ContentReportOptions {
  overrideRange?: { from: Date; to: Date } | null;
}

export function useContentReport(
  orgId: string | null,
  filters: ReportFilters,
  options: ContentReportOptions = {},
) {
  const dateFrom = options.overrideRange?.from ?? filters.dateFrom;
  const dateTo = options.overrideRange?.to ?? filters.dateTo;
  return useQuery({
    queryKey: [
      'report-content',
      orgId,
      dateFrom.toISOString(),
      dateTo.toISOString(),
      filters.brandId,
      filters.channel,
    ],
    enabled: !!orgId,
    queryFn: async (): Promise<ContentReportData> => {
      const fromIso = dateFrom.toISOString();
      const toIso = dateTo.toISOString();
      const brandFilter = filters.brandId;
      const channelFilter = filters.channel;

      // Build per-source queries (limit 1000 per type)
      const mc = (async () => {
        let q = supabase
          .from('multi_channel_contents')
          .select('id, title, topic, status, selected_channels, brand_template_id, created_at')
          .eq('organization_id', orgId!)
          .gte('created_at', fromIso)
          .lte('created_at', toIso)
          .order('created_at', { ascending: false })
          .limit(1000);
        if (brandFilter) q = q.eq('brand_template_id', brandFilter);
        if (channelFilter) q = q.contains('selected_channels', [channelFilter]);
        const { data, error } = await q;
        if (error) throw error;
        return (data ?? []).map<ContentRow>((r: any) => ({
          id: r.id,
          type: 'multichannel',
          title: r.title ?? r.topic ?? '(Không có tiêu đề)',
          topic: r.topic ?? null,
          status: r.status ?? 'draft',
          channels: (r.selected_channels as string[]) ?? [],
          brand_id: r.brand_template_id ?? null,
          derivedStatus: 'draft' as DerivedStatus,
          created_at: r.created_at,
        }));
      })();

      const scripts = (async () => {
        // Skip if filtering by a specific channel (scripts have no channels)
        if (channelFilter) return [] as ContentRow[];
        let q = supabase
          .from('scripts')
          .select('id, title, topic, status, brand_template_id, created_at')
          .eq('organization_id', orgId!)
          .gte('created_at', fromIso)
          .lte('created_at', toIso)
          .order('created_at', { ascending: false })
          .limit(1000);
        if (brandFilter) q = q.eq('brand_template_id', brandFilter);
        const { data, error } = await q;
        if (error) throw error;
        return (data ?? []).map<ContentRow>((r: any) => ({
          id: r.id,
          type: 'script',
          title: r.title ?? r.topic ?? '(Không có tiêu đề)',
          topic: r.topic ?? null,
          status: r.status ?? 'draft',
          channels: [],
          brand_id: r.brand_template_id ?? null,
          derivedStatus: 'draft' as DerivedStatus,
          created_at: r.created_at,
        }));
      })();

      const carousels = (async () => {
        if (channelFilter) return [] as ContentRow[];
        let q = supabase
          .from('carousels')
          .select('id, title, topic, status, brand_template_id, created_at')
          .eq('organization_id', orgId!)
          .gte('created_at', fromIso)
          .lte('created_at', toIso)
          .order('created_at', { ascending: false })
          .limit(1000);
        if (brandFilter) q = q.eq('brand_template_id', brandFilter);
        const { data, error } = await q;
        if (error) throw error;
        return (data ?? []).map<ContentRow>((r: any) => ({
          id: r.id,
          type: 'carousel',
          title: r.title ?? r.topic ?? '(Không có tiêu đề)',
          topic: r.topic ?? null,
          status: r.status ?? 'draft',
          channels: [],
          brand_id: r.brand_template_id ?? null,
          derivedStatus: 'draft' as DerivedStatus,
          created_at: r.created_at,
        }));
      })();

      const cores = (async () => {
        if (channelFilter) return [] as ContentRow[];
        let q = supabase
          .from('core_contents')
          .select('id, title, topic, status, brand_template_id, created_at')
          .eq('organization_id', orgId!)
          .gte('created_at', fromIso)
          .lte('created_at', toIso)
          .order('created_at', { ascending: false })
          .limit(1000);
        if (brandFilter) q = q.eq('brand_template_id', brandFilter);
        const { data, error } = await q;
        if (error) throw error;
        return (data ?? []).map<ContentRow>((r: any) => ({
          id: r.id,
          type: 'core',
          title: r.title ?? r.topic ?? '(Không có tiêu đề)',
          topic: r.topic ?? null,
          status: r.status ?? 'draft',
          channels: [],
          brand_id: r.brand_template_id ?? null,
          derivedStatus: 'draft' as DerivedStatus,
          created_at: r.created_at,
        }));
      })();

      const adCopies = (async () => {
        if (channelFilter) return [] as ContentRow[];
        let q = supabase
          .from('ad_copies')
          .select('id, title, topic, status, brand_template_id, created_at')
          .eq('organization_id', orgId!)
          .gte('created_at', fromIso)
          .lte('created_at', toIso)
          .order('created_at', { ascending: false })
          .limit(1000);
        if (brandFilter) q = q.eq('brand_template_id', brandFilter);
        const { data, error } = await q;
        if (error) throw error;
        return (data ?? []).map<ContentRow>((r: any) => ({
          id: r.id,
          type: 'ad_copy',
          title: r.title ?? r.topic ?? '(Không có tiêu đề)',
          topic: r.topic ?? null,
          status: r.status ?? 'draft',
          channels: [],
          brand_id: r.brand_template_id ?? null,
          derivedStatus: 'draft' as DerivedStatus,
          created_at: r.created_at,
        }));
      })();

      const all = (await Promise.all([mc, scripts, carousels, cores, adCopies])).flat();

      // Brand name lookup
      const brandIds = [...new Set(all.map((r) => r.brand_id).filter((b): b is string => !!b))];
      let brandNames: Record<string, string> = {};
      if (brandIds.length > 0) {
        const { data: brands } = await supabase
          .from('brand_templates')
          .select('id, brand_name')
          .in('id', brandIds);
        brandNames = Object.fromEntries(
          (brands ?? []).map((b: any) => [b.id, b.brand_name ?? 'Brand']),
        );
      }
      for (const r of all) {
        if (r.brand_id) r.brand_name = brandNames[r.brand_id] ?? 'Brand';
      }

      // ============ Schedules + history (per content) ============
      const contentIds = all.map((r) => r.id);
      const history: Record<string, HistoryEvent[]> = {};
      const scheduleAgg = new Map<
        string,
        { scheduled: number; failed: number; nextAt?: string; lastPublishAt?: string }
      >();

      if (contentIds.length > 0) {
        // Chunk to keep .in() URLs sane
        const chunk = <T,>(arr: T[], n = 200) => {
          const out: T[][] = [];
          for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
          return out;
        };

        const schedulesAll: any[] = [];
        const pubLogsAll: any[] = [];
        const approvalLogsAll: any[] = [];

        await Promise.all(
          chunk(contentIds).map(async (ids) => {
            const [sched, plogs, alogs] = await Promise.all([
              supabase
                .from('content_schedules')
                .select('content_id, channel, scheduled_at, publish_status, published_at, publish_error')
                .in('content_id', ids)
                .eq('organization_id', orgId!),
              supabase
                .from('content_publishing_logs')
                .select('content_id, channel, action, performed_at, error_message')
                .in('content_id', ids)
                .eq('organization_id', orgId!)
                .order('performed_at', { ascending: false })
                .limit(500),
              supabase
                .from('approval_logs')
                .select('content_id, action, notes, created_at, performed_by')
                .in('content_id', ids)
                .eq('organization_id', orgId!)
                .order('created_at', { ascending: false })
                .limit(500),
            ]);
            if (sched.data) schedulesAll.push(...sched.data);
            if (plogs.data) pubLogsAll.push(...plogs.data);
            if (alogs.data) approvalLogsAll.push(...alogs.data);
          }),
        );

        const nowMs = Date.now();
        for (const s of schedulesAll) {
          const cur = scheduleAgg.get(s.content_id) ?? { scheduled: 0, failed: 0 };
          if (s.publish_status === 'failed') cur.failed++;
          if (s.publish_status === 'pending' || s.publish_status === 'scheduled') {
            cur.scheduled++;
            const at = s.scheduled_at as string | null;
            if (at && new Date(at).getTime() >= nowMs) {
              if (!cur.nextAt || at < cur.nextAt) cur.nextAt = at;
            }
          }
          if (s.published_at) {
            if (!cur.lastPublishAt || s.published_at > cur.lastPublishAt) {
              cur.lastPublishAt = s.published_at;
            }
          }
          scheduleAgg.set(s.content_id, cur);
        }

        // Build timeline
        for (const a of approvalLogsAll) {
          (history[a.content_id] ??= []).push({
            type: 'approval',
            at: a.created_at,
            notes: a.notes ?? undefined,
            actor: a.performed_by ?? null,
          });
        }
        for (const p of pubLogsAll) {
          const t = (p.action as HistoryEvent['type']) ?? 'published';
          (history[p.content_id] ??= []).push({
            type: t,
            at: p.performed_at,
            channel: p.channel ?? undefined,
            error: p.error_message ?? undefined,
          });
        }
        for (const s of schedulesAll) {
          if (s.publish_status === 'pending' || s.publish_status === 'scheduled') {
            (history[s.content_id] ??= []).push({
              type: 'scheduled',
              at: s.scheduled_at,
              channel: s.channel ?? undefined,
            });
          }
        }
        // Sort each timeline desc
        for (const k of Object.keys(history)) {
          history[k].sort((a, b) => (a.at < b.at ? 1 : -1));
        }
      }

      // ============ Derive status per row ============
      // Priority: failed > scheduled > published/partially_published > approved > draft
      for (const r of all) {
        const agg = scheduleAgg.get(r.id);
        r.scheduledCount = agg?.scheduled ?? 0;
        r.failedCount = agg?.failed ?? 0;
        r.nextScheduledAt = agg?.nextAt ?? null;
        r.lastPublishedAt = agg?.lastPublishAt ?? null;

        let d: DerivedStatus;
        if (r.status === 'published') d = 'published';
        else if (r.status === 'partially_published') d = 'partially_published';
        else if (agg && agg.scheduled > 0) d = 'scheduled';
        else if (agg && agg.failed > 0 && r.status !== 'approved') d = 'failed';
        else if (r.status === 'approved') d = 'approved';
        else d = 'draft';
        // If everything failed and nothing scheduled/published, mark failed
        if (d === 'approved' && agg && agg.failed > 0 && agg.scheduled === 0 && !agg.lastPublishAt) {
          d = 'failed';
        }
        r.derivedStatus = d;
      }

      // ============ Aggregations ============
      const total = all.length;

      const typeMap = new Map<ContentType, number>();
      for (const r of all) typeMap.set(r.type, (typeMap.get(r.type) ?? 0) + 1);
      const byType = [...typeMap.entries()]
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count);

      const statusMap = new Map<string, number>();
      for (const r of all) statusMap.set(r.derivedStatus, (statusMap.get(r.derivedStatus) ?? 0) + 1);
      const byStatus = [...statusMap.entries()]
        .map(([status, count]) => ({ status, count }))
        .sort((a, b) => b.count - a.count);

      // byTypeStatus stacked (uses derivedStatus)
      const tsMap = new Map<
        ContentType,
        { draft: number; approved: number; scheduled: number; published: number; partially_published: number; failed: number }
      >();
      for (const r of all) {
        const cur =
          tsMap.get(r.type) ?? { draft: 0, approved: 0, scheduled: 0, published: 0, partially_published: 0, failed: 0 };
        cur[r.derivedStatus] = (cur[r.derivedStatus] ?? 0) + 1;
        tsMap.set(r.type, cur);
      }
      const byTypeStatus = [...tsMap.entries()].map(([type, v]) => ({
        type,
        typeLabel: TYPE_LABEL[type],
        ...v,
      }));

      // byChannel
      const channelMap = new Map<string, number>();
      for (const r of all) for (const c of r.channels) channelMap.set(c, (channelMap.get(c) ?? 0) + 1);
      const byChannel = [...channelMap.entries()]
        .map(([channel, count]) => ({ channel, count }))
        .sort((a, b) => b.count - a.count);

      // byBrand
      const brandCount = new Map<string, number>();
      for (const r of all) {
        const key = r.brand_id ? brandNames[r.brand_id] ?? 'Brand' : 'Không gán brand';
        brandCount.set(key, (brandCount.get(key) ?? 0) + 1);
      }
      const byBrand = [...brandCount.entries()]
        .map(([brand, count]) => ({ brand, count }))
        .sort((a, b) => b.count - a.count);

      // byDay
      const dayBuckets = bucketByDay(all, (r) => r.created_at);
      const dayCounts = new Map<string, number>();
      for (const [k, v] of dayBuckets) dayCounts.set(k, v.length);
      const byDay = fillDateGaps(filters.dateFrom, filters.dateTo, dayCounts);

      // Top topics
      const topicMap = new Map<string, number>();
      const displayMap = new Map<string, string>();
      for (const r of all) {
        const t = (r.topic ?? '').trim();
        if (!t) continue;
        const key = t.toLowerCase();
        topicMap.set(key, (topicMap.get(key) ?? 0) + 1);
        if (!displayMap.has(key)) displayMap.set(key, t);
      }
      const topTopics = [...topicMap.entries()]
        .map(([key, count]) => ({ topic: displayMap.get(key) ?? key, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Funnel (using derivedStatus)
      const APPROVED = new Set<DerivedStatus>(['approved', 'scheduled', 'published', 'partially_published']);
      const PUBLISHED = new Set<DerivedStatus>(['published', 'partially_published']);
      const funnel = {
        created: total,
        approved: all.filter((r) => APPROVED.has(r.derivedStatus)).length,
        scheduled: all.filter((r) => r.derivedStatus === 'scheduled').length,
        published: all.filter((r) => PUBLISHED.has(r.derivedStatus)).length,
        failed: all.filter((r) => r.derivedStatus === 'failed').length,
      };

      const rows = all.sort((a, b) => b.created_at.localeCompare(a.created_at));

      return {
        total,
        byType,
        byStatus,
        byTypeStatus,
        byChannel,
        byBrand,
        byDay,
        topTopics,
        funnel,
        rows,
        history,
      };
    },
  });
}
