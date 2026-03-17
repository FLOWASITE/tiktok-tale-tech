import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type QuotaStatus = 'ok' | 'warning' | 'critical';

export interface AdminWorkspace {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  created_at: string;
  owner: {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  member_count: number;
  brand_count: number;
  content_count: number;
  image_count: number;
  carousel_count: number;
  script_count: number;
  subscription: {
    plan_type: string;
    status: string;
    current_period_end: string;
  } | null;
  quota_status: QuotaStatus;
  quota_highest: { label: string; percentage: number } | null;
}

export interface WorkspaceStats {
  totalWorkspaces: number;
  paidWorkspaces: number;
  mrr: number;
  avgMembers: number;
  byPlan: Record<string, number>;
}

export function useAdminWorkspaces() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const workspacesQuery = useQuery({
    queryKey: ["admin_workspaces"],
    queryFn: async (): Promise<AdminWorkspace[]> => {
      // Fetch orgs
      const { data: orgs, error: orgsError } = await supabase
        .from("organizations")
        .select("*")
        .order("created_at", { ascending: false });

      if (orgsError) throw orgsError;

      // Fetch owner profiles, member counts, and subscriptions in parallel
      const ownerIds = [...new Set(orgs.map((o) => o.owner_id).filter(Boolean))];

      const [profilesRes, membersRes, subsRes, brandsRes, contentsRes, imagesRes, carouselsRes, scriptsRes] = await Promise.all([
        supabase.from("profiles").select("id, email, full_name, avatar_url").in("id", ownerIds),
        supabase.from("organization_members").select("organization_id"),
        supabase.from("subscriptions").select("organization_id, plan_type, status, current_period_start, current_period_end").not("organization_id", "is", null),
        supabase.from("brand_templates").select("organization_id"),
        supabase.from("multi_channel_contents").select("organization_id, created_at"),
        supabase.from("channel_image_history").select("organization_id, created_at"),
        supabase.from("carousels").select("organization_id, created_at"),
        supabase.from("scripts").select("organization_id, created_at"),
      ]);

      // Build period map per org from subscriptions (fallback to current month)
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();
      const periodMap = new Map<string, { start: string; end: string }>();
      (subsRes.data || []).forEach((s: any) => {
        if (!s.organization_id) return;
        const periodEnd = new Date(s.current_period_end);
        if (periodEnd < now) {
          periodMap.set(s.organization_id, { start: monthStart, end: monthEnd });
        } else {
          periodMap.set(s.organization_id, { start: s.current_period_start, end: s.current_period_end });
        }
      });
      const getOrgPeriod = (orgId: string) => periodMap.get(orgId) || { start: monthStart, end: monthEnd };
      const isInPeriod = (orgId: string, createdAt: string) => {
        const p = getOrgPeriod(orgId);
        return createdAt >= p.start && createdAt <= p.end;
      };

      const profilesMap = new Map(
        (profilesRes.data || []).map((p) => [p.id, p])
      );

      // Count members per org
      const memberCounts = new Map<string, number>();
      (membersRes.data || []).forEach((m: any) => {
        memberCounts.set(m.organization_id, (memberCounts.get(m.organization_id) || 0) + 1);
      });

      // Count brands per org
      const brandCounts = new Map<string, number>();
      (brandsRes.data || []).forEach((b: any) => {
        if (b.organization_id) brandCounts.set(b.organization_id, (brandCounts.get(b.organization_id) || 0) + 1);
      });

      // Count contents per org (filtered by subscription period)
      const contentCounts = new Map<string, number>();
      (contentsRes.data || []).forEach((c: any) => {
        if (c.organization_id && isInPeriod(c.organization_id, c.created_at)) {
          contentCounts.set(c.organization_id, (contentCounts.get(c.organization_id) || 0) + 1);
        }
      });

      // Count images per org (filtered by subscription period)
      const imageCounts = new Map<string, number>();
      (imagesRes.data || []).forEach((img: any) => {
        if (img.organization_id && isInPeriod(img.organization_id, img.created_at)) {
          imageCounts.set(img.organization_id, (imageCounts.get(img.organization_id) || 0) + 1);
        }
      });

      // Count carousels per org (filtered by subscription period)
      const carouselCounts = new Map<string, number>();
      (carouselsRes.data || []).forEach((c: any) => {
        if (c.organization_id && isInPeriod(c.organization_id, c.created_at)) {
          carouselCounts.set(c.organization_id, (carouselCounts.get(c.organization_id) || 0) + 1);
        }
      });

      // Count scripts per org (filtered by subscription period)
      const scriptCounts = new Map<string, number>();
      (scriptsRes.data || []).forEach((s: any) => {
        if (s.organization_id && isInPeriod(s.organization_id, s.created_at)) {
          scriptCounts.set(s.organization_id, (scriptCounts.get(s.organization_id) || 0) + 1);
        }
      });

      // Subscriptions by org
      const subsMap = new Map(
        (subsRes.data || []).map((s: any) => [s.organization_id, s])
      );

      return orgs.map((org) => ({
        id: org.id,
        name: org.name,
        slug: org.slug,
        logo_url: org.logo_url,
        primary_color: org.primary_color,
        created_at: org.created_at,
        owner: profilesMap.get(org.owner_id) || null,
        member_count: memberCounts.get(org.id) || 0,
        brand_count: brandCounts.get(org.id) || 0,
        content_count: contentCounts.get(org.id) || 0,
        image_count: imageCounts.get(org.id) || 0,
        carousel_count: carouselCounts.get(org.id) || 0,
        script_count: scriptCounts.get(org.id) || 0,
        subscription: subsMap.has(org.id)
          ? {
              plan_type: subsMap.get(org.id)!.plan_type,
              status: subsMap.get(org.id)!.status,
              current_period_end: subsMap.get(org.id)!.current_period_end,
            }
          : null,
      }));
    },
  });

