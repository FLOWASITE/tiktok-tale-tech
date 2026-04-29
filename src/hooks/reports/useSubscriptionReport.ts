import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export type QuotaKey = 'scripts' | 'carousels' | 'multichannel' | 'images';
export type QuotaStatus = 'unlimited' | 'ok' | 'warning' | 'critical' | 'exhausted';

export interface QuotaItem {
  key: QuotaKey;
  label: string;
  used: number;
  limit: number; // -1 = unlimited
  pct: number; // 0-100, 0 if unlimited
  status: QuotaStatus;
  remaining: number; // Infinity if unlimited
  projectedExhaustionDate: Date | null;
}

export interface DailyUsagePoint {
  date: string; // yyyy-MM-dd
  scripts: number;
  carousels: number;
  multichannel: number;
  images: number;
}

export interface SubscriptionReportData {
  hasSubscription: boolean;
  planType: string | null;
  status: string | null;
  periodStart: Date | null;
  periodEnd: Date | null;
  daysRemainingInPeriod: number;
  daysElapsedInPeriod: number;
  totalDaysInPeriod: number;
  quotas: QuotaItem[];
  dailySeries: DailyUsagePoint[];
  imageChannelBreakdown: Array<{ channel: string; count: number }>;
  warnings: QuotaItem[];
}

const QUOTA_LABELS: Record<QuotaKey, string> = {
  scripts: 'Scripts',
  carousels: 'Carousels',
  multichannel: 'Đa kênh',
  images: 'Ảnh AI',
};

function buildStatus(used: number, limit: number): QuotaStatus {
  if (limit === -1) return 'unlimited';
  if (limit === 0) return 'exhausted';
  const pct = (used / limit) * 100;
  if (pct >= 100) return 'exhausted';
  if (pct >= 90) return 'critical';
  if (pct >= 80) return 'warning';
  return 'ok';
}

