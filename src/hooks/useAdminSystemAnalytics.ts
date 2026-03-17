import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type PeriodFilter = '7d' | '30d' | '90d' | 'this_month' | 'last_month';

function getPeriodDates(period: PeriodFilter) {
  const now = new Date();
  let start: Date;
  let end = now;
  let prevStart: Date;
  let prevEnd: Date;

  switch (period) {
    case '7d':
      start = new Date(now.getTime() - 7 * 86400000);
      prevStart = new Date(start.getTime() - 7 * 86400000);
      prevEnd = new Date(start.getTime() - 1);
      break;
    case '30d':
      start = new Date(now.getTime() - 30 * 86400000);
      prevStart = new Date(start.getTime() - 30 * 86400000);
      prevEnd = new Date(start.getTime() - 1);
      break;
    case '90d':
      start = new Date(now.getTime() - 90 * 86400000);
      prevStart = new Date(start.getTime() - 90 * 86400000);
      prevEnd = new Date(start.getTime() - 1);
      break;
    case 'this_month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      prevEnd = new Date(start.getTime() - 1);
      break;
    case 'last_month':
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      prevStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      prevEnd = new Date(start.getTime() - 1);
      break;
    default:
      start = new Date(now.getTime() - 30 * 86400000);
      prevStart = new Date(start.getTime() - 30 * 86400000);
      prevEnd = new Date(start.getTime() - 1);
  }

  return {
    start: start.toISOString(),
    end: end.toISOString(),
    prevStart: prevStart.toISOString(),
    prevEnd: prevEnd.toISOString(),
  };
}

export interface KPISummary {
  totalContents: number;
  totalSocialPosts: number;
  totalAIImages: number;
  totalNewUsers: number;
  prevContents: number;
  prevSocialPosts: number;
  prevAIImages: number;
  prevNewUsers: number;
}

export interface OrgRanking {
  id: string;
  name: string;
  memberCount: number;
  contentCount: number;
  socialPosts: number;
  aiImages: number;
}

export interface UserRanking {
  id: string;
  fullName: string | null;
  email: string | null;
  avatarUrl: string | null;
  orgName: string | null;
  contentCount: number;
  socialPosts: number;
  aiImages: number;
}

export interface DailyTrend {
  date: string;
  contents: number;
  images: number;
}

export interface ChannelDist {
  channel: string;
  count: number;
}

export interface PlanDist {
  plan: string;
  count: number;
}

export interface AIUsageSummary {
  totalRequests: number;
  totalCost: number;
  avgCostPerRequest: number;
  topModels: { model: string; count: number }[];
}