  const statsQuery = useQuery({
    queryKey: ["admin_workspace_stats"],
    queryFn: async (): Promise<WorkspaceStats> => {
      const workspaces = workspacesQuery.data || [];
      const byPlan: Record<string, number> = { free: 0, starter: 0, pro: 0, business: 0, enterprise: 0 };
      let paidCount = 0;
      let totalMembers = 0;

      workspaces.forEach((ws) => {
        const plan = ws.subscription?.plan_type || "free";
        byPlan[plan] = (byPlan[plan] || 0) + 1;
        if (plan !== "free" && ws.subscription?.status === "active") paidCount++;
        totalMembers += ws.member_count;
      });

      // Fetch plan prices for MRR
      const { data: planLimits } = await supabase.from("plan_limits").select("plan_type, price_monthly");
      let mrr = 0;
      if (planLimits) {
        workspaces.forEach((ws) => {
          if (ws.subscription?.status === "active" && ws.subscription.plan_type !== "free") {
            const plan = planLimits.find((p) => p.plan_type === ws.subscription!.plan_type);
            if (plan) mrr += Number(plan.price_monthly);
          }
        });
      }

      return {
        totalWorkspaces: workspaces.length,
        paidWorkspaces: paidCount,
        mrr,
        avgMembers: workspaces.length > 0 ? Math.round((totalMembers / workspaces.length) * 10) / 10 : 0,
        byPlan,
      };
    },
    enabled: !!workspacesQuery.data,
  });

  const updateWorkspacePlanMutation = useMutation({
    mutationFn: async ({ organizationId, planType }: { organizationId: string; planType: string }) => {
      const { data, error } = await supabase.functions.invoke("admin-manage-user", {
        body: { action: "update_workspace_plan", organization_id: organizationId, plan_type: planType },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_workspaces"] });
      queryClient.invalidateQueries({ queryKey: ["admin_workspace_stats"] });
      toast.success("Đã cập nhật plan workspace");
    },
    onError: (err: Error) => toast.error("Lỗi: " + err.message),
  });

  const cleanupOrphansMutation = useMutation({
    mutationFn: async (dryRun: boolean = false) => {
      const { data, error } = await supabase.functions.invoke("admin-manage-user", {
        body: { action: "cleanup_orphan_workspaces", dry_run: dryRun },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      if (!data.dry_run) {
        queryClient.invalidateQueries({ queryKey: ["admin_workspaces"] });
        queryClient.invalidateQueries({ queryKey: ["admin_workspace_stats"] });
        toast.success(`Đã xóa ${data.deleted} workspace thừa`);
      }
    },
    onError: (err: Error) => toast.error("Lỗi: " + err.message),
  });

  const deleteWorkspaceMutation = useMutation({
    mutationFn: async (organizationId: string) => {
      const { data, error } = await supabase.functions.invoke("admin-manage-user", {
        body: { action: "delete_workspace", organization_id: organizationId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_workspaces"] });
      queryClient.invalidateQueries({ queryKey: ["admin_workspace_stats"] });
      toast.success("Đã xóa workspace");
    },
    onError: (err: Error) => toast.error("Lỗi: " + err.message),
  });

  return {
    workspaces: workspacesQuery.data || [],
    stats: statsQuery.data,
    isLoading: workspacesQuery.isLoading,
    updateWorkspacePlan: updateWorkspacePlanMutation.mutate,
    deleteWorkspace: deleteWorkspaceMutation.mutate,
    cleanupOrphans: cleanupOrphansMutation.mutateAsync,
    isCleaningUp: cleanupOrphansMutation.isPending,
    isUpdating: updateWorkspacePlanMutation.isPending || deleteWorkspaceMutation.isPending,
    refetch: () => {
      workspacesQuery.refetch();
      statsQuery.refetch();
    },
  };
}
