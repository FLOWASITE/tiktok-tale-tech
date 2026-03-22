import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DailyStat {
  function_name: string;
  stat_date: string;
  total_calls: number;
  error_count: number;
  cold_start_count: number;
  avg_duration_ms: number;
  p50_duration_ms: number;
  p95_duration_ms: number;
  max_duration_ms: number;
  min_duration_ms: number;
}

export interface RecentMetric {
  id: string;
  function_name: string;
  duration_ms: number;
  status_code: number;
  is_cold_start: boolean;
  had_error: boolean;
  error_message: string | null;
  created_at: string;
}

export interface MetricsSummary {
  totalCalls: number;
  errorRate: number;
  coldStartRate: number;
  avgDuration: number;
  p95Duration: number;
  topFunctions: Array<{
    name: string;
    calls: number;
    errors: number;
    avgMs: number;
    p95Ms: number;
    coldStarts: number;
  }>;
}

export function useEdgeFunctionDailyStats(days = 14) {
  return useQuery({
    queryKey: ['edge-function-daily-stats', days],
    queryFn: async (): Promise<DailyStat[]> => {
      const since = new Date();
      since.setDate(since.getDate() - days);
      
      const { data, error } = await supabase
        .from('edge_function_daily_stats')
        .select('*')
        .gte('stat_date', since.toISOString().split('T')[0])
        .order('stat_date', { ascending: true });
      
      if (error) throw error;
      return (data || []) as DailyStat[];
    },
    refetchInterval: 60000,
  });
}

export function useRecentMetrics(limit = 50) {
  return useQuery({
    queryKey: ['edge-function-recent-metrics', limit],
    queryFn: async (): Promise<RecentMetric[]> => {
      const { data, error } = await supabase
        .from('edge_function_metrics')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return (data || []) as RecentMetric[];
    },
    refetchInterval: 15000,
  });
}

export function useMetricsSummary(days = 7) {
  const { data: dailyStats, isLoading } = useEdgeFunctionDailyStats(days);

  const summary: MetricsSummary | null = dailyStats && dailyStats.length > 0 ? (() => {
    const byFunction = new Map<string, {
      calls: number; errors: number; coldStarts: number;
      durations: number[]; p95s: number[];
    }>();

    let totalCalls = 0, totalErrors = 0, totalColdStarts = 0;
    const allDurations: number[] = [];

    for (const s of dailyStats) {
      totalCalls += s.total_calls;
      totalErrors += s.error_count;
      totalColdStarts += s.cold_start_count;
      allDurations.push(s.avg_duration_ms);

      const existing = byFunction.get(s.function_name) || {
        calls: 0, errors: 0, coldStarts: 0, durations: [], p95s: [],
      };
      existing.calls += s.total_calls;
      existing.errors += s.error_count;
      existing.coldStarts += s.cold_start_count;
      existing.durations.push(s.avg_duration_ms);
      existing.p95s.push(s.p95_duration_ms);
      byFunction.set(s.function_name, existing);
    }

    const topFunctions = [...byFunction.entries()]
      .map(([name, d]) => ({
        name,
        calls: d.calls,
        errors: d.errors,
        avgMs: Math.round(d.durations.reduce((a, b) => a + b, 0) / d.durations.length),
        p95Ms: Math.max(...d.p95s),
        coldStarts: d.coldStarts,
      }))
      .sort((a, b) => b.calls - a.calls)
      .slice(0, 20);

    return {
      totalCalls,
      errorRate: totalCalls > 0 ? (totalErrors / totalCalls) * 100 : 0,
      coldStartRate: totalCalls > 0 ? (totalColdStarts / totalCalls) * 100 : 0,
      avgDuration: allDurations.length > 0
        ? Math.round(allDurations.reduce((a, b) => a + b, 0) / allDurations.length)
        : 0,
      p95Duration: 0,
      topFunctions,
    };
  })() : null;

  return { summary, isLoading };
}