export function useAdminSystemAnalytics(period: PeriodFilter) {
  const dates = getPeriodDates(period);

  // KPI Summary
  const kpiQuery = useQuery({
    queryKey: ['admin-analytics-kpi', period],
    queryFn: async (): Promise<KPISummary> => {
      // Current period contents
      const { data: contents } = await supabase
        .from('multi_channel_contents')
        .select('id, selected_channels')
        .gte('created_at', dates.start)
        .lte('created_at', dates.end);

      // Previous period contents
      const { data: prevContents } = await supabase
        .from('multi_channel_contents')
        .select('id, selected_channels')
        .gte('created_at', dates.prevStart)
        .lte('created_at', dates.prevEnd);

      // Current AI images
      const { count: imgCount } = await supabase
        .from('channel_image_history')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', dates.start)
        .lte('created_at', dates.end);

      // Previous AI images
      const { count: prevImgCount } = await supabase
        .from('channel_image_history')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', dates.prevStart)
        .lte('created_at', dates.prevEnd);

      // Current new users
      const { count: newUsers } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', dates.start)
        .lte('created_at', dates.end);

      // Previous new users
      const { count: prevNewUsers } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', dates.prevStart)
        .lte('created_at', dates.prevEnd);

      const rows = contents || [];
      const prevRows = prevContents || [];

      const socialPosts = rows.reduce((sum, r) => sum + (Array.isArray(r.selected_channels) ? r.selected_channels.length : 0), 0);
      const prevSocialPosts = prevRows.reduce((sum, r) => sum + (Array.isArray(r.selected_channels) ? r.selected_channels.length : 0), 0);

      return {
        totalContents: rows.length,
        totalSocialPosts: socialPosts,
        totalAIImages: imgCount || 0,
        totalNewUsers: newUsers || 0,
        prevContents: prevRows.length,
        prevSocialPosts: prevSocialPosts,
        prevAIImages: prevImgCount || 0,
        prevNewUsers: prevNewUsers || 0,
      };
    },
    staleTime: 60000,
  });

  // Daily trend
  const trendQuery = useQuery({
    queryKey: ['admin-analytics-trend', period],
    queryFn: async (): Promise<DailyTrend[]> => {
      const { data: contents } = await supabase
        .from('multi_channel_contents')
        .select('created_at')
        .gte('created_at', dates.start)
        .lte('created_at', dates.end);

      const { data: images } = await supabase
        .from('channel_image_history')
        .select('created_at')
        .gte('created_at', dates.start)
        .lte('created_at', dates.end);

      const byDay: Record<string, { contents: number; images: number }> = {};
      (contents || []).forEach(c => {
        const d = c.created_at?.split('T')[0] || '';
        if (!byDay[d]) byDay[d] = { contents: 0, images: 0 };
        byDay[d].contents++;
      });
      (images || []).forEach(i => {
        const d = i.created_at?.split('T')[0] || '';
        if (!byDay[d]) byDay[d] = { contents: 0, images: 0 };
        byDay[d].images++;
      });

      const startDate = new Date(dates.start);
      const endDate = new Date(dates.end);
      const result: DailyTrend[] = [];
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().split('T')[0];
        result.push({ date: key, contents: byDay[key]?.contents || 0, images: byDay[key]?.images || 0 });
      }
      return result;
    },
    staleTime: 60000,
  });

  // Org ranking
  const orgQuery = useQuery({
    queryKey: ['admin-analytics-orgs', period],
    queryFn: async (): Promise<OrgRanking[]> => {
      const [{ data: orgs }, { data: members }, { data: contents }, { data: images }] = await Promise.all([
        supabase.from('organizations').select('id, name'),
        supabase.from('organization_members').select('organization_id'),
        supabase.from('multi_channel_contents').select('id, organization_id, selected_channels').gte('created_at', dates.start).lte('created_at', dates.end),
        supabase.from('channel_image_history').select('id, content_id').gte('created_at', dates.start).lte('created_at', dates.end),
      ]);

      // Map content_id -> org_id
      const contentOrgMap: Record<string, string> = {};
      (contents || []).forEach(c => { if (c.organization_id) contentOrgMap[c.id] = c.organization_id; });

      const orgMap: Record<string, OrgRanking> = {};
      (orgs || []).forEach(o => {
        orgMap[o.id] = { id: o.id, name: o.name, memberCount: 0, contentCount: 0, socialPosts: 0, aiImages: 0 };
      });

      (members || []).forEach(m => {
        if (orgMap[m.organization_id]) orgMap[m.organization_id].memberCount++;
      });

      (contents || []).forEach(c => {
        if (c.organization_id && orgMap[c.organization_id]) {
          orgMap[c.organization_id].contentCount++;
          orgMap[c.organization_id].socialPosts += Array.isArray(c.selected_channels) ? c.selected_channels.length : 0;
        }
      });

      (images || []).forEach(img => {
        const orgId = contentOrgMap[img.content_id];
        if (orgId && orgMap[orgId]) orgMap[orgId].aiImages++;
      });

      return Object.values(orgMap)
        .filter(o => o.contentCount > 0 || o.aiImages > 0)
        .sort((a, b) => (b.contentCount + b.aiImages) - (a.contentCount + a.aiImages));
    },
    staleTime: 60000,
  });

  // Top users
  const userQuery = useQuery({
    queryKey: ['admin-analytics-users', period],
    queryFn: async (): Promise<UserRanking[]> => {
      const [{ data: contents }, { data: images }, { data: profiles }, { data: members }, { data: orgs }] = await Promise.all([
        supabase.from('multi_channel_contents').select('id, user_id, selected_channels').gte('created_at', dates.start).lte('created_at', dates.end),
        supabase.from('channel_image_history').select('id, content_id').gte('created_at', dates.start).lte('created_at', dates.end),
        supabase.from('profiles').select('id, full_name, email, avatar_url'),
        supabase.from('organization_members').select('user_id, organization_id'),
        supabase.from('organizations').select('id, name'),
      ]);

      const contentUserMap: Record<string, string> = {};
      const userStats: Record<string, { contentCount: number; socialPosts: number; aiImages: number }> = {};

      (contents || []).forEach(c => {
        if (!c.user_id) return;
        contentUserMap[c.id] = c.user_id;
        if (!userStats[c.user_id]) userStats[c.user_id] = { contentCount: 0, socialPosts: 0, aiImages: 0 };
        userStats[c.user_id].contentCount++;
        userStats[c.user_id].socialPosts += Array.isArray(c.selected_channels) ? c.selected_channels.length : 0;
      });

      (images || []).forEach(img => {
        const userId = contentUserMap[img.content_id];
        if (userId) {
          if (!userStats[userId]) userStats[userId] = { contentCount: 0, socialPosts: 0, aiImages: 0 };
          userStats[userId].aiImages++;
        }
      });


      const profileMap: Record<string, { fullName: string | null; email: string | null; avatarUrl: string | null }> = {};
      (profiles || []).forEach(p => { profileMap[p.id] = { fullName: p.full_name, email: p.email, avatarUrl: p.avatar_url }; });

      const orgNameMap: Record<string, string> = {};
      (orgs || []).forEach(o => { orgNameMap[o.id] = o.name; });

      const userOrgMap: Record<string, string> = {};
      (members || []).forEach(m => { if (!userOrgMap[m.user_id]) userOrgMap[m.user_id] = orgNameMap[m.organization_id] || ''; });

      return Object.entries(userStats)
        .map(([userId, stats]) => ({
          id: userId,
          fullName: profileMap[userId]?.fullName || null,
          email: profileMap[userId]?.email || null,
          avatarUrl: profileMap[userId]?.avatarUrl || null,
          orgName: userOrgMap[userId] || null,
          ...stats,
        }))
        .sort((a, b) => (b.contentCount + b.aiImages) - (a.contentCount + a.aiImages))
        .slice(0, 20);
    },
    staleTime: 60000,
  });

  // Channel distribution
  const channelQuery = useQuery({
    queryKey: ['admin-analytics-channels', period],
    queryFn: async (): Promise<{ socialByChannel: ChannelDist[]; imageByChannel: ChannelDist[] }> => {
      const [{ data: contents }, { data: images }] = await Promise.all([
        supabase.from('multi_channel_contents').select('selected_channels').gte('created_at', dates.start).lte('created_at', dates.end),
        supabase.from('channel_image_history').select('channel').gte('created_at', dates.start).lte('created_at', dates.end),
      ]);

      const socialMap: Record<string, number> = {};
      (contents || []).forEach(c => {
        if (Array.isArray(c.selected_channels)) {
          c.selected_channels.forEach((ch: string) => { socialMap[ch] = (socialMap[ch] || 0) + 1; });
        }
      });

      const imgMap: Record<string, number> = {};
      (images || []).forEach(i => { if (i.channel) imgMap[i.channel] = (imgMap[i.channel] || 0) + 1; });

      return {
        socialByChannel: Object.entries(socialMap).map(([channel, count]) => ({ channel, count })).sort((a, b) => b.count - a.count),
        imageByChannel: Object.entries(imgMap).map(([channel, count]) => ({ channel, count })).sort((a, b) => b.count - a.count),
      };
    },
    staleTime: 60000,
  });

  // System growth
  const growthQuery = useQuery({
    queryKey: ['admin-analytics-growth', period],
    queryFn: async (): Promise<{ usersByDay: DailyTrend[]; planDist: PlanDist[]; totalOrgs: number; activeOrgs: number }> => {
      const [{ data: profiles }, { data: subs }, { data: orgs }, { data: activeContents }] = await Promise.all([
        supabase.from('profiles').select('created_at').gte('created_at', dates.start).lte('created_at', dates.end),
        supabase.from('subscriptions').select('plan_type, status').eq('status', 'active'),
        supabase.from('organizations').select('id'),
        supabase.from('multi_channel_contents').select('organization_id').gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString()),
      ]);

      const byDay: Record<string, number> = {};
      (profiles || []).forEach(p => {
        const d = p.created_at?.split('T')[0] || '';
        byDay[d] = (byDay[d] || 0) + 1;
      });

      const startDate = new Date(dates.start);
      const endDate = new Date(dates.end);
      const usersByDay: DailyTrend[] = [];
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().split('T')[0];
        usersByDay.push({ date: key, contents: byDay[key] || 0, images: 0 });
      }

      const planMap: Record<string, number> = {};
      (subs || []).forEach(s => { planMap[s.plan_type] = (planMap[s.plan_type] || 0) + 1; });
      const planDist = Object.entries(planMap).map(([plan, count]) => ({ plan, count }));

      const activeOrgIds = new Set((activeContents || []).map(c => c.organization_id).filter(Boolean));

      return {
        usersByDay,
        planDist,
        totalOrgs: (orgs || []).length,
        activeOrgs: activeOrgIds.size,
      };
    },
    staleTime: 60000,
  });

  // AI usage summary
  const aiQuery = useQuery({
    queryKey: ['admin-analytics-ai', period],
    queryFn: async (): Promise<AIUsageSummary> => {
      const { data: metrics } = await supabase
        .from('ai_metrics')
        .select('estimated_cost_usd, models_used, function_name')
        .gte('created_at', dates.start)
        .lte('created_at', dates.end);

      const rows = metrics || [];
      const totalCost = rows.reduce((sum, m) => sum + (m.estimated_cost_usd || 0), 0);

      const modelCount: Record<string, number> = {};
      rows.forEach(m => {
        if (m.models_used && typeof m.models_used === 'object') {
          const models = Array.isArray(m.models_used) ? m.models_used : [m.models_used];
          models.forEach((mod: any) => {
            const name = typeof mod === 'string' ? mod : mod?.model || mod?.name || 'unknown';
            modelCount[name] = (modelCount[name] || 0) + 1;
          });
        }
      });

      const topModels = Object.entries(modelCount)
        .map(([model, count]) => ({ model, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        totalRequests: rows.length,
        totalCost: Math.round(totalCost * 100) / 100,
        avgCostPerRequest: rows.length > 0 ? Math.round((totalCost / rows.length) * 10000) / 10000 : 0,
        topModels,
      };
    },
    staleTime: 60000,
  });

  return {
    kpi: kpiQuery.data,
    trend: trendQuery.data,
    orgs: orgQuery.data,
    users: userQuery.data,
    channels: channelQuery.data,
    growth: growthQuery.data,
    ai: aiQuery.data,
    isLoading: kpiQuery.isLoading || trendQuery.isLoading,
    refetch: () => {
      kpiQuery.refetch();
      trendQuery.refetch();
      orgQuery.refetch();
      userQuery.refetch();
      channelQuery.refetch();
      growthQuery.refetch();
      aiQuery.refetch();
    },
  };
}
