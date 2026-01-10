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
      // Get all metrics with costs
      const { data: allMetrics, error } = await supabase
        .from("ai_metrics")
        .select("estimated_cost_usd, created_at")
        .not("estimated_cost_usd", "is", null)
        .gte("created_at", rangeStart.toISOString());

      if (error) throw error;

      const metrics = allMetrics || [];
      
      const totalCostUsd = metrics.reduce((sum, m) => sum + (m.estimated_cost_usd || 0), 0);
      const totalRequests = metrics.length;
      
      const todayMetrics = metrics.filter(m => new Date(m.created_at) >= todayStart);
      const totalCostToday = todayMetrics.reduce((sum, m) => sum + (m.estimated_cost_usd || 0), 0);
      
      const weekMetrics = metrics.filter(m => new Date(m.created_at) >= weekStart);
      const totalCostWeek = weekMetrics.reduce((sum, m) => sum + (m.estimated_cost_usd || 0), 0);
      
      const monthMetrics = metrics.filter(m => new Date(m.created_at) >= monthStart);
      const totalCostMonth = monthMetrics.reduce((sum, m) => sum + (m.estimated_cost_usd || 0), 0);

      // Calculate trend (compare this week vs last week)
      const lastWeekStart = subDays(weekStart, 7);
      const lastWeekMetrics = metrics.filter(m => {
        const date = new Date(m.created_at);
        return date >= lastWeekStart && date < weekStart;
      });
      const lastWeekCost = lastWeekMetrics.reduce((sum, m) => sum + (m.estimated_cost_usd || 0), 0);
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

      // Group by date
      const dailyMap = new Map<string, DailyCost>();
      
      (data || []).forEach((m) => {
        const date = format(new Date(m.created_at), "yyyy-MM-dd");
        const existing = dailyMap.get(date) || {
          date,
          cost: 0,
          requestCount: 0,
          inputTokens: 0,
          outputTokens: 0,
        };
        
        existing.cost += m.estimated_cost_usd || 0;
        existing.requestCount += 1;
        existing.inputTokens += m.input_tokens_estimated || 0;
        existing.outputTokens += m.output_tokens_estimated || 0;
        
        dailyMap.set(date, existing);
      });

      // Fill missing dates
      const result: DailyCost[] = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = format(subDays(now, i), "yyyy-MM-dd");
        result.push(dailyMap.get(date) || {
          date,
          cost: 0,
          requestCount: 0,
          inputTokens: 0,
          outputTokens: 0,
        });
      }

      return result;
    },
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

      // Aggregate by model
      const modelMap = new Map<string, { cost: number; count: number }>();
      let totalCost = 0;

      (data || []).forEach((m) => {
        const cost = m.estimated_cost_usd || 0;
        totalCost += cost;
        
        // models_used is a JSON object like { "facebook": "google/gemini-2.5-flash", ... }
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

      // Aggregate by function
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
        // Show all unique models used in this request
        let modelDisplay = "unknown";
        if (models) {
          const uniqueModels = [...new Set(Object.values(models))];
          modelDisplay = uniqueModels
            .map(model => model?.split("/").pop() || model)
            .join(", ");
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
  });

  return {
    summary: summaryQuery.data,
    dailyCosts: dailyCostsQuery.data,
    costByModel: costByModelQuery.data,
    costByFunction: costByFunctionQuery.data,
    recentEntries: recentEntriesQuery.data,
    isLoading:
      summaryQuery.isLoading ||
      dailyCostsQuery.isLoading ||
      costByModelQuery.isLoading ||
      costByFunctionQuery.isLoading ||
      recentEntriesQuery.isLoading,
    refetch: () => {
      summaryQuery.refetch();
      dailyCostsQuery.refetch();
      costByModelQuery.refetch();
      costByFunctionQuery.refetch();
      recentEntriesQuery.refetch();
    },
  };
}
