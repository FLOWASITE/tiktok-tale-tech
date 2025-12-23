import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CacheStat {
  function_name: string;
  cache_scope: string;
  total_entries: number;
  total_hits: number;
  avg_hit_count: number;
  oldest_entry: string;
  newest_entry: string;
}

interface CacheOverview {
  totalEntries: number;
  totalHits: number;
  hitRate: number;
  estimatedSavings: number;
  statsByFunction: CacheStat[];
}

export function useCacheAnalytics(organizationId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch cache statistics
  const statsQuery = useQuery({
    queryKey: ["cache-stats", organizationId],
    queryFn: async (): Promise<CacheOverview> => {
      const { data, error } = await supabase.rpc("get_cache_stats", {
        p_organization_id: organizationId || null,
      });

      if (error) throw error;

      const stats = (data as CacheStat[]) || [];
      const totalEntries = stats.reduce((sum, s) => sum + s.total_entries, 0);
      const totalHits = stats.reduce((sum, s) => sum + s.total_hits, 0);
      
      // Estimate: Each cache hit saves ~$0.003 (average AI call cost)
      const estimatedSavings = totalHits * 0.003;
      
      // Hit rate calculation (hits / (hits + entries as approximate requests))
      const totalRequests = totalHits + totalEntries;
      const hitRate = totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0;

      return {
        totalEntries,
        totalHits,
        hitRate,
        estimatedSavings,
        statsByFunction: stats,
      };
    },
    staleTime: 30000, // 30 seconds
  });

  // Clear cache mutation
  const clearCacheMutation = useMutation({
    mutationFn: async (params: { functionName?: string; organizationId?: string }) => {
      // Delete from cache table based on filters
      let query = supabase.from("ai_response_cache").delete();
      
      if (params.functionName) {
        query = query.eq("function_name", params.functionName);
      }
      
      if (params.organizationId) {
        query = query.eq("organization_id", params.organizationId);
      }
      
      const { error, count } = await query.select("id");
      
      if (error) throw error;
      return count || 0;
    },
    onSuccess: (count, variables) => {
      queryClient.invalidateQueries({ queryKey: ["cache-stats"] });
      toast({
        title: "Cache cleared",
        description: `Đã xóa ${count} entries${variables.functionName ? ` cho ${variables.functionName}` : ""}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Cleanup expired entries
  const cleanupMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("cleanup_expired_cache");
      if (error) throw error;
      return data as number;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["cache-stats"] });
      toast({
        title: "Cleanup complete",
        description: `Đã xóa ${count} expired entries`,
      });
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    stats: statsQuery.data,
    isLoading: statsQuery.isLoading,
    error: statsQuery.error,
    refetch: statsQuery.refetch,
    clearCache: clearCacheMutation.mutate,
    isClearing: clearCacheMutation.isPending,
    cleanupExpired: cleanupMutation.mutate,
    isCleaningUp: cleanupMutation.isPending,
  };
}
