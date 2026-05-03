import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";

export interface SeoPillarLite {
  id: string;
  name: string;
  color: string | null;
}

/**
 * Shared cache for seo_clusters list (id, name, color) per organization.
 * queryKey: ["seo-pillars-shared", orgId]
 */
export function useSeoPillars() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id;
  return useQuery({
    queryKey: ["seo-pillars-shared", orgId],
    enabled: !!orgId,
    staleTime: 60_000,
    queryFn: async (): Promise<SeoPillarLite[]> => {
      const { data } = await supabase
        .from("seo_clusters")
        .select("id,name,color")
        .eq("organization_id", orgId!)
        .order("name");
      return (data as SeoPillarLite[]) || [];
    },
  });
}
