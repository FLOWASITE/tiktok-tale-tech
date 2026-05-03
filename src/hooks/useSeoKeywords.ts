import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";

export interface SeoKeywordRow {
  id: string;
  keyword: string;
  search_volume: number | null;
  priority_score: number | null;
  status: string;
  cluster_id: string | null;
  funnel_stage: string | null;
  intent: string | null;
  assigned_landing_page_id: string | null;
}

const SHARED_KEY = (orgId?: string) => ["seo-keywords-shared", orgId];

/**
 * Shared cache for seo_keywords (top 1000 by priority) per organization.
 * Use `useSeoKeywordsCache` to patch entries optimistically.
 */
export function useSeoKeywords() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id;
  return useQuery({
    queryKey: SHARED_KEY(orgId),
    enabled: !!orgId,
    staleTime: 30_000,
    queryFn: async (): Promise<SeoKeywordRow[]> => {
      const { data } = await supabase
        .from("seo_keywords")
        .select(
          "id,keyword,search_volume,priority_score,status,cluster_id,funnel_stage,intent,assigned_landing_page_id"
        )
        .eq("organization_id", orgId!)
        .order("priority_score", { ascending: false })
        .limit(1000);
      return (data as SeoKeywordRow[]) || [];
    },
  });
}

export function useSeoKeywordsCache() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id;
  const qc = useQueryClient();
  return {
    patch: (id: string, patch: Partial<SeoKeywordRow>) => {
      qc.setQueryData<SeoKeywordRow[]>(SHARED_KEY(orgId), (prev) =>
        (prev || []).map((k) => (k.id === id ? { ...k, ...patch } : k))
      );
    },
    invalidate: () => qc.invalidateQueries({ queryKey: SHARED_KEY(orgId) }),
  };
}