export function useSubscriptionReport() {
  const { currentOrganization } = useOrganizationContext();
  const orgId = currentOrganization?.id;
  const {
    subscription,
    currentPlanLimits,
    usage,
    activeAddons,
    currentPeriod,
    isLoading: subLoading,
    refetch: refetchSubscription,
  } = useSubscription();

  const dailyQuery = useQuery({
    queryKey: ['subscription-report-daily', orgId, currentPeriod.start, currentPeriod.end],
    enabled: !!orgId && !!subscription,
    queryFn: async (): Promise<{
      daily: DailyUsagePoint[];
      imageBreakdown: Array<{ channel: string; count: number }>;
    }> => {
      if (!orgId) return { daily: [], imageBreakdown: [] };

      // usage_logs is keyed by user_id; we need org-level. Easiest path: use the
      // same per-feature tables that useSubscription counts.
      const { start, end } = currentPeriod;

      const [scriptsRes, carouselsRes, multiRes, contentRes] = await Promise.all([
        supabase.from('scripts').select('created_at').eq('organization_id', orgId).gte('created_at', start).lte('created_at', end),
        supabase.from('carousels').select('created_at').eq('organization_id', orgId).gte('created_at', start).lte('created_at', end),
        supabase.from('multi_channel_contents').select('created_at').eq('organization_id', orgId).gte('created_at', start).lte('created_at', end),
        supabase.from('multi_channel_contents').select('id').eq('organization_id', orgId).gte('created_at', start).lte('created_at', end),
      ]);

      const contentIds = (contentRes.data || []).map((r: any) => r.id);
      let imagesRows: Array<{ created_at: string; channel: string | null }> = [];
      if (contentIds.length > 0) {
        // Chunk to avoid URL length limits
        const chunkSize = 100;
        for (let i = 0; i < contentIds.length; i += chunkSize) {
          const chunk = contentIds.slice(i, i + chunkSize);
          const { data } = await supabase
            .from('channel_image_history')
            .select('created_at, channel')
            .in('content_id', chunk);
          if (data) imagesRows = imagesRows.concat(data as any);
        }
      }

      // Bucket by date
      const dayMap = new Map<string, DailyUsagePoint>();
      const ensureDay = (iso: string): DailyUsagePoint => {
        const d = iso.slice(0, 10);
        let item = dayMap.get(d);
        if (!item) {
          item = { date: d, scripts: 0, carousels: 0, multichannel: 0, images: 0 };
          dayMap.set(d, item);
        }
        return item;
      };

      (scriptsRes.data || []).forEach((r: any) => { ensureDay(r.created_at).scripts += 1; });
      (carouselsRes.data || []).forEach((r: any) => { ensureDay(r.created_at).carousels += 1; });
      (multiRes.data || []).forEach((r: any) => { ensureDay(r.created_at).multichannel += 1; });
      imagesRows.forEach((r) => { ensureDay(r.created_at).images += 1; });

      // Fill gaps from start..min(end,today)
      const startD = new Date(start);
      const endD = new Date(end);
      const today = new Date();
      const fillEnd = endD < today ? endD : today;
      const cursor = new Date(startD.getFullYear(), startD.getMonth(), startD.getDate());
      const finalEnd = new Date(fillEnd.getFullYear(), fillEnd.getMonth(), fillEnd.getDate());
      while (cursor <= finalEnd) {
        const iso = cursor.toISOString().slice(0, 10);
        if (!dayMap.has(iso)) {
          dayMap.set(iso, { date: iso, scripts: 0, carousels: 0, multichannel: 0, images: 0 });
        }
        cursor.setDate(cursor.getDate() + 1);
      }

      const daily = Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));

      const breakdownMap = new Map<string, number>();
      imagesRows.forEach((r) => {
        const ch = r.channel || 'other';
        breakdownMap.set(ch, (breakdownMap.get(ch) || 0) + 1);
      });
      const imageBreakdown = Array.from(breakdownMap.entries())
        .map(([channel, count]) => ({ channel, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);

      return { daily, imageBreakdown };
    },
  });

  const periodStart = subscription ? new Date(currentPeriod.start) : null;
  const periodEnd = subscription ? new Date(currentPeriod.end) : null;
  const now = new Date();
  const totalDaysInPeriod = periodStart && periodEnd
    ? Math.max(1, Math.round((periodEnd.getTime() - periodStart.getTime()) / 86400000))
    : 0;
  const daysElapsedInPeriod = periodStart
    ? Math.max(1, Math.min(totalDaysInPeriod, Math.round((now.getTime() - periodStart.getTime()) / 86400000)))
    : 0;
  const daysRemainingInPeriod = Math.max(0, totalDaysInPeriod - daysElapsedInPeriod);

  const quotas: QuotaItem[] = (() => {
    if (!currentPlanLimits || !usage) return [];
    const items: Array<{ key: QuotaKey; used: number; limit: number }> = [
      { key: 'scripts', used: usage.scripts, limit: currentPlanLimits.monthly_scripts },
      { key: 'carousels', used: usage.carousels, limit: currentPlanLimits.monthly_carousels },
      { key: 'multichannel', used: usage.multichannel, limit: currentPlanLimits.monthly_multichannel },
      { key: 'images', used: usage.images, limit: currentPlanLimits.monthly_images },
    ];
    return items.map(({ key, used, limit }) => {
      const status = buildStatus(used, limit);
      const pct = limit === -1 ? 0 : Math.min(100, Math.round((used / Math.max(1, limit)) * 100));
      const remaining = limit === -1 ? Infinity : Math.max(0, limit - used);
      let projectedExhaustionDate: Date | null = null;
      if (limit !== -1 && remaining > 0 && daysElapsedInPeriod > 0 && periodEnd) {
        const avgPerDay = used / daysElapsedInPeriod;
        if (avgPerDay > 0) {
          const daysToExhaust = Math.ceil(remaining / avgPerDay);
          const projected = new Date(now.getTime() + daysToExhaust * 86400000);
          if (projected < periodEnd) {
            projectedExhaustionDate = projected;
          }
        }
      }
      return {
        key,
        label: QUOTA_LABELS[key],
        used,
        limit,
        pct,
        status,
        remaining,
        projectedExhaustionDate,
      };
    });
  })();

  const warnings = quotas.filter((q) => q.status === 'warning' || q.status === 'critical' || q.status === 'exhausted');

  const data: SubscriptionReportData = {
    hasSubscription: !!subscription,
    planType: subscription?.plan_type ?? null,
    status: subscription?.status ?? null,
    periodStart,
    periodEnd,
    daysRemainingInPeriod,
    daysElapsedInPeriod,
    totalDaysInPeriod,
    quotas,
    dailySeries: dailyQuery.data?.daily || [],
    imageChannelBreakdown: dailyQuery.data?.imageBreakdown || [],
    warnings,
  };

  return {
    data,
    activeAddons,
    isLoading: subLoading || dailyQuery.isLoading,
    refetch: () => {
      refetchSubscription();
      dailyQuery.refetch();
    },
  };
}
