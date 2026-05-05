import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SerpSnapshot {
  id: string;
  keyword_id: string;
  snapshot_at: string;
  top_results: Array<{
    rank: number;
    url: string;
    title: string | null;
    description: string | null;
    host: string;
    our_site: boolean;
  }>;
  median_word_count: number | null;
  common_h2s: string[] | null;
  source: string;
}

export function useLatestSerpSnapshot(keywordId: string | null | undefined) {
  return useQuery({
    queryKey: ["seo-serp-snapshot", keywordId],
    enabled: !!keywordId,
    staleTime: 60_000,
    queryFn: async (): Promise<SerpSnapshot | null> => {
      const { data } = await supabase
        .from("seo_serp_snapshots")
        .select("*")
        .eq("keyword_id", keywordId!)
        .order("snapshot_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return (data as unknown) as SerpSnapshot | null;
    },
  });
}

export function useEnrichSerp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (keywordId: string) => {
      const { data, error } = await supabase.functions.invoke("seo-serp-enrich", {
        body: { keyword_id: keywordId, max_scrape: 5 },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as { snapshot: SerpSnapshot };
    },
    onSuccess: (_d, keywordId) => {
      toast.success("Đã quét SERP & đối thủ");
      qc.invalidateQueries({ queryKey: ["seo-serp-snapshot", keywordId] });
    },
    onError: (e: any) => toast.error(`SERP enrich lỗi: ${e.message}`),
  });
}
