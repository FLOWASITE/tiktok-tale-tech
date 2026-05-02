import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Target } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  clusterId?: string | null;
}

/**
 * Compact badge shown in viewers/list rows when a content is linked to an SEO Pillar.
 * Hover reveals pillar keyword + sister content count.
 */
export default function ClusterContextBadge({ clusterId }: Props) {
  const { data } = useQuery({
    queryKey: ["cluster-context-badge", clusterId],
    enabled: !!clusterId,
    queryFn: async () => {
      const [{ data: cluster }, { count: sisters }] = await Promise.all([
        supabase
          .from("seo_clusters")
          .select("id,name,color,pillar_content_id, seo_keywords:seo_keywords!cluster_id(id, keyword, is_pillar)")
          .eq("id", clusterId!)
          .maybeSingle(),
        supabase
          .from("multi_channel_contents")
          .select("id", { count: "exact", head: true })
          .eq("cluster_id", clusterId!),
      ]);
      const pillarKeyword = (cluster as any)?.seo_keywords?.find((k: any) => k.is_pillar)?.keyword;
      return {
        cluster,
        pillarKeyword,
        sisterCount: Math.max(0, (sisters ?? 0) - 1),
      };
    },
  });

  if (!clusterId || !data?.cluster) return null;
  const c = data.cluster as any;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className="gap-1.5 shrink-0 border-dashed"
            style={{ borderColor: c.color || undefined, color: c.color || undefined }}
          >
            <Target className="w-3 h-3" />
            {c.name}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs space-y-1">
          {data.pillarKeyword && (
            <div>
              <span className="text-muted-foreground">Pillar keyword:</span>{" "}
              <strong>{data.pillarKeyword}</strong>
            </div>
          )}
          <div>
            <span className="text-muted-foreground">Sister content:</span>{" "}
            <strong>{data.sisterCount}</strong>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
