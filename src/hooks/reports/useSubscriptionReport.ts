import { useMemo, useState } from 'react';
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
  pct: number;
  status: QuotaStatus;
  remaining: number;
  projectedExhaustionDate: Date | null;
}

export interface DailyUsagePoint {
  date: string;
  scripts: number;
  carousels: number;
  multichannel: number;
  images: number;
}

export interface BrandUsageRow {
  brandId: string;
  brandName: string;
  scripts: number;
  carousels: number;
  multichannel: number;
  images: number;
  total: number;
}

export interface UserUsageRow {
  userId: string;
  fullName: string;
  email: string | null;
  avatarUrl: string | null;
  scripts: number;
  carousels: number;
  multichannel: number;
  images: number;
  total: number;
}

export interface BrandFilterOption {
  id: string;
  name: string;
}

export interface UserFilterOption {
  id: string;
  name: string;
  avatarUrl: string | null;
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
  brandUsage: BrandUsageRow[];
  userUsage: UserUsageRow[];
  filterOptions: {
    brands: BrandFilterOption[];
    users: UserFilterOption[];
  };
  isFiltered: boolean;
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

interface RawRow {
  created_at: string;
  brand_template_id: string | null;
  user_id: string | null;
  // For images:
  channel?: string | null;
}

interface RawData {
  scripts: RawRow[];
  carousels: RawRow[];
  multichannel: RawRow[];
  images: RawRow[];
  brandNames: Map<string, string>;
  userProfiles: Map<string, { fullName: string; email: string | null; avatarUrl: string | null }>;
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

  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('all');

