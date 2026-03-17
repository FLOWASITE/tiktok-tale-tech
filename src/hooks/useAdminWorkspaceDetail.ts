import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PeriodFilter = "all" | "current" | "previous";

export interface WorkspaceMember {
  id: string;
  user_id: string;
  role: string;
  joined_at: string | null;
  profile: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
}

export interface WorkspaceBrand {
  id: string;
  brand_name: string;
  logo_url: string | null;
  industry: string | null;
  content_count: number;
  image_count: number;
  created_at: string | null;
}

export interface WorkspaceContentStats {
  multiChannelCount: number;
  socialPostCount: number;
  carouselCount: number;
  carouselImageCount: number;
  imageCount: number;
  scriptCount: number;
}

export interface MemberContribution {
  userId: string;
  contentCount: number;
  imageCount: number;
  carouselCount: number;
  scriptCount: number;
  profile: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
}

export interface WorkspacePeriodInfo {
  start: string | null;
  end: string | null;
}

async function getWorkspacePeriod(orgId: string): Promise<WorkspacePeriodInfo> {
  const { data } = await supabase
    .from("subscriptions")
    .select("current_period_start, current_period_end")
    .eq("organization_id", orgId)
    .maybeSingle();

  if (!data) return { start: null, end: null };
  return { start: data.current_period_start, end: data.current_period_end };
}

