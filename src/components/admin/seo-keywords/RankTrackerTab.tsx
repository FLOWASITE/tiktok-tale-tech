import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, TrendingDown, Minus, RefreshCw, Loader2 } from "lucide-react";
import { useOrganizationContext } from "@/contexts/OrganizationContext";
import { toast } from "sonner";

export default function RankTrackerTab() {
  const { currentOrganization } = useOrganizationContext();
  const [running, setRunning] = useState(false);

  const { data: keywords, refetch, isLoading } = useQuery({
    queryKey: ["seo-rank-tracking", currentOrganization?.id],
    enabled: !!currentOrganization?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seo_keywords")
        .select("id, keyword, locale, current_rank, previous_rank, rank_change, last_checked_at, search_volume, difficulty")
        .eq("organization_id", currentOrganization!.id)
        .order("current_rank", { ascending: true, nullsFirst: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const runTracker = async () => {
    if (!currentOrganization?.id) return;
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("seo-rank-tracker", {
        body: { organization_id: currentOrganization.id, limit: 30 },
      });
      if (error) throw error;
      toast.success(`Đã kiểm tra ${data.checked} keyword, tìm thấy ${data.found} kết quả xếp hạng`);
      refetch();
    } catch (e: any) {
      toast.error(`Lỗi rank tracker: ${e.message}`);
    } finally {
      setRunning(false);
    }
  };

  const tracked = keywords?.filter(k => k.current_rank != null) ?? [];
  const top10 = tracked.filter(k => (k.current_rank ?? 999) <= 10).length;
  const top30 = tracked.filter(k => (k.current_rank ?? 999) <= 30).length;
  const avgRank = tracked.length ? Math.round(tracked.reduce((s, k) => s + (k.current_rank ?? 0), 0) / tracked.length) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Rank Tracker</h2>
          <p className="text-sm text-muted-foreground">
            Theo dõi vị trí Google SERP. Tự động chạy mỗi <span className="font-medium">thứ Hai 02:00 UTC</span>.
          </p>
        </div>
        <Button onClick={runTracker} disabled={running} className="gap-2">
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Chạy kiểm tra ngay
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Đã track" value={tracked.length} />
        <StatCard label="Top 10" value={top10} accent="success" />
        <StatCard label="Top 30" value={top30} />
        <StatCard label="Rank trung bình" value={avgRank ?? "—"} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bảng xếp hạng keywords</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Đang tải…</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Keyword</TableHead>
                  <TableHead>Locale</TableHead>
                  <TableHead className="text-right">Volume</TableHead>
                  <TableHead className="text-right">Rank</TableHead>
                  <TableHead className="text-right">Thay đổi</TableHead>
                  <TableHead>Kiểm tra lần cuối</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keywords?.slice(0, 50).map((k) => (
                  <TableRow key={k.id}>
                    <TableCell className="font-medium">{k.keyword}</TableCell>
                    <TableCell><Badge variant="outline">{k.locale}</Badge></TableCell>
                    <TableCell className="text-right">{k.search_volume?.toLocaleString() ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      {k.current_rank ? (
                        <Badge variant={k.current_rank <= 10 ? "default" : k.current_rank <= 30 ? "secondary" : "outline"}>
                          #{k.current_rank}
                        </Badge>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <RankChange change={k.rank_change} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {k.last_checked_at ? new Date(k.last_checked_at).toLocaleString("vi-VN") : "Chưa"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number | string; accent?: "success" }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className={`text-3xl font-bold mt-1 ${accent === "success" ? "text-emerald-600" : ""}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function RankChange({ change }: { change: number | null }) {
  if (change == null || change === 0) return <span className="text-muted-foreground inline-flex items-center gap-1"><Minus className="h-3 w-3" />0</span>;
  if (change > 0) return <span className="text-emerald-600 inline-flex items-center gap-1"><TrendingUp className="h-3 w-3" />+{change}</span>;
  return <span className="text-rose-600 inline-flex items-center gap-1"><TrendingDown className="h-3 w-3" />{change}</span>;
}
