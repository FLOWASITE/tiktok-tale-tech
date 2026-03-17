import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  profile: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
}

export function useAdminWorkspaceDetail(orgId: string | null) {
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
        .select("id, brand_name, logo_url, industry_template_id")
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

      return data.map((b) => ({
        id: b.id,
        brand_name: b.brand_name,
        logo_url: b.logo_url,
        industry: b.industry_template_id ? industryMap.get(b.industry_template_id) || null : null,
      }));
    },
    enabled: !!orgId,
  });

  const statsQuery = useQuery({
    queryKey: ["admin_workspace_content_stats", orgId],
    queryFn: async (): Promise<WorkspaceContentStats> => {
      const [mcRes, carRes, imgRes, scriptRes, carImgRes] = await Promise.all([
        supabase.from("multi_channel_contents").select("id, selected_channels").eq("organization_id", orgId!),
        supabase.from("carousels").select("id", { count: "exact", head: true }).eq("organization_id", orgId!),
        supabase.from("channel_image_history").select("id", { count: "exact", head: true }).eq("organization_id", orgId!),
        supabase.from("scripts").select("id", { count: "exact", head: true }).eq("organization_id", orgId!),
        supabase.from("carousel_images").select("id", { count: "exact", head: true }).eq("organization_id", orgId!),
      ]);

      // Calculate social post count from selected_channels arrays
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
    enabled: !!orgId,
  });

  const contributionsQuery = useQuery({
    queryKey: ["admin_workspace_contributions", orgId],
    queryFn: async (): Promise<MemberContribution[]> => {
      // Get contents grouped by user
      const { data: contents } = await supabase
        .from("multi_channel_contents")
        .select("user_id")
        .eq("organization_id", orgId!);

      const { data: images } = await supabase
        .from("channel_image_history")
        .select("user_id")
        .eq("organization_id", orgId!);

      const contentByUser: Record<string, number> = {};
      const imageByUser: Record<string, number> = {};
      const allUserIds = new Set<string>();

      (contents || []).forEach((r: any) => {
        if (r.user_id) {
          allUserIds.add(r.user_id);
          contentByUser[r.user_id] = (contentByUser[r.user_id] || 0) + 1;
        }
      });
      (images || []).forEach((r: any) => {
        if (r.user_id) {
          allUserIds.add(r.user_id);
          imageByUser[r.user_id] = (imageByUser[r.user_id] || 0) + 1;
        }
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
          profile: profileMap.get(userId) || null,
        }))
        .sort((a, b) => (b.contentCount + b.imageCount) - (a.contentCount + a.imageCount));
    },
    enabled: !!orgId,
  });

  return {
    members: membersQuery.data || [],
    brands: brandsQuery.data || [],
    contentStats: statsQuery.data || { multiChannelCount: 0, socialPostCount: 0, carouselCount: 0, carouselImageCount: 0, imageCount: 0, scriptCount: 0 },
    contributions: contributionsQuery.data || [],
    isLoading: membersQuery.isLoading || brandsQuery.isLoading || statsQuery.isLoading || contributionsQuery.isLoading,
  };
}
