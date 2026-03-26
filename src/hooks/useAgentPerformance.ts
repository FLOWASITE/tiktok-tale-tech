import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';

export interface AgentStats {
  agentName: string;
  totalRuns: number;
  successCount: number;
  failureCount: number;
  avgDurationMs: number;
  avgTokenUsage: number;
  successRate: number;
}

export interface AgentPerformanceData {
  stats: AgentStats[];
  totalSessions: number;
  avgSessionDuration: number;
}

export function useAgentPerformance(dateRange: 'week' | 'month' | 'all' = 'month') {
  const { currentOrganization } = useOrganization();

  const { data, isLoading } = useQuery({
    queryKey: ['agent-performance', currentOrganization?.id, dateRange],
    queryFn: async (): Promise<AgentPerformanceData> => {
      if (!currentOrganization?.id) {
        return { stats: [], totalSessions: 0, avgSessionDuration: 0 };
      }

      // Calculate date filter
      let dateFilter: string | null = null;
      const now = new Date();
      if (dateRange === 'week') {
        dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      } else if (dateRange === 'month') {
        dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      }

      let query = supabase
        .from('agent_execution_logs')
        .select('agent_name, status, duration_ms, token_usage, session_id, created_at')
        .limit(500);

      // Filter by org if the table has organization_id column (best-effort)
      // agent_execution_logs doesn't have org_id column, relying on RLS

      if (dateFilter) {
        query = query.gte('created_at', dateFilter);
      }

      const { data: logs, error } = await query;
      if (error) throw error;
      if (!logs || logs.length === 0) {
        return { stats: [], totalSessions: 0, avgSessionDuration: 0 };
      }

      // Aggregate by agent
      const agentMap = new Map<string, {
        runs: number;
        successes: number;
        totalDuration: number;
        totalTokens: number;
      }>();

      const sessionSet = new Set<string>();

      for (const log of logs) {
        sessionSet.add(log.session_id);
        const existing = agentMap.get(log.agent_name) || {
          runs: 0, successes: 0, totalDuration: 0, totalTokens: 0,
        };
        existing.runs++;
        if (log.status === 'success') existing.successes++;
        existing.totalDuration += log.duration_ms || 0;
        
        // Extract token count from token_usage JSON
        const tokenData = log.token_usage as any;
        if (tokenData && typeof tokenData === 'object') {
          existing.totalTokens += (tokenData.total_tokens || tokenData.output_tokens || 0);
        }
        
        agentMap.set(log.agent_name, existing);
      }

      const stats: AgentStats[] = Array.from(agentMap.entries()).map(([name, data]) => ({
        agentName: name,
        totalRuns: data.runs,
        successCount: data.successes,
        failureCount: data.runs - data.successes,
        avgDurationMs: Math.round(data.totalDuration / data.runs),
        avgTokenUsage: Math.round(data.totalTokens / data.runs),
        successRate: Math.round((data.successes / data.runs) * 100),
      }));

      // Sort by total runs descending
      stats.sort((a, b) => b.totalRuns - a.totalRuns);

      return {
        stats,
        totalSessions: sessionSet.size,
        avgSessionDuration: 0, // Could be computed from session grouping
      };
    },
    enabled: !!currentOrganization?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    performanceData: data || { stats: [], totalSessions: 0, avgSessionDuration: 0 },
    isLoading,
  };
}
