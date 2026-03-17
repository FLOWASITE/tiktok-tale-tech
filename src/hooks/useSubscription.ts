import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Subscription {
  id: string;
  user_id: string;
  plan_type: "free" | "starter" | "pro" | "enterprise";
  status: "active" | "cancelled" | "expired" | "pending" | "trial";
  payment_provider: string | null;
  payment_reference: string | null;
  current_period_start: string;
  current_period_end: string;
  trial_end: string | null;
  cancelled_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface PlanLimit {
  id: string;
  plan_type: "free" | "starter" | "pro" | "enterprise";
  monthly_scripts: number;
  monthly_carousels: number;
  monthly_multichannel: number;
  monthly_images: number;
  monthly_ai_edits: number;
  monthly_brands: number;
  price_monthly: number;
  price_yearly: number;
  features: string[];
  created_at: string;
  updated_at: string;
}

export interface UsageStats {
  scripts: number;
  carousels: number;
  multichannel: number;
  multichannel_social_posts: number;
  channel_breakdown: Record<string, number>;
  images: number;
  image_channel_breakdown: Record<string, number>;
  brands: number;
}

export function useSubscription() {
  const { user } = useAuth();

  const subscriptionQuery = useQuery({
    queryKey: ["subscription", user?.id],
    queryFn: async (): Promise<Subscription | null> => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data as Subscription | null;
    },
    enabled: !!user?.id,
  });

  const planLimitsQuery = useQuery({
    queryKey: ["plan_limits"],
    queryFn: async (): Promise<PlanLimit[]> => {
      const { data, error } = await supabase
        .from("plan_limits")
        .select("*")
        .order("price_monthly", { ascending: true });

      if (error) throw error;
      return data as PlanLimit[];
    },
  });

  const usageQuery = useQuery({
    queryKey: ["usage_stats", user?.id],
    queryFn: async (): Promise<UsageStats> => {
      if (!user?.id) {
        return { scripts: 0, carousels: 0, multichannel: 0, multichannel_social_posts: 0, channel_breakdown: {}, images: 0, image_channel_breakdown: {}, brands: 0 };
      }

      const subscription = subscriptionQuery.data;
      if (!subscription) {
        return { scripts: 0, carousels: 0, multichannel: 0, multichannel_social_posts: 0, channel_breakdown: {}, images: 0, image_channel_breakdown: {}, brands: 0 };
      }

      // Auto-renew: if period expired, fallback to current month
      const now = new Date();
      const periodEndDate = new Date(subscription.current_period_end);
      let periodStart: string;
      let periodEnd: string;

      if (periodEndDate < now) {
        // Period expired — use current month as fallback
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        periodStart = startOfMonth.toISOString();
        periodEnd = endOfMonth.toISOString();
      } else {
        periodStart = subscription.current_period_start;
        periodEnd = subscription.current_period_end;
      }

      // Query actual content tables for real counts
      // First get user's content IDs for image counting
      const { data: userContents } = await supabase
        .from("multi_channel_contents")
        .select("id")
        .eq("user_id", user.id)
        .gte("created_at", periodStart)
        .lte("created_at", periodEnd);

      const contentIds = (userContents || []).map((c: any) => c.id);

      const [scriptsRes, carouselsRes, multiRes, imagesRes, brandsRes] = await Promise.all([
        supabase
          .from("scripts")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("created_at", periodStart)
          .lte("created_at", periodEnd),
        supabase
          .from("carousels")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("created_at", periodStart)
          .lte("created_at", periodEnd),
        supabase
          .from("multi_channel_contents")
          .select("selected_channels", { count: "exact" })
          .eq("user_id", user.id)
          .gte("created_at", periodStart)
          .lte("created_at", periodEnd),
        // Count images via content_id join + fetch channel for breakdown
        contentIds.length > 0
          ? supabase
              .from("channel_image_history")
              .select("channel", { count: "exact" })
              .in("content_id", contentIds)
          : Promise.resolve({ count: 0, data: null, error: null }),
        supabase
          .from("brand_templates")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id),
      ]);

      const channelBreakdown: Record<string, number> = {};
      const socialPostsTotal = (multiRes.data || []).reduce(
        (sum: number, row: any) => {
          if (Array.isArray(row.selected_channels)) {
            row.selected_channels.forEach((ch: string) => {
              channelBreakdown[ch] = (channelBreakdown[ch] || 0) + 1;
            });
            return sum + row.selected_channels.length;
          }
          return sum;
        },
        0
      );
      // Image channel breakdown
      const imageChannelBreakdown: Record<string, number> = {};
      if (imagesRes.data && Array.isArray(imagesRes.data)) {
        imagesRes.data.forEach((row: any) => {
          if (row.channel) {
            imageChannelBreakdown[row.channel] = (imageChannelBreakdown[row.channel] || 0) + 1;
          }
        });
      }

      return {
        scripts: scriptsRes.count ?? 0,
        carousels: carouselsRes.count ?? 0,
        multichannel: multiRes.count ?? 0,
        multichannel_social_posts: socialPostsTotal,
        channel_breakdown: channelBreakdown,
        images: imagesRes.count ?? 0,
        image_channel_breakdown: imageChannelBreakdown,
        brands: brandsRes.count ?? 0,
      };
    },
    enabled: !!user?.id && !!subscriptionQuery.data,
  });

  const currentPlanLimits = planLimitsQuery.data?.find(
    (plan) => plan.plan_type === subscriptionQuery.data?.plan_type
  );

  type NumericUsageKey = Exclude<keyof UsageStats, 'channel_breakdown' | 'image_channel_breakdown'>;

  const isWithinLimits = (type: NumericUsageKey): boolean => {
    if (!currentPlanLimits || !usageQuery.data) return false;
    
    const limitMap: Record<NumericUsageKey, number> = {
      scripts: currentPlanLimits.monthly_scripts,
      carousels: currentPlanLimits.monthly_carousels,
      multichannel: currentPlanLimits.monthly_multichannel,
      multichannel_social_posts: currentPlanLimits.monthly_multichannel,
      images: currentPlanLimits.monthly_images,
      brands: currentPlanLimits.monthly_brands,
    };

    const limit = limitMap[type];
    if (limit === -1) return true;

    return (usageQuery.data[type] as number) < limit;
  };

  const getRemainingUsage = (type: NumericUsageKey): number => {
    if (!currentPlanLimits || !usageQuery.data) return 0;
    
    const limitMap: Record<NumericUsageKey, number> = {
      scripts: currentPlanLimits.monthly_scripts,
      carousels: currentPlanLimits.monthly_carousels,
      multichannel: currentPlanLimits.monthly_multichannel,
      multichannel_social_posts: currentPlanLimits.monthly_multichannel,
      images: currentPlanLimits.monthly_images,
      brands: currentPlanLimits.monthly_brands,
    };

    const limit = limitMap[type];
    if (limit === -1) return Infinity;

    return Math.max(0, limit - (usageQuery.data[type] as number));
  };

  // Compute current period for display
  const computeCurrentPeriod = (): { start: string; end: string } => {
    const sub = subscriptionQuery.data;
    if (!sub) {
      const now = new Date();
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      const e = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { start: s.toISOString(), end: e.toISOString() };
    }
    const now = new Date();
    const periodEndDate = new Date(sub.current_period_end);
    if (periodEndDate < now) {
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      const e = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { start: s.toISOString(), end: e.toISOString() };
    }
    return { start: sub.current_period_start, end: sub.current_period_end };
  };

  return {
    subscription: subscriptionQuery.data,
    planLimits: planLimitsQuery.data,
    currentPlanLimits,
    usage: usageQuery.data,
    currentPeriod: computeCurrentPeriod(),
    isLoading: subscriptionQuery.isLoading || planLimitsQuery.isLoading,
    isWithinLimits,
    getRemainingUsage,
    refetch: () => {
      subscriptionQuery.refetch();
      usageQuery.refetch();
    },
  };
}
