// ============================================
// Graph Health & Analytics Hooks
// Orphan detection, health summary, query analytics
// ============================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ============================================
// Query Keys
// ============================================

export const graphHealthKeys = {
  all: ["graph-health"] as const,
  summary: () => [...graphHealthKeys.all, "summary"] as const,
  orphans: (limit?: number) => [...graphHealthKeys.all, "orphans", limit] as const,
  analytics: (range?: string) => [...graphHealthKeys.all, "analytics", range] as const,
};

// ============================================
// Types
// ============================================

export interface HealthMetric {
  metric_name: string;
  metric_value: number;
  status: "pass" | "warn" | "fail" | "info";
}

export interface OrphanNode {
  node_id: string;
  node_type: string;
  node_key: string;
  display_name: { vi?: string; en?: string } | null;
  created_at: string;
}

export interface QueryAnalytics {
  id: string;
  query_type: string;
  query_params: Record<string, unknown>;
  result_count: number;
  duration_ms: number;
  created_at: string;
}

export interface AnalyticsSummary {
  totalQueries: number;
  avgDuration: number;
  slowQueries: number;
  queryTypeBreakdown: Record<string, number>;
}

// ============================================
// Health Summary Hook
// ============================================

export function useGraphHealthSummary() {
  return useQuery({
    queryKey: graphHealthKeys.summary(),
    queryFn: async (): Promise<HealthMetric[]> => {
      const { data, error } = await supabase.rpc("get_graph_health_summary");
      
      if (error) throw error;
      
      return (data || []).map((row: Record<string, unknown>) => ({
        metric_name: row.metric_name as string,
        metric_value: Number(row.metric_value),
        status: row.status as HealthMetric["status"],
      }));
    },
    staleTime: 60 * 1000, // 1 minute
  });
}

// ============================================
// Orphan Nodes Hook
// ============================================

export function useOrphanNodes(limit: number = 50) {
  return useQuery({
    queryKey: graphHealthKeys.orphans(limit),
    queryFn: async (): Promise<OrphanNode[]> => {
      const { data, error } = await supabase.rpc("get_orphan_nodes", {
        p_limit: limit,
      });
      
      if (error) throw error;
      
      return (data || []).map((row: Record<string, unknown>) => ({
        node_id: row.node_id as string,
        node_type: row.node_type as string,
        node_key: row.node_key as string,
        display_name: row.display_name as { vi?: string; en?: string } | null,
        created_at: row.created_at as string,
      }));
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// ============================================
// Query Analytics Hook
// ============================================

export function useQueryAnalytics(daysBack: number = 7) {
  return useQuery({
    queryKey: graphHealthKeys.analytics(`${daysBack}d`),
    queryFn: async (): Promise<AnalyticsSummary> => {
      const since = new Date();
      since.setDate(since.getDate() - daysBack);
      
      const { data, error } = await supabase
        .from("knowledge_graph_analytics")
        .select("*")
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      const queries = data || [];
      const totalQueries = queries.length;
      const avgDuration = totalQueries > 0 
        ? queries.reduce((sum, q) => sum + (q.duration_ms || 0), 0) / totalQueries 
        : 0;
      const slowQueries = queries.filter(q => (q.duration_ms || 0) > 1000).length;
      
      const queryTypeBreakdown: Record<string, number> = {};
      queries.forEach(q => {
        queryTypeBreakdown[q.query_type] = (queryTypeBreakdown[q.query_type] || 0) + 1;
      });
      
      return {
        totalQueries,
        avgDuration: Math.round(avgDuration),
        slowQueries,
        queryTypeBreakdown,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============================================
// Log Query Mutation
// ============================================

export function useLogQuery() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: {
      queryType: "search" | "traverse" | "connected" | "related" | "regulations";
      queryParams?: Record<string, unknown>;
      resultCount: number;
      durationMs: number;
      organizationId?: string;
    }) => {
      const { data, error } = await supabase.rpc("log_knowledge_graph_query", {
        p_query_type: params.queryType,
        p_query_params: JSON.parse(JSON.stringify(params.queryParams || {})),
        p_result_count: params.resultCount,
        p_duration_ms: params.durationMs,
        p_organization_id: params.organizationId || null,
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: graphHealthKeys.analytics() });
    },
  });
}

// ============================================
// Helper: Measure Query Duration
// ============================================

export async function measureQuery<T>(
  queryFn: () => Promise<T>
): Promise<{ result: T; durationMs: number }> {
  const start = performance.now();
  const result = await queryFn();
  const durationMs = Math.round(performance.now() - start);
  return { result, durationMs };
}
