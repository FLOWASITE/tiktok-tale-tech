import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, startOfWeek, startOfMonth, subDays, format } from "date-fns";

export interface CostSummary {
  totalCostUsd: number;
  totalCostToday: number;
  totalCostWeek: number;
  totalCostMonth: number;
  avgCostPerRequest: number;
  totalRequests: number;
  costTrend: number;
}

export interface DailyCost {
  date: string;
  cost: number;
  requestCount: number;
  inputTokens: number;
  outputTokens: number;
}

export interface CostByModel {
  model: string;
  cost: number;
  requestCount: number;
  percentage: number;
}

export interface CostByFunction {
  functionName: string;
  cost: number;
  requestCount: number;
  avgCostPerRequest: number;
}

export interface CostByUser {
  userId: string;
  email: string | null;
  fullName: string | null;
  totalCost: number;
  requestCount: number;
  avgCostPerRequest: number;
}

export interface CostByOrganization {
  organizationId: string;
  organizationName: string | null;
  totalCost: number;
  requestCount: number;
  avgCostPerRequest: number;
}

export interface RecentCostEntry {
  id: string;
  createdAt: string;
  functionName: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  cacheHit: boolean;
}

export function useCostAnalytics(days: number = 30) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const rangeStart = subDays(now, days);

  // Summary query
  const summaryQuery = useQuery({
    queryKey: ["cost-analytics-summary", days],
    queryFn: async (): Promise<CostSummary> => {
      const { data: allMetrics, error } = await supabase
        .from("ai_metrics")
        .select("estimated_cost_usd, created_at")
        .not("estimated_cost_usd", "is", null)
        .gte("created_at", rangeStart.toISOString());

      if (error) throw error;

      const metrics = allMetrics || [];
      const totalCostUsd = metrics.reduce((sum, m) => sum + (m.estimated_cost_usd || 0), 0);
      const totalRequests = metrics.length;
      const totalCostToday = metrics.filter(m => new Date(m.created_at) >= todayStart).reduce((sum, m) => sum + (m.estimated_cost_usd || 0), 0);
      const totalCostWeek = metrics.filter(m => new Date(m.created_at) >= weekStart).reduce((sum, m) => sum + (m.estimated_cost_usd || 0), 0);
      const totalCostMonth = metrics.filter(m => new Date(m.created_at) >= monthStart).reduce((sum, m) => sum + (m.estimated_cost_usd || 0), 0);

      const lastWeekStart = subDays(weekStart, 7);
      const lastWeekCost = metrics.filter(m => {
        const d = new Date(m.created_at);
        return d >= lastWeekStart && d < weekStart;
      }).reduce((sum, m) => sum + (m.estimated_cost_usd || 0), 0);
      const costTrend = lastWeekCost > 0 ? ((totalCostWeek - lastWeekCost) / lastWeekCost) * 100 : 0;

      return {
        totalCostUsd,
        totalCostToday,
        totalCostWeek,
        totalCostMonth,
        avgCostPerRequest: totalRequests > 0 ? totalCostUsd / totalRequests : 0,
        totalRequests,
        costTrend,
      };
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Daily costs query
  const dailyCostsQuery = useQuery({
    queryKey: ["cost-analytics-daily", days],
    queryFn: async (): Promise<DailyCost[]> => {
      const { data, error } = await supabase
        .from("ai_metrics")
        .select("estimated_cost_usd, input_tokens_estimated, output_tokens_estimated, created_at")
        .not("estimated_cost_usd", "is", null)
        .gte("created_at", rangeStart.toISOString())
        .order("created_at", { ascending: true });

      if (error) throw error;

      const dailyMap = new Map<string, DailyCost>();
      (data || []).forEach((m) => {
        const date = format(new Date(m.created_at), "yyyy-MM-dd");
        const existing = dailyMap.get(date) || { date, cost: 0, requestCount: 0, inputTokens: 0, outputTokens: 0 };
        existing.cost += m.estimated_cost_usd || 0;
        existing.requestCount += 1;
        existing.inputTokens += m.input_tokens_estimated || 0;
        existing.outputTokens += m.output_tokens_estimated || 0;
        dailyMap.set(date, existing);
      });

      const result: DailyCost[] = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = format(subDays(now, i), "yyyy-MM-dd");
        result.push(dailyMap.get(date) || { date, cost: 0, requestCount: 0, inputTokens: 0, outputTokens: 0 });
      }
      return result;
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Cost by model query
  const costByModelQuery = useQuery({
    queryKey: ["cost-analytics-by-model", days],
    queryFn: async (): Promise<CostByModel[]> => {
      const { data, error } = await supabase
        .from("ai_metrics")
        .select("models_used, estimated_cost_usd")
        .not("estimated_cost_usd", "is", null)
        .gte("created_at", rangeStart.toISOString());

      if (error) throw error;

      const modelMap = new Map<string, { cost: number; count: number }>();
      let totalCost = 0;

      (data || []).forEach((m) => {
        const cost = m.estimated_cost_usd || 0;
        totalCost += cost;
        const models = m.models_used as Record<string, string> | null;
        if (models) {
          const uniqueModels = new Set(Object.values(models));
          const costPerModel = cost / uniqueModels.size;
          uniqueModels.forEach((model) => {
            const existing = modelMap.get(model) || { cost: 0, count: 0 };
            existing.cost += costPerModel;
            existing.count += 1;
            modelMap.set(model, existing);
          });
        }
      });

      return Array.from(modelMap.entries())
        .map(([model, data]) => ({
          model: model.split("/").pop() || model,
          cost: data.cost,
          requestCount: data.count,
          percentage: totalCost > 0 ? (data.cost / totalCost) * 100 : 0,
        }))
        .sort((a, b) => b.cost - a.cost);
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Cost by function query
  const costByFunctionQuery = useQuery({
    queryKey: ["cost-analytics-by-function", days],
    queryFn: async (): Promise<CostByFunction[]> => {
      const { data, error } = await supabase
        .from("ai_metrics")
        .select("function_name, estimated_cost_usd")
        .not("estimated_cost_usd", "is", null)
        .gte("created_at", rangeStart.toISOString());

      if (error) throw error;

      const funcMap = new Map<string, { cost: number; count: number }>();
      (data || []).forEach((m) => {
        const existing = funcMap.get(m.function_name) || { cost: 0, count: 0 };
        existing.cost += m.estimated_cost_usd || 0;
        existing.count += 1;
        funcMap.set(m.function_name, existing);
      });

      return Array.from(funcMap.entries())
        .map(([functionName, data]) => ({
          functionName,
          cost: data.cost,
          requestCount: data.count,
          avgCostPerRequest: data.count > 0 ? data.cost / data.count : 0,
        }))
        .sort((a, b) => b.cost - a.cost);
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Cost by user query
  const costByUserQuery = useQuery({
    queryKey: ["cost-analytics-by-user", days],
    queryFn: async (): Promise<CostByUser[]> => {
      const { data, error } = await supabase
        .from("ai_metrics")
        .select("user_id, estimated_cost_usd")
        .not("estimated_cost_usd", "is", null)
        .not("user_id", "is", null)
        .gte("created_at", rangeStart.toISOString());

      if (error) throw error;

      // Group by user_id
      const userMap = new Map<string, { cost: number; count: number }>();
      (data || []).forEach((m) => {
        if (!m.user_id) return;
        const existing = userMap.get(m.user_id) || { cost: 0, count: 0 };
        existing.cost += m.estimated_cost_usd || 0;
        existing.count += 1;
        userMap.set(m.user_id, existing);
      });

      // Fetch profiles for user names
      const userIds = Array.from(userMap.keys());
      let profiles: Record<string, { email: string | null; full_name: string | null }> = {};
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, email, full_name")
          .in("id", userIds);
        
        (profileData || []).forEach((p: any) => {
          profiles[p.id] = { email: p.email, full_name: p.full_name };
        });
      }

      return Array.from(userMap.entries())
        .map(([userId, data]) => ({
          userId,
          email: profiles[userId]?.email || null,
          fullName: profiles[userId]?.full_name || null,
          totalCost: data.cost,
          requestCount: data.count,
          avgCostPerRequest: data.count > 0 ? data.cost / data.count : 0,
        }))
        .sort((a, b) => b.totalCost - a.totalCost);
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Cost by organization query
  const costByOrgQuery = useQuery({
    queryKey: ["cost-analytics-by-org", days],
    queryFn: async (): Promise<CostByOrganization[]> => {
      const { data, error } = await supabase
        .from("ai_metrics")
        .select("organization_id, estimated_cost_usd")
        .not("estimated_cost_usd", "is", null)
        .not("organization_id", "is", null)
        .gte("created_at", rangeStart.toISOString());

      if (error) throw error;

      const orgMap = new Map<string, { cost: number; count: number }>();
      (data || []).forEach((m) => {
        if (!m.organization_id) return;
        const existing = orgMap.get(m.organization_id) || { cost: 0, count: 0 };
        existing.cost += m.estimated_cost_usd || 0;
        existing.count += 1;
        orgMap.set(m.organization_id, existing);
      });

      // Fetch org names
      const orgIds = Array.from(orgMap.keys());
      let orgs: Record<string, string> = {};
      if (orgIds.length > 0) {
        const { data: orgData } = await supabase
          .from("organizations")
          .select("id, name")
          .in("id", orgIds);
        
        (orgData || []).forEach((o: any) => {
          orgs[o.id] = o.name;
        });
      }

      return Array.from(orgMap.entries())
        .map(([orgId, data]) => ({
          organizationId: orgId,
          organizationName: orgs[orgId] || null,
          totalCost: data.cost,
          requestCount: data.count,
          avgCostPerRequest: data.count > 0 ? data.cost / data.count : 0,
        }))
        .sort((a, b) => b.totalCost - a.totalCost);
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Recent entries query
  const recentEntriesQuery = useQuery({
    queryKey: ["cost-analytics-recent"],
    queryFn: async (): Promise<RecentCostEntry[]> => {
      const { data, error } = await supabase
        .from("ai_metrics")
        .select("id, created_at, function_name, models_used, input_tokens_estimated, output_tokens_estimated, estimated_cost_usd, cache_hit")
        .not("estimated_cost_usd", "is", null)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      return (data || []).map((m) => {
        const models = m.models_used as Record<string, string> | null;
        let modelDisplay = "unknown";
        if (models) {
          const uniqueModels = [...new Set(Object.values(models))];
          modelDisplay = uniqueModels.map(model => model?.split("/").pop() || model).join(", ");
        }
        
        return {
          id: m.id,
          createdAt: m.created_at,
          functionName: m.function_name,
          model: modelDisplay,
          inputTokens: m.input_tokens_estimated || 0,
          outputTokens: m.output_tokens_estimated || 0,
          estimatedCostUsd: m.estimated_cost_usd || 0,
          cacheHit: m.cache_hit || false,
        };
      });
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  return {
    summary: summaryQuery.data,
    dailyCosts: dailyCostsQuery.data,
    costByModel: costByModelQuery.data,
    costByFunction: costByFunctionQuery.data,
    costByUser: costByUserQuery.data,
    costByOrg: costByOrgQuery.data,
    recentEntries: recentEntriesQuery.data,
    isLoading:
      summaryQuery.isLoading ||
      dailyCostsQuery.isLoading ||
      costByModelQuery.isLoading ||
      costByFunctionQuery.isLoading,
    refetch: () => {
      summaryQuery.refetch();
      dailyCostsQuery.refetch();
      costByModelQuery.refetch();
      costByFunctionQuery.refetch();
      costByUserQuery.refetch();
      costByOrgQuery.refetch();
      recentEntriesQuery.refetch();
    },
  };
}
