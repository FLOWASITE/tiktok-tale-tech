import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, FolderTree, Link2, TrendingUp } from "lucide-react";

export default function KeywordDashboardTab() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id;

  const { data, isLoading } = useQuery({
    queryKey: ["seo-keywords-dashboard", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const [kwRes, clRes] = await Promise.all([
        supabase.from("seo_keywords")
          .select("id,status,priority_score,funnel_stage,intent,keyword,assigned_landing_page_id")
          .eq("organization_id", orgId!),
        supabase.from("seo_clusters")
          .select("id,name")
          .eq("organization_id", orgId!),
      ]);
      if (kwRes.error) throw kwRes.error;
      if (clRes.error) throw clRes.error;

      const keywords = kwRes.data || [];
      const clusters = clRes.data || [];

      const total = keywords.length;
      const assigned = keywords.filter(k => k.assigned_landing_page_id).length;
      const unassigned = total - assigned;
      const avgPriority = total > 0
        ? Math.round(keywords.reduce((s, k) => s + (k.priority_score || 0), 0) / total)
        : 0;
      const funnel = {
        TOFU: keywords.filter(k => k.funnel_stage === "TOFU").length,
        MOFU: keywords.filter(k => k.funnel_stage === "MOFU").length,
        BOFU: keywords.filter(k => k.funnel_stage === "BOFU").length,
      };
      const topUnassigned = keywords
        .filter(k => !k.assigned_landing_page_id)
        .sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0))
        .slice(0, 10);

      return { total, assigned, unassigned, avgPriority, clusters: clusters.length, funnel, topUnassigned };
    },
  });

  if (!orgId) return <p className="text-muted-foreground">Chọn workspace để xem dashboard.</p>;
  if (isLoading) return <div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-28" />)}</div>;
  if (!data) return null;

  const kpis = [
    { label: "Tổng từ khóa", value: data.total, icon: Search, color: "text-blue-500" },
    { label: "Clusters", value: data.clusters, icon: FolderTree, color: "text-purple-500" },
    { label: "Đã gán page", value: `${data.assigned}/${data.total}`, icon: Link2, color: "text-emerald-500" },
    { label: "Avg priority", value: data.avgPriority, icon: TrendingUp, color: "text-amber-500" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map(k => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{k.label}</p>
                  <p className="text-2xl font-bold mt-1">{k.value}</p>
                </div>
                <k.icon className={`h-5 w-5 ${k.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Funnel distribution</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(["TOFU","MOFU","BOFU"] as const).map(stage => {
              const count = data.funnel[stage];
              const pct = data.total > 0 ? (count / data.total) * 100 : 0;
              return (
                <div key={stage}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{stage}</span>
                    <span className="text-muted-foreground">{count} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Top 10 high-priority chưa gán page</CardTitle></CardHeader>
          <CardContent>
            {data.topUnassigned.length === 0 ? (
              <p className="text-sm text-muted-foreground">Tất cả keyword đã được gán.</p>
            ) : (
              <ul className="space-y-2">
                {data.topUnassigned.map(k => (
                  <li key={k.id} className="flex items-center justify-between text-sm">
                    <span className="truncate flex-1">{k.keyword}</span>
                    <Badge variant="secondary" className="ml-2">{k.priority_score}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