function getDateRange(period: WorkspacePeriodInfo, filter: PeriodFilter): { start?: string; end?: string } {
  if (filter === "all" || !period.start || !period.end) return {};

  if (filter === "current") {
    const now = new Date();
    const periodEnd = new Date(period.end);
    if (periodEnd < now) {
      // Fallback to current month
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      const e = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { start: s.toISOString(), end: e.toISOString() };
    }
    return { start: period.start, end: period.end };
  }

  // previous: everything before current_period_start
  const now = new Date();
  const periodEnd = new Date(period.end);
  if (periodEnd < now) {
    // Period expired, "previous" = everything before current month start
    const s = new Date(now.getFullYear(), now.getMonth(), 1);
    return { end: s.toISOString() };
  }
  return { end: period.start };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyDateFilter<T>(query: T, range: { start?: string; end?: string }): T {
  let q = query as any;
  if (range.start) q = q.gte("created_at", range.start);
  if (range.end) q = q.lte("created_at", range.end);
  return q as T;
}

export function useAdminWorkspaceDetail(orgId: string | null, periodFilter: PeriodFilter = "all") {
  const periodQuery = useQuery({
    queryKey: ["admin_workspace_period", orgId],
    queryFn: () => getWorkspacePeriod(orgId!),
    enabled: !!orgId && periodFilter !== "all",
  });

  const membersQuery = useQuery({
    queryKey: ["admin_workspace_members", orgId],
    queryFn: async (): Promise<WorkspaceMember[]> => {
      const { data, error } = await supabase
        .from("organization_members")
        .select("id, user_id, role, joined_at")
        .eq("organization_id", orgId!);
      if (error) throw error;

      const userIds = data.map((m) => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .in("id", userIds);

      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

      return data.map((m) => ({
        ...m,
        profile: profileMap.get(m.user_id) || null,
      }));
    },
    enabled: !!orgId,
  });

  const brandsQuery = useQuery({
    queryKey: ["admin_workspace_brands", orgId],
    queryFn: async (): Promise<WorkspaceBrand[]> => {
      const { data, error } = await supabase
        .from("brand_templates")
        .select("id, brand_name, logo_url, industry_template_id, created_at")
        .eq("organization_id", orgId!);
      if (error) throw error;

      const industryIds = [...new Set(data.filter((b) => b.industry_template_id).map((b) => b.industry_template_id!))];
      let industryMap = new Map<string, string>();
      if (industryIds.length > 0) {
        const { data: industries } = await supabase
          .from("industry_templates")
          .select("id, code")
          .in("id", industryIds);
        industryMap = new Map((industries || []).map((i) => [i.id, i.code]));
      }

      // Fetch content counts per brand
      const brandIds = data.map((b) => b.id);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const contentQ2 = supabase.from("multi_channel_contents").select("brand_template_id").eq("organization_id", orgId!) as any;
      const { data: contentRows } = await contentQ2.in("brand_template_id", brandIds);

      // Ảnh không có brand_template_id trực tiếp, lấy qua relation content_id -> multi_channel_contents.brand_template_id
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: imageRows } = await (supabase
        .from("channel_image_history")
        .select("content:multi_channel_contents(brand_template_id)")
        .eq("organization_id", orgId!) as any);

      const contentByBrand: Record<string, number> = {};
      const imageByBrand: Record<string, number> = {};
      (contentRows || []).forEach((r: any) => {
        if (r.brand_template_id) contentByBrand[r.brand_template_id] = (contentByBrand[r.brand_template_id] || 0) + 1;
      });
      (imageRows || []).forEach((r: any) => {
        const related = Array.isArray(r.content) ? r.content[0] : r.content;
        const brandTemplateId = related?.brand_template_id;
        if (brandTemplateId) imageByBrand[brandTemplateId] = (imageByBrand[brandTemplateId] || 0) + 1;
      });

      return data.map((b) => ({
        id: b.id,
        brand_name: b.brand_name,
        logo_url: b.logo_url,
        industry: b.industry_template_id ? industryMap.get(b.industry_template_id) || null : null,
        content_count: contentByBrand[b.id] || 0,
        image_count: imageByBrand[b.id] || 0,
        created_at: b.created_at,
      }));
    },
    enabled: !!orgId,
  });

  const canQueryStats = !!orgId && (periodFilter === "all" || !!periodQuery.data);

  const statsQuery = useQuery({
    queryKey: ["admin_workspace_content_stats", orgId, periodFilter, periodQuery.data],
    queryFn: async (): Promise<WorkspaceContentStats> => {
      const range = periodFilter === "all" ? {} : getDateRange(periodQuery.data!, periodFilter);

      // multi_channel_contents needs selected_channels data
      let mcQuery = supabase.from("multi_channel_contents").select("id, selected_channels").eq("organization_id", orgId!);
      mcQuery = applyDateFilter(mcQuery, range);

      let carQuery = supabase.from("carousels").select("id", { count: "exact", head: true }).eq("organization_id", orgId!);
      carQuery = applyDateFilter(carQuery, range);

      let imgQuery = supabase.from("channel_image_history").select("id", { count: "exact", head: true }).eq("organization_id", orgId!);
      imgQuery = applyDateFilter(imgQuery, range);

      let scriptQuery = supabase.from("scripts").select("id", { count: "exact", head: true }).eq("organization_id", orgId!);
      scriptQuery = applyDateFilter(scriptQuery, range);

      let carImgQuery = supabase.from("carousel_images").select("id", { count: "exact", head: true }).eq("organization_id", orgId!);
      carImgQuery = applyDateFilter(carImgQuery, range);

      const [mcRes, carRes, imgRes, scriptRes, carImgRes] = await Promise.all([
        mcQuery, carQuery, imgQuery, scriptQuery, carImgQuery,
      ]);

      const contents = mcRes.data || [];
      const socialPostCount = contents.reduce((sum, row) => {
        const channels = (row as any).selected_channels;
        return sum + (Array.isArray(channels) ? channels.length : 0);
      }, 0);

      return {
        multiChannelCount: contents.length,
        socialPostCount,
        carouselCount: carRes.count || 0,
        carouselImageCount: carImgRes.count || 0,
        imageCount: imgRes.count || 0,
        scriptCount: scriptRes.count || 0,
      };
    },
    enabled: canQueryStats,
  });

  const contributionsQuery = useQuery({
    queryKey: ["admin_workspace_contributions", orgId, periodFilter, periodQuery.data],
    queryFn: async (): Promise<MemberContribution[]> => {
      const range = periodFilter === "all" ? {} : getDateRange(periodQuery.data!, periodFilter);

      let contentsQ = supabase.from("multi_channel_contents").select("user_id").eq("organization_id", orgId!);
      contentsQ = applyDateFilter(contentsQ, range);
      const { data: contents } = await contentsQ;

      let imagesQ = supabase.from("channel_image_history").select("created_by, content:multi_channel_contents(user_id)").eq("organization_id", orgId!);
      imagesQ = applyDateFilter(imagesQ, range);
      const { data: images } = await imagesQ;

      let carouselsQ = supabase.from("carousels").select("user_id").eq("organization_id", orgId!);
      carouselsQ = applyDateFilter(carouselsQ, range);
      const { data: carousels } = await carouselsQ;

      let scriptsQ = supabase.from("scripts").select("user_id").eq("organization_id", orgId!);
      scriptsQ = applyDateFilter(scriptsQ, range);
      const { data: scripts } = await scriptsQ;

      const contentByUser: Record<string, number> = {};
      const imageByUser: Record<string, number> = {};
      const carouselByUser: Record<string, number> = {};
      const scriptByUser: Record<string, number> = {};
      const allUserIds = new Set<string>();

      (contents || []).forEach((r: any) => {
        if (r.user_id) { allUserIds.add(r.user_id); contentByUser[r.user_id] = (contentByUser[r.user_id] || 0) + 1; }
      });
      (images || []).forEach((r: any) => {
        const related = Array.isArray(r.content) ? r.content[0] : r.content;
        const imageUserId = r.created_by || related?.user_id;
        if (imageUserId) { allUserIds.add(imageUserId); imageByUser[imageUserId] = (imageByUser[imageUserId] || 0) + 1; }
      });
      (carousels || []).forEach((r: any) => {
        if (r.user_id) { allUserIds.add(r.user_id); carouselByUser[r.user_id] = (carouselByUser[r.user_id] || 0) + 1; }
      });
      (scripts || []).forEach((r: any) => {
        if (r.user_id) { allUserIds.add(r.user_id); scriptByUser[r.user_id] = (scriptByUser[r.user_id] || 0) + 1; }
      });

      if (allUserIds.size === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .in("id", [...allUserIds]);

      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

      return [...allUserIds]
        .map((userId) => ({
          userId,
          contentCount: contentByUser[userId] || 0,
          imageCount: imageByUser[userId] || 0,
          carouselCount: carouselByUser[userId] || 0,
          scriptCount: scriptByUser[userId] || 0,
          profile: profileMap.get(userId) || null,
        }))
        .sort((a, b) => (b.contentCount + b.imageCount + b.carouselCount + b.scriptCount) - (a.contentCount + a.imageCount + a.carouselCount + a.scriptCount));
    },
    enabled: canQueryStats,
  });

  return {
    members: membersQuery.data || [],
    brands: brandsQuery.data || [],
    contentStats: statsQuery.data || { multiChannelCount: 0, socialPostCount: 0, carouselCount: 0, carouselImageCount: 0, imageCount: 0, scriptCount: 0 },
    contributions: contributionsQuery.data || [],
    periodInfo: periodQuery.data || null,
    isLoading: membersQuery.isLoading || brandsQuery.isLoading || statsQuery.isLoading || contributionsQuery.isLoading || (periodFilter !== "all" && periodQuery.isLoading),
  };
}
