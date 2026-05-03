import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useSeoKeywords } from "@/hooks/useSeoKeywords";

/**
 * Compute orphan + cannibalization counts for the current workspace.
 * Reuses the shared `seo-keywords-shared` cache, only fetches a slim
 * `target_keyword_ids` projection from `multi_channel_contents`.
 */
export function useSeoOverviewCounts() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id;
  const { data: keywords = [] } = useSeoKeywords();

  const { data: kwIdLists = [] } = useQuery({
    queryKey: ["seo-overview-counts-contents", orgId],
    enabled: !!orgId,
    staleTime: 30_000,
    queryFn: async (): Promise<string[][]> => {
      const { data } = await supabase
        .from("multi_channel_contents")
        .select("target_keyword_ids")
        .eq("organization_id", orgId!)
        .limit(500);
      return (data || []).map((r: any) => r.target_keyword_ids || []);
    },
  });

  return useMemo(() => {
    const counts = new Map<string, number>();
    kwIdLists.forEach((list) => {
      list.forEach((kid) => counts.set(kid, (counts.get(kid) || 0) + 1));
    });
    let orphan = 0;
    let cannibal = 0;
    keywords.forEach((k) => {
      const n = counts.get(k.id) || 0;
      if (n === 0) orphan += 1;
      else if (n >= 2) cannibal += 1;
    });
    return { orphan, cannibal };
  }, [keywords, kwIdLists]);
}
