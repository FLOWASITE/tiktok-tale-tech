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
  carouselCount: number;
  imageCount: number;
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

      // Fetch industry names
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
      const [mcRes, carRes, imgRes] = await Promise.all([
        supabase.from("multi_channel_contents").select("id", { count: "exact", head: true }).eq("organization_id", orgId!),
        supabase.from("carousels").select("id", { count: "exact", head: true }).eq("organization_id", orgId!),
        supabase.from("channel_image_history").select("id", { count: "exact", head: true }).eq("organization_id", orgId!),
      ]);
      return {
        multiChannelCount: mcRes.count || 0,
        carouselCount: carRes.count || 0,
        imageCount: imgRes.count || 0,
      };
    },
    enabled: !!orgId,
  });

  return {
    members: membersQuery.data || [],
    brands: brandsQuery.data || [],
    contentStats: statsQuery.data || { multiChannelCount: 0, carouselCount: 0, imageCount: 0 },
    isLoading: membersQuery.isLoading || brandsQuery.isLoading || statsQuery.isLoading,
  };
}
