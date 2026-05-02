import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Target, ExternalLink, FileText, Copy } from "lucide-react";
import { Link } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

interface Props {
  clusterId: string;
  currentContentId?: string;
}

/**
 * Sidebar card shown inside MultiChannelViewer when content belongs to an SEO Pillar.
 * Provides coverage %, sister content list, pillar page link, and quick internal links.
 */
export default function ClusterContextCard({ clusterId, currentContentId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["cluster-context-card", clusterId],
    enabled: !!clusterId,
    queryFn: async () => {
      const [clusterRes, coverageRes, sistersRes] = await Promise.all([
        supabase
          .from("seo_clusters")
          .select("id,name,description,color,status,pillar_keyword_id,pillar_content_id")
          .eq("id", clusterId)
          .maybeSingle(),
        (supabase as any)
          .from("cluster_coverage")
          .select("keyword_count, keywords_covered, coverage_pct")
          .eq("cluster_id", clusterId)
          .maybeSingle(),
        supabase
          .from("multi_channel_contents")
          .select("id, topic, created_at")
          .eq("cluster_id", clusterId)
          .order("created_at", { ascending: false })
          .limit(6),
      ]);

      let pillarKw: string | null = null;
      if (clusterRes.data?.pillar_keyword_id) {
        const { data: pk } = await supabase
          .from("seo_keywords")
          .select("keyword")
          .eq("id", clusterRes.data.pillar_keyword_id)
          .maybeSingle();
        pillarKw = pk?.keyword || null;
      }

      return {
        cluster: clusterRes.data,
        coverage: coverageRes.data as any,
        sisters: (sistersRes.data || []).filter((s: any) => s.id !== currentContentId),
        pillarKw,
      };
    },
  });

  if (isLoading || !data?.cluster) return null;
  const c = data.cluster as any;
  const coverage = data.coverage;

  const copyMd = (id: string, title: string) => {
    const md = `[${title}](/multichannel/${id})`;
    navigator.clipboard.writeText(md);
    toast.success("Đã copy markdown link");
  };

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Target className="h-4 w-4" style={{ color: c.color || undefined }} />
          <span className="flex-1 truncate">{c.name}</span>
          <Badge variant="outline" className="capitalize text-[10px]">{c.status}</Badge>
        </CardTitle>
        {data.pillarKw && (
          <p className="text-xs text-muted-foreground">
            Pillar keyword: <strong className="text-foreground">{data.pillarKw}</strong>
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {/* Coverage */}
        {coverage && coverage.keyword_count > 0 && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Coverage</span>
              <span className="font-medium">
                {coverage.keywords_covered}/{coverage.keyword_count} keyword ({coverage.coverage_pct}%)
              </span>
            </div>
            <Progress value={Number(coverage.coverage_pct) || 0} className="h-1.5" />
          </div>
        )}

        {/* Pillar content */}
        {c.pillar_content_id && c.pillar_content_id !== currentContentId && (
          <Link
            to={`/multichannel/${c.pillar_content_id}`}
            className="flex items-center gap-2 p-2 rounded-md border bg-muted/30 hover:bg-muted text-xs"
          >
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="flex-1">Trang trụ (pillar page)</span>
            <ExternalLink className="h-3 w-3 text-muted-foreground" />
          </Link>
        )}

        {/* Sister content */}
        {data.sisters.length > 0 && (
          <div>
            <div className="text-xs text-muted-foreground mb-1.5">
              Sister content ({data.sisters.length})
            </div>
            <div className="space-y-1">
              {data.sisters.slice(0, 5).map((s: any) => (
                <div
                  key={s.id}
                  className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 group"
                >
                  <Link
                    to={`/multichannel/${s.id}`}
                    className="flex-1 truncate text-xs hover:underline"
                  >
                    {s.topic || "Không tên"}
                  </Link>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100"
                    onClick={() => copyMd(s.id, s.topic || "Bài viết")}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.sisters.length === 0 && !c.pillar_content_id && (
          <p className="text-xs text-muted-foreground italic">
            Chưa có bài khác trong cluster này — đây là viên gạch đầu tiên.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
