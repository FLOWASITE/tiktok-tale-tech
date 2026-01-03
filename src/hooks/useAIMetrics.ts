import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AIMetricsSummary {
  totalCalls: number;
  totalCallsToday: number;
  totalCallsWeek: number;
  averageDurationMs: number;
  totalTokensEstimated: number;
  errorRate: number;
  cacheHitRate: number;
}

export interface AIMetricsByFunction {
  functionName: string;
  callCount: number;
  avgDurationMs: number;
  totalTokens: number;
  errorCount: number;
}

export interface AIMetricsDaily {
  date: string;
  callCount: number;
  avgDurationMs: number;
  errorCount: number;
}

export interface RecentAICall {
  id: string;
  functionName: string;
  totalDurationMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
  hadError: boolean;
  errorMessage: string | null;
  createdAt: string;
}

export function useAIMetrics(organizationId?: string) {
  // Summary stats
  const summaryQuery = useQuery({
    queryKey: ['ai-metrics-summary', organizationId],
    queryFn: async (): Promise<AIMetricsSummary> => {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

      // Get all metrics
      let query = supabase.from('ai_metrics').select('*');
      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }
      const { data: allMetrics, error } = await query;
      if (error) throw error;

      const metrics = allMetrics || [];
      const totalCalls = metrics.length;
      const totalCallsToday = metrics.filter(m => m.created_at >= todayStart).length;
      const totalCallsWeek = metrics.filter(m => m.created_at >= weekStart).length;
      const avgDuration = metrics.length > 0 
        ? metrics.reduce((sum, m) => sum + (m.total_duration_ms || 0), 0) / metrics.length 
        : 0;
      const totalTokens = metrics.reduce((sum, m) => 
        sum + (m.input_tokens_estimated || 0) + (m.output_tokens_estimated || 0), 0);
      const errorCount = metrics.filter(m => m.had_error).length;
      const errorRate = totalCalls > 0 ? (errorCount / totalCalls) * 100 : 0;

      // Get cache stats
      const { data: cacheStats } = await supabase.rpc('get_cache_stats', {
        p_organization_id: organizationId || null
      });
      
      const totalHits = cacheStats?.reduce((sum: number, s: any) => sum + (s.total_hits || 0), 0) || 0;
      const totalEntries = cacheStats?.reduce((sum: number, s: any) => sum + (s.total_entries || 0), 0) || 0;
      const cacheHitRate = totalEntries > 0 ? (totalHits / (totalHits + totalEntries)) * 100 : 0;

      return {
        totalCalls,
        totalCallsToday,
        totalCallsWeek,
        averageDurationMs: Math.round(avgDuration),
        totalTokensEstimated: totalTokens,
        errorRate: Math.round(errorRate * 10) / 10,
        cacheHitRate: Math.round(cacheHitRate * 10) / 10,
      };
    },
    staleTime: 30000,
  });

  // By function breakdown
  const byFunctionQuery = useQuery({
    queryKey: ['ai-metrics-by-function', organizationId],
    queryFn: async (): Promise<AIMetricsByFunction[]> => {
      let query = supabase.from('ai_metrics').select('*');
      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }
      const { data, error } = await query;
      if (error) throw error;

      const grouped = (data || []).reduce((acc, m) => {
        const fn = m.function_name;
        if (!acc[fn]) {
          acc[fn] = { calls: [], errors: 0, totalDuration: 0, totalTokens: 0 };
        }
        acc[fn].calls.push(m);
        acc[fn].totalDuration += m.total_duration_ms || 0;
        acc[fn].totalTokens += (m.input_tokens_estimated || 0) + (m.output_tokens_estimated || 0);
        if (m.had_error) acc[fn].errors++;
        return acc;
      }, {} as Record<string, any>);

      return Object.entries(grouped).map(([fn, data]: [string, any]) => ({
        functionName: fn,
        callCount: data.calls.length,
        avgDurationMs: Math.round(data.totalDuration / data.calls.length),
        totalTokens: data.totalTokens,
        errorCount: data.errors,
      })).sort((a, b) => b.callCount - a.callCount);
    },
    staleTime: 30000,
  });

  // Daily trend (last 7 days)
  const dailyQuery = useQuery({
    queryKey: ['ai-metrics-daily', organizationId],
    queryFn: async (): Promise<AIMetricsDaily[]> => {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      
      let query = supabase
        .from('ai_metrics')
        .select('*')
        .gte('created_at', weekAgo);
      
      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }
      
      const { data, error } = await query;
      if (error) throw error;

      // Group by date
      const grouped = (data || []).reduce((acc, m) => {
        const date = m.created_at.split('T')[0];
        if (!acc[date]) {
          acc[date] = { calls: [], errors: 0, totalDuration: 0 };
        }
        acc[date].calls.push(m);
        acc[date].totalDuration += m.total_duration_ms || 0;
        if (m.had_error) acc[date].errors++;
        return acc;
      }, {} as Record<string, any>);

      // Fill in missing dates
      const result: AIMetricsDaily[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        const dayData = grouped[dateStr];
        result.push({
          date: dateStr,
          callCount: dayData?.calls.length || 0,
          avgDurationMs: dayData ? Math.round(dayData.totalDuration / dayData.calls.length) : 0,
          errorCount: dayData?.errors || 0,
        });
      }
      return result;
    },
    staleTime: 30000,
  });

  // Recent calls
  const recentQuery = useQuery({
    queryKey: ['ai-metrics-recent', organizationId],
    queryFn: async (): Promise<RecentAICall[]> => {
      let query = supabase
        .from('ai_metrics')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }
      
      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(m => ({
        id: m.id,
        functionName: m.function_name,
        totalDurationMs: m.total_duration_ms,
        inputTokens: m.input_tokens_estimated,
        outputTokens: m.output_tokens_estimated,
        hadError: m.had_error || false,
        errorMessage: m.error_message,
        createdAt: m.created_at,
      }));
    },
    staleTime: 10000,
  });

  return {
    summary: summaryQuery.data,
    byFunction: byFunctionQuery.data,
    daily: dailyQuery.data,
    recent: recentQuery.data,
    isLoading: summaryQuery.isLoading || byFunctionQuery.isLoading || dailyQuery.isLoading,
    refetch: () => {
      summaryQuery.refetch();
      byFunctionQuery.refetch();
      dailyQuery.refetch();
      recentQuery.refetch();
    },
  };
}
