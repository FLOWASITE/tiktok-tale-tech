import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AdminPlanStats {
  totalWorkspaces: number;
  paidWorkspaces: number;
  mrr: number;
  arpu: number;
  /** Average % units consumed across sampled active workspaces (0-100) */
  avgBurnRate: number;
  /** Workspaces with at least one unit ≥80% used */
  needsUpgradeCount: number;
  /** Per-tier aggregates: tier => { content, image, video, count } */
  tierUsage: Record<string, { content: number; image: number; video: number; count: number }>;
}

const SAMPLE_SIZE = 100;

export function useAdminPlanStats() {
  return useQuery<AdminPlanStats>({
    queryKey: ["admin_plan_stats_v2"],
    queryFn: async () => {
      const [subsRes, plansRes] = await Promise.all([
        supabase
          .from("subscriptions")
          .select("organization_id, plan_type, status")
          .eq("status", "active"),
        supabase
          .from("plan_limits")
          .select("plan_type, price_monthly, monthly_content_units, monthly_image_units, monthly_video_units"),
      ]);

      const subs = subsRes.data || [];
      const plans = plansRes.data || [];

      const priceMap: Record<string, number> = {};
      const limitMap: Record<string, { content: number; image: number; video: number }> = {};
      plans.forEach((p: any) => {
        priceMap[p.plan_type] = Number(p.price_monthly) || 0;
        limitMap[p.plan_type] = {
          content: Number(p.monthly_content_units) || 0,
          image: Number(p.monthly_image_units) || 0,
          video: Number(p.monthly_video_units) || 0,
        };
      });

      const totalWorkspaces = subs.length;
      const paidWorkspaces = subs.filter((s: any) => s.plan_type !== "free").length;
      const mrr = subs.reduce((sum: number, s: any) => sum + (priceMap[s.plan_type] || 0), 0);
      const arpu = totalWorkspaces > 0 ? mrr / totalWorkspaces : 0;

      // Sample top N for usage call (keep N+1 manageable)
      const sample = subs.slice(0, SAMPLE_SIZE);
      const usages = await Promise.all(
        sample.map(async (s: any) => {
          const { data } = await supabase.rpc("get_org_usage_units_batch", {
            _org_id: s.organization_id,
          });
          return { sub: s, usage: (data as any) || { content: 0, image: 0, video: 0 } };
        })
      );

      let totalRatio = 0;
      let ratioCount = 0;
      let needsUpgradeCount = 0;
      const tierUsage: AdminPlanStats["tierUsage"] = {};

      for (const { sub, usage } of usages) {
        const limit = limitMap[sub.plan_type] || { content: 0, image: 0, video: 0 };
        const tier = sub.plan_type;
        if (!tierUsage[tier]) tierUsage[tier] = { content: 0, image: 0, video: 0, count: 0 };
        tierUsage[tier].content += usage.content || 0;
        tierUsage[tier].image += usage.image || 0;
        tierUsage[tier].video += usage.video || 0;
        tierUsage[tier].count += 1;

        const ratios: number[] = [];
        let needsUpgrade = false;
        (["content", "image", "video"] as const).forEach((k) => {
          const lim = limit[k];
          if (lim > 0) {
            const r = (usage[k] || 0) / lim;
            ratios.push(Math.min(r, 2));
            if (r >= 0.8) needsUpgrade = true;
          }
        });
        if (ratios.length > 0) {
          totalRatio += ratios.reduce((a, b) => a + b, 0) / ratios.length;
          ratioCount += 1;
        }
        if (needsUpgrade) needsUpgradeCount += 1;
      }

      const avgBurnRate = ratioCount > 0 ? Math.round((totalRatio / ratioCount) * 100) : 0;

      return {
        totalWorkspaces,
        paidWorkspaces,
        mrr,
        arpu,
        avgBurnRate,
        needsUpgradeCount,
        tierUsage,
      };
    },
    staleTime: 60_000,
  });
}
