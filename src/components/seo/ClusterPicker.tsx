import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Target } from "lucide-react";

interface Props {
  value: string | null | undefined;
  onChange: (clusterId: string | null, clusterMeta?: { keywordIds: string[] }) => void;
  className?: string;
}

/**
 * Pillar (SEO Cluster) picker. When user selects a cluster, parent receives both
 * the cluster id and the list of keyword ids belonging to that cluster, so the
 * KeywordTargetPicker can be auto-populated.
 */
export default function ClusterPicker({ value, onChange, className }: Props) {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id;

  const { data: clusters = [] } = useQuery({
    queryKey: ["seo-clusters-picker", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seo_clusters")
        .select("id,name,color,status")
        .eq("organization_id", orgId!)
        .in("status", ["planning", "active"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const handleChange = async (next: string) => {
    if (next === "__none__") {
      onChange(null);
      return;
    }
    // Fetch keyword ids for this cluster
    const { data } = await supabase
      .from("seo_keywords")
      .select("id")
      .eq("cluster_id", next);
    const keywordIds = (data || []).map((r) => r.id);
    onChange(next, { keywordIds });
  };

  return (
    <div className={className}>
      <Select value={value || "__none__"} onValueChange={handleChange}>
        <SelectTrigger className="h-9">
          <div className="flex items-center gap-1.5 min-w-0">
            <Target className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <SelectValue placeholder="Không gắn pillar" />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">Không gắn pillar</SelectItem>
          {clusters.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              <div className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: c.color || "#6B7280" }}
                />
                {c.name}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