  const rawQuery = useQuery({
    queryKey: ['subscription-report-raw', orgId, currentPeriod.start, currentPeriod.end],
    enabled: !!orgId && !!subscription,
    queryFn: async (): Promise<RawData> => {
      const empty: RawData = {
        scripts: [], carousels: [], multichannel: [], images: [],
        brandNames: new Map(), userProfiles: new Map(),
      };
      if (!orgId) return empty;
      const { start, end } = currentPeriod;

      const [scriptsRes, carouselsRes, multiRes] = await Promise.all([
        supabase.from('scripts').select('created_at, brand_template_id, user_id').eq('organization_id', orgId).gte('created_at', start).lte('created_at', end),
        supabase.from('carousels').select('created_at, brand_template_id, user_id').eq('organization_id', orgId).gte('created_at', start).lte('created_at', end),
        supabase.from('multi_channel_contents').select('id, created_at, brand_template_id, user_id').eq('organization_id', orgId).gte('created_at', start).lte('created_at', end),
      ]);

      const scripts: RawRow[] = (scriptsRes.data || []).map((r: any) => ({
        created_at: r.created_at, brand_template_id: r.brand_template_id, user_id: r.user_id,
      }));
      const carousels: RawRow[] = (carouselsRes.data || []).map((r: any) => ({
        created_at: r.created_at, brand_template_id: r.brand_template_id, user_id: r.user_id,
      }));
      const multiRowsFull = (multiRes.data || []) as Array<{ id: string; created_at: string; brand_template_id: string | null; user_id: string | null }>;
      const multichannel: RawRow[] = multiRowsFull.map((r) => ({
        created_at: r.created_at, brand_template_id: r.brand_template_id, user_id: r.user_id,
      }));

      const contentToBrand = new Map<string, string | null>();
      const contentToUser = new Map<string, string | null>();
      multiRowsFull.forEach((r) => {
        contentToBrand.set(r.id, r.brand_template_id);
        contentToUser.set(r.id, r.user_id);
      });

      // Fetch image rows in chunks
      let imageRaw: Array<{ created_at: string; channel: string | null; content_id: string; created_by: string | null }> = [];
      const contentIds = multiRowsFull.map((r) => r.id);
      if (contentIds.length > 0) {
        const chunkSize = 100;
        for (let i = 0; i < contentIds.length; i += chunkSize) {
          const chunk = contentIds.slice(i, i + chunkSize);
          const { data } = await supabase
            .from('channel_image_history')
            .select('created_at, channel, content_id, created_by')
            .in('content_id', chunk);
          if (data) imageRaw = imageRaw.concat(data as any);
        }
      }

      const images: RawRow[] = imageRaw.map((r) => ({
        created_at: r.created_at,
        channel: r.channel,
        brand_template_id: contentToBrand.get(r.content_id) ?? null,
        user_id: r.created_by ?? null,
      }));

      // Lookup brand names
      const allBrandIds = new Set<string>();
      [...scripts, ...carousels, ...multichannel, ...images].forEach((r) => {
        if (r.brand_template_id) allBrandIds.add(r.brand_template_id);
      });
      const brandNames = new Map<string, string>();
      if (allBrandIds.size > 0) {
        const { data: brands } = await supabase
          .from('brand_templates')
          .select('id, brand_name')
          .in('id', Array.from(allBrandIds));
        (brands || []).forEach((b: any) => {
          brandNames.set(b.id, b.brand_name || b.id.slice(0, 8));
        });
      }

      // Lookup user profiles
      const allUserIds = new Set<string>();
      [...scripts, ...carousels, ...multichannel, ...images].forEach((r) => {
        if (r.user_id) allUserIds.add(r.user_id);
      });
      const userProfiles = new Map<string, { fullName: string; email: string | null; avatarUrl: string | null }>();
      if (allUserIds.size > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url')
          .in('id', Array.from(allUserIds));
        (profiles || []).forEach((p: any) => {
          userProfiles.set(p.id, {
            fullName: p.full_name || p.email?.split('@')[0] || p.id.slice(0, 8),
            email: p.email ?? null,
            avatarUrl: p.avatar_url ?? null,
          });
        });
      }

      return { scripts, carousels, multichannel, images, brandNames, userProfiles };
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

  const data: SubscriptionReportData = useMemo(() => {
    const raw = rawQuery.data;
    const isFiltered = brandFilter !== 'all' || userFilter !== 'all';

    // Build filter options from raw data (unfiltered)
    const brandOpts: BrandFilterOption[] = [];
    const userOpts: UserFilterOption[] = [];
    if (raw) {
      const seenBrands = new Set<string>();
      const seenUsers = new Set<string>();
      [...raw.scripts, ...raw.carousels, ...raw.multichannel, ...raw.images].forEach((r) => {
        if (r.brand_template_id && !seenBrands.has(r.brand_template_id)) {
          seenBrands.add(r.brand_template_id);
          brandOpts.push({
            id: r.brand_template_id,
            name: raw.brandNames.get(r.brand_template_id) || r.brand_template_id.slice(0, 8),
          });
        }
        if (r.user_id && !seenUsers.has(r.user_id)) {
          seenUsers.add(r.user_id);
          const p = raw.userProfiles.get(r.user_id);
          userOpts.push({
            id: r.user_id,
            name: p?.fullName || r.user_id.slice(0, 8),
            avatarUrl: p?.avatarUrl ?? null,
          });
        }
      });
      brandOpts.sort((a, b) => a.name.localeCompare(b.name));
      userOpts.sort((a, b) => a.name.localeCompare(b.name));
    }

    const matchesFilter = (r: RawRow) => {
      if (brandFilter !== 'all' && r.brand_template_id !== brandFilter) return false;
      if (userFilter !== 'all' && r.user_id !== userFilter) return false;
      return true;
    };

    const filtered = raw ? {
      scripts: raw.scripts.filter(matchesFilter),
      carousels: raw.carousels.filter(matchesFilter),
      multichannel: raw.multichannel.filter(matchesFilter),
      images: raw.images.filter(matchesFilter),
    } : { scripts: [], carousels: [], multichannel: [], images: [] };

    // Daily series
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
    filtered.scripts.forEach((r) => { ensureDay(r.created_at).scripts += 1; });
    filtered.carousels.forEach((r) => { ensureDay(r.created_at).carousels += 1; });
    filtered.multichannel.forEach((r) => { ensureDay(r.created_at).multichannel += 1; });
    filtered.images.forEach((r) => { ensureDay(r.created_at).images += 1; });

    if (periodStart && periodEnd) {
      const today = new Date();
      const fillEnd = periodEnd < today ? periodEnd : today;
      const cursor = new Date(periodStart.getFullYear(), periodStart.getMonth(), periodStart.getDate());
      const finalEnd = new Date(fillEnd.getFullYear(), fillEnd.getMonth(), fillEnd.getDate());
      while (cursor <= finalEnd) {
        const iso = cursor.toISOString().slice(0, 10);
        if (!dayMap.has(iso)) {
          dayMap.set(iso, { date: iso, scripts: 0, carousels: 0, multichannel: 0, images: 0 });
        }
        cursor.setDate(cursor.getDate() + 1);
      }
    }
    const dailySeries = Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    // Image channel breakdown
    const breakdownMap = new Map<string, number>();
    filtered.images.forEach((r) => {
      const ch = r.channel || 'other';
      breakdownMap.set(ch, (breakdownMap.get(ch) || 0) + 1);
    });
    const imageChannelBreakdown = Array.from(breakdownMap.entries())
      .map(([channel, count]) => ({ channel, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // Brand usage
    const brandMap = new Map<string, BrandUsageRow>();
    const ensureBrand = (id: string | null): BrandUsageRow | null => {
      if (!id) return null;
      let row = brandMap.get(id);
      if (!row) {
        const name = raw?.brandNames.get(id) || id.slice(0, 8);
        row = { brandId: id, brandName: name, scripts: 0, carousels: 0, multichannel: 0, images: 0, total: 0 };
        brandMap.set(id, row);
      }
      return row;
    };
    filtered.scripts.forEach((r) => { const b = ensureBrand(r.brand_template_id); if (b) { b.scripts += 1; b.total += 1; } });
    filtered.carousels.forEach((r) => { const b = ensureBrand(r.brand_template_id); if (b) { b.carousels += 1; b.total += 1; } });
    filtered.multichannel.forEach((r) => { const b = ensureBrand(r.brand_template_id); if (b) { b.multichannel += 1; b.total += 1; } });
    filtered.images.forEach((r) => { const b = ensureBrand(r.brand_template_id); if (b) { b.images += 1; b.total += 1; } });

    // User usage
    const userMap = new Map<string, UserUsageRow>();
    const ensureUser = (id: string | null): UserUsageRow | null => {
      if (!id) return null;
      let row = userMap.get(id);
      if (!row) {
        const p = raw?.userProfiles.get(id);
        row = {
          userId: id,
          fullName: p?.fullName || id.slice(0, 8),
          email: p?.email ?? null,
          avatarUrl: p?.avatarUrl ?? null,
          scripts: 0, carousels: 0, multichannel: 0, images: 0, total: 0,
        };
        userMap.set(id, row);
      }
      return row;
    };
    filtered.scripts.forEach((r) => { const u = ensureUser(r.user_id); if (u) { u.scripts += 1; u.total += 1; } });
    filtered.carousels.forEach((r) => { const u = ensureUser(r.user_id); if (u) { u.carousels += 1; u.total += 1; } });
    filtered.multichannel.forEach((r) => { const u = ensureUser(r.user_id); if (u) { u.multichannel += 1; u.total += 1; } });
    filtered.images.forEach((r) => { const u = ensureUser(r.user_id); if (u) { u.images += 1; u.total += 1; } });

    const brandUsage = Array.from(brandMap.values()).sort((a, b) => b.total - a.total).slice(0, 10);
    const userUsage = Array.from(userMap.values()).sort((a, b) => b.total - a.total).slice(0, 10);

    // Quotas — use filtered counts when filter active, otherwise org-wide from useSubscription
    const buildQuotas = (): QuotaItem[] => {
      if (!currentPlanLimits) return [];
      const used = isFiltered ? {
        scripts: filtered.scripts.length,
        carousels: filtered.carousels.length,
        multichannel: filtered.multichannel.length,
        images: filtered.images.length,
      } : (usage ? {
        scripts: usage.scripts,
        carousels: usage.carousels,
        multichannel: usage.multichannel,
        images: usage.images,
      } : null);
      if (!used) return [];

      const items: Array<{ key: QuotaKey; used: number; limit: number }> = [
        { key: 'scripts', used: used.scripts, limit: currentPlanLimits.monthly_scripts },
        { key: 'carousels', used: used.carousels, limit: currentPlanLimits.monthly_carousels },
        { key: 'multichannel', used: used.multichannel, limit: currentPlanLimits.monthly_multichannel },
        { key: 'images', used: used.images, limit: currentPlanLimits.monthly_images },
      ];
      return items.map(({ key, used, limit }) => {
        const status = buildStatus(used, limit);
        const pct = limit === -1 ? 0 : Math.min(100, Math.round((used / Math.max(1, limit)) * 100));
        const remaining = limit === -1 ? Infinity : Math.max(0, limit - used);
        let projectedExhaustionDate: Date | null = null;
        if (!isFiltered && limit !== -1 && remaining > 0 && daysElapsedInPeriod > 0 && periodEnd) {
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
          key, label: QUOTA_LABELS[key], used, limit, pct, status, remaining, projectedExhaustionDate,
        };
      });
    };

    const quotas = buildQuotas();
    const warnings = isFiltered ? [] : quotas.filter((q) => q.status === 'warning' || q.status === 'critical' || q.status === 'exhausted');

    return {
      hasSubscription: !!subscription,
      planType: subscription?.plan_type ?? null,
      status: subscription?.status ?? null,
      periodStart,
      periodEnd,
      daysRemainingInPeriod,
      daysElapsedInPeriod,
      totalDaysInPeriod,
      quotas,
      dailySeries,
      imageChannelBreakdown,
      warnings,
      brandUsage,
      userUsage,
      filterOptions: { brands: brandOpts, users: userOpts },
      isFiltered,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawQuery.data, brandFilter, userFilter, currentPlanLimits, usage, subscription, periodStart?.getTime(), periodEnd?.getTime(), daysElapsedInPeriod, totalDaysInPeriod, daysRemainingInPeriod]);

  return {
    data,
    activeAddons,
    isLoading: subLoading || rawQuery.isLoading,
    refetch: () => {
      refetchSubscription();
      rawQuery.refetch();
    },
    brandFilter,
    setBrandFilter,
    userFilter,
    setUserFilter,
  };
}
