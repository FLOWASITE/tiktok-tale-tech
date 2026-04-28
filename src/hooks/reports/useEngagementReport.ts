import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ReportFilters } from './useReportFilters';
import { bucketRows, fillBucketGaps, type BucketType } from '@/lib/reports/aggregators';

export interface EngagementOptions {
  overrideRange?: { from: Date; to: Date } | null;
  bucket?: BucketType;
}

export interface EngagementReportData {
  totalReach: number;
  totalImpressions: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalSaves: number;
  totalVideoViews: number;
  engagementRate: number; // (likes+comments+shares) / impressions
  postsTracked: number;
  byPlatform: { platform: string; reach: number; impressions: number; likes: number; comments: number; shares: number; posts: number }[];
  byDay: { date: string; reach: number; engagement: number }[];
  topPosts: {
    post_id: string;
    platform: string;
    content_id: string | null;
    reach: number;
    likes: number;
    comments: number;
    shares: number;
    snapshot_at: string;
  }[];
  lastSyncedAt: string | null;
}

export function useEngagementReport(orgId: string | null, filters: ReportFilters) {
  return useQuery({
    queryKey: ['report-engagement', orgId, filters.dateFrom.toISOString(), filters.dateTo.toISOString(), filters.brandId, filters.channel],
    enabled: !!orgId,
    queryFn: async (): Promise<EngagementReportData> => {
      // Fetch latest snapshot per post within range
      let q = supabase
        .from('social_post_metrics')
        .select('post_id, platform, content_id, reach, impressions, likes, comments, shares, saves, video_views, snapshot_at, brand_template_id')
        .eq('organization_id', orgId!)
        .gte('snapshot_at', filters.dateFrom.toISOString())
        .lte('snapshot_at', filters.dateTo.toISOString())
        .order('snapshot_at', { ascending: false })
        .limit(2000);

      if (filters.channel) q = q.eq('platform', filters.channel);
      if (filters.brandId) q = q.eq('brand_template_id', filters.brandId);

      const { data, error } = await q;
      if (error) throw error;

      const rows = data ?? [];

      // Latest snapshot per (platform, post_id)
      const latestMap = new Map<string, typeof rows[number]>();
      for (const r of rows) {
        const k = `${r.platform}::${r.post_id}`;
        if (!latestMap.has(k)) latestMap.set(k, r);
      }
      const latest = Array.from(latestMap.values());

      const sum = (key: keyof typeof latest[number]) =>
        latest.reduce((acc, r) => acc + ((r[key] as number) ?? 0), 0);

      const totalReach = sum('reach');
      const totalImpressions = sum('impressions');
      const totalLikes = sum('likes');
      const totalComments = sum('comments');
      const totalShares = sum('shares');
      const totalSaves = sum('saves');
      const totalVideoViews = sum('video_views');
      const engagementRate = totalImpressions > 0
        ? Number((((totalLikes + totalComments + totalShares) / totalImpressions) * 100).toFixed(2))
        : 0;

      // By platform
      const platformMap = new Map<string, { reach: number; impressions: number; likes: number; comments: number; shares: number; posts: number }>();
      for (const r of latest) {
        const p = (r.platform as string) ?? 'unknown';
        const cur = platformMap.get(p) ?? { reach: 0, impressions: 0, likes: 0, comments: 0, shares: 0, posts: 0 };
        cur.reach += r.reach ?? 0;
        cur.impressions += r.impressions ?? 0;
        cur.likes += r.likes ?? 0;
        cur.comments += r.comments ?? 0;
        cur.shares += r.shares ?? 0;
        cur.posts += 1;
        platformMap.set(p, cur);
      }
      const byPlatform = [...platformMap.entries()]
        .map(([platform, v]) => ({ platform, ...v }))
        .sort((a, b) => b.reach - a.reach);

      // By day (use ALL rows for trend, not just latest)
      const dayMap = bucketByDay(rows, (r) => r.snapshot_at as string);
      const reachMap = new Map<string, number>();
      const engMap = new Map<string, number>();
      for (const [k, vals] of dayMap) {
        reachMap.set(k, vals.reduce((a, x) => a + (x.reach ?? 0), 0));
        engMap.set(k, vals.reduce((a, x) => a + ((x.likes ?? 0) + (x.comments ?? 0) + (x.shares ?? 0)), 0));
      }
      const reachSeries = fillDateGaps(filters.dateFrom, filters.dateTo, reachMap);
      const engSeries = fillDateGaps(filters.dateFrom, filters.dateTo, engMap);
      const byDay = reachSeries.map((p, i) => ({
        date: p.date,
        reach: p.value,
        engagement: engSeries[i]?.value ?? 0,
      }));

      // Top posts (by reach + engagement)
      const topPosts = [...latest]
        .map((r) => ({
          post_id: r.post_id as string,
          platform: r.platform as string,
          content_id: (r.content_id as string) ?? null,
          reach: r.reach ?? 0,
          likes: r.likes ?? 0,
          comments: r.comments ?? 0,
          shares: r.shares ?? 0,
          snapshot_at: r.snapshot_at as string,
        }))
        .sort((a, b) => (b.reach + b.likes * 2 + b.comments * 3) - (a.reach + a.likes * 2 + a.comments * 3))
        .slice(0, 10);

      const lastSyncedAt = latest.length
        ? latest.map((r) => r.snapshot_at as string).sort().reverse()[0]
        : null;

      return {
        totalReach,
        totalImpressions,
        totalLikes,
        totalComments,
        totalShares,
        totalSaves,
        totalVideoViews,
        engagementRate,
        postsTracked: latest.length,
        byPlatform,
        byDay,
        topPosts,
        lastSyncedAt,
      };
    },
  });
}

export function useTriggerEngagementSync(orgId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('sync-social-engagement', {
        body: { organization_id: orgId },
      });
      if (error) throw error;
      return data as { ok: boolean; total: number; success: number; failed: number; skipped: number };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['report-engagement'] });
    },
  });
}
