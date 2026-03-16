import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

export interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  role: AppRole;
  is_banned: boolean;
  subscription: {
    plan_type: "free" | "starter" | "pro" | "enterprise";
    status: "active" | "cancelled" | "expired" | "pending" | "trial";
    current_period_end: string;
  } | null;
}

export interface AdminStats {
  totalUsers: number;
  activeSubscriptions: number;
  totalRevenue: number;
  usageToday: number;
  usersByPlan: Record<string, number>;
  recentSignups: number;
}

export function useAdmin() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Check if current user is admin
  const isAdminQuery = useQuery({
    queryKey: ["is_admin", user?.id],
    queryFn: async (): Promise<boolean> => {
      if (!user?.id) return false;

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (error) return false;
      return !!data;
    },
    enabled: !!user?.id,
  });

  // Fetch all users with their roles and subscriptions
  const usersQuery = useQuery({
    queryKey: ["admin_users"],
    queryFn: async (): Promise<AdminUser[]> => {
      const [profilesRes, rolesRes, subsRes, bannedRes] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("*"),
        supabase.from("subscriptions").select("*"),
        supabase.functions.invoke("admin-manage-user", {
          body: { action: "list_banned_users" },
        }),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;
      if (subsRes.error) throw subsRes.error;

      const bannedIds: string[] = bannedRes.data?.banned_ids || [];

      return profilesRes.data.map((profile) => {
        const userRole = rolesRes.data.find((r) => r.user_id === profile.id);
        const userSub = subsRes.data.find((s) => s.user_id === profile.id);

        return {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          created_at: profile.created_at,
          role: (userRole?.role as AppRole) || "user",
          is_banned: bannedIds.includes(profile.id),
          subscription: userSub
            ? {
                plan_type: userSub.plan_type as "free" | "starter" | "pro" | "enterprise",
                status: userSub.status as "active" | "cancelled" | "expired" | "pending" | "trial",
                current_period_end: userSub.current_period_end,
              }
            : null,
        };
      });
    },
    enabled: isAdminQuery.data === true,
  });

  // Fetch admin stats
  const statsQuery = useQuery({
    queryKey: ["admin_stats"],
    queryFn: async (): Promise<AdminStats> => {
      const { data: profiles } = await supabase.from("profiles").select("id");
      const { data: subs } = await supabase
        .from("subscriptions")
        .select("plan_type, status");
      const { data: planLimits } = await supabase.from("plan_limits").select("*");

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data: todayUsage } = await supabase
        .from("usage_logs")
        .select("id")
        .gte("created_at", today.toISOString());

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 7);
      const { data: recentProfiles } = await supabase
        .from("profiles")
        .select("id")
        .gte("created_at", yesterday.toISOString());

      const activeSubs = subs?.filter((s) => s.status === "active") || [];
      const usersByPlan: Record<string, number> = {
        free: 0,
        starter: 0,
        pro: 0,
        enterprise: 0,
      };

      let totalRevenue = 0;
      activeSubs.forEach((sub) => {
        usersByPlan[sub.plan_type] = (usersByPlan[sub.plan_type] || 0) + 1;
        const plan = planLimits?.find((p) => p.plan_type === sub.plan_type);
        if (plan) {
          totalRevenue += Number(plan.price_monthly);
        }
      });

      return {
        totalUsers: profiles?.length || 0,
        activeSubscriptions: activeSubs.length,
        totalRevenue,
        usageToday: todayUsage?.length || 0,
        usersByPlan,
        recentSignups: recentProfiles?.length || 0,
      };
    },
    enabled: isAdminQuery.data === true,
  });

  // Update user role
  const updateRoleMutation = useMutation({
    mutationFn: async ({
      userId,
      role,
    }: {
      userId: string;
      role: AppRole;
    }) => {
      const { error } = await supabase
        .from("user_roles")
        .update({ role })
        .eq("user_id", userId);

      if (error) throw error;

      // Audit log
      await supabase.from("admin_audit_logs").insert({
        admin_id: user!.id,
        action: "change_role",
        target_user_id: userId,
        details: { new_role: role },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_users"] });
      toast.success("Đã cập nhật role");
    },
    onError: (error) => {
      toast.error("Lỗi: " + error.message);
    },
  });

  // Update user subscription
  const updateSubscriptionMutation = useMutation({
    mutationFn: async ({
      userId,
      planType,
      status,
    }: {
      userId: string;
      planType: "free" | "starter" | "pro" | "enterprise";
      status?: "active" | "cancelled" | "expired" | "pending" | "trial";
    }) => {
      const periodEnd = new Date();
      periodEnd.setDate(periodEnd.getDate() + 30);

      const { error } = await supabase
        .from("subscriptions")
        .update({
          plan_type: planType,
          status: status || "active",
          current_period_start: new Date().toISOString(),
          current_period_end: periodEnd.toISOString(),
        })
        .eq("user_id", userId);

      if (error) throw error;

      // Audit log
      await supabase.from("admin_audit_logs").insert({
        admin_id: user!.id,
        action: "change_subscription",
        target_user_id: userId,
        details: { plan_type: planType, status: status || "active" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_users"] });
      queryClient.invalidateQueries({ queryKey: ["admin_stats"] });
      toast.success("Đã cập nhật subscription");
    },
    onError: (error) => {
      toast.error("Lỗi: " + error.message);
    },
  });

  return {
    isAdmin: isAdminQuery.data || false,
    isCheckingAdmin: isAdminQuery.isLoading,
    users: usersQuery.data || [],
    stats: statsQuery.data,
    isLoading: usersQuery.isLoading || statsQuery.isLoading,
    updateRole: updateRoleMutation.mutate,
    updateSubscription: updateSubscriptionMutation.mutate,
    isUpdating: updateRoleMutation.isPending || updateSubscriptionMutation.isPending,
    refetch: () => {
      usersQuery.refetch();
      statsQuery.refetch();
    },
  };
}
