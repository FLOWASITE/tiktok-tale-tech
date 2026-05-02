import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Trash2, Sparkles, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const STATUS_OPTIONS = ["all","new","researching","planned","assigned","published","tracking","archived"];
const INTENT_OPTIONS = ["all","informational","commercial","transactional","navigational"];

export default function KeywordExplorerTab() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id;
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [intentFilter, setIntentFilter] = useState("all");
  const [clusterFilter, setClusterFilter] = useState("all");

  const { data: clusters } = useQuery({
    queryKey: ["clusters-list", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase.from("keyword_clusters")
        .select("id,name").eq("organization_id", orgId!).order("name");
      return data || [];
    },
  });

  const { data: keywords, isLoading } = useQuery({
    queryKey: ["seo-keywords", orgId, search, statusFilter, intentFilter, clusterFilter],
    enabled: !!orgId,
    queryFn: async () => {
      let q = supabase.from("seo_keywords")
        .select("id,keyword,search_volume,difficulty,intent,funnel_stage,priority_score,status,cluster_id,assigned_landing_page_id,cpc_vnd")
        .eq("organization_id", orgId!)
        .order("priority_score", { ascending: false })
        .limit(500);
      if (search.trim()) q = q.ilike("keyword", `%${search.trim()}%`);
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      if (intentFilter !== "all") q = q.eq("intent", intentFilter);
      if (clusterFilter !== "all") q = q.eq("cluster_id", clusterFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const handleDelete = async (id: string) => {
    if (!confirm("Xóa keyword này?")) return;
    const { error } = await supabase.from("seo_keywords").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Đã xóa");
    qc.invalidateQueries({ queryKey: ["seo-keywords"] });
    qc.invalidateQueries({ queryKey: ["seo-keywords-dashboard"] });
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    const { error } = await supabase.from("seo_keywords").update({ status: newStatus }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["seo-keywords"] });
  };

  const clusterMap = new Map((clusters || []).map(c => [c.id, c.name]));

  if (!orgId) return <p className="text-muted-foreground">Chọn workspace.</p>;

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          <Input placeholder="Tìm keyword..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={intentFilter} onValueChange={setIntentFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>{INTENT_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={clusterFilter} onValueChange={setClusterFilter}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Cluster" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả cluster</SelectItem>
              {(clusters || []).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
        ) : (
          <div className="rounded border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Keyword</TableHead>
                  <TableHead className="text-right">Volume</TableHead>
                  <TableHead className="text-right">KD</TableHead>
                  <TableHead>Intent</TableHead>
                  <TableHead>Funnel</TableHead>
                  <TableHead>Cluster</TableHead>
                  <TableHead className="text-right">Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(keywords || []).map(k => (
                  <TableRow key={k.id}>
                    <TableCell className="font-medium max-w-xs truncate">{k.keyword}</TableCell>
                    <TableCell className="text-right">{k.search_volume?.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{k.difficulty}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{k.intent}</Badge></TableCell>
                    <TableCell><Badge variant="secondary" className="text-xs">{k.funnel_stage}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{k.cluster_id ? clusterMap.get(k.cluster_id) : "—"}</TableCell>
                    <TableCell className="text-right font-mono">{k.priority_score}</TableCell>
                    <TableCell>
                      <Select value={k.status} onValueChange={v => handleStatusChange(k.id, v)}>
                        <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{STATUS_OPTIONS.filter(s => s !== "all").map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(k.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {(!keywords || keywords.length === 0) && (
                  <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Chưa có keyword. Vào tab Research Lab để bắt đầu.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
        <p className="text-xs text-muted-foreground">Hiển thị tối đa 500 keyword. Dùng filter để thu hẹp.</p>
      </CardContent>
    </Card>
  );
}
