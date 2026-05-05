import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RankPoint {
  checked_at: string;
  rank: number | null;
  serp_url: string | null;
  source: string | null;
}

export function useRankHistory(keywordId: string | null | undefined, days = 90) {
  return useQuery({
    queryKey: ["seo-rank-history", keywordId, days],
    enabled: !!keywordId,
    staleTime: 60_000,
    queryFn: async (): Promise<RankPoint[]> => {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("seo_rank_history")
        .select("checked_at, rank, serp_url, source")
        .eq("keyword_id", keywordId!)
        .gte("checked_at", since)
        .order("checked_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as RankPoint[];
    },
  });
}

export function useLatestTrackerRun(orgId: string | undefined | null) {
  return useQuery({
    queryKey: ["seo-tracker-runs-latest", orgId],
    enabled: !!orgId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("seo_rank_tracker_runs")
        .select("id, started_at, finished_at, checked, found, errors, triggered_by")
        .or(`organization_id.eq.${orgId},organization_id.is.null`)
        .order("started_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });
}
