import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Trash2, Target, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const STATUS_OPTIONS = ["all", "new", "researching", "planned", "assigned", "published", "tracking", "archived"];
const INTENT_OPTIONS = ["all", "informational", "commercial", "transactional", "navigational"];

const NONE = "__none__";
const NO_PILLAR = "__no_pillar__";

export default function KeywordExplorerTab() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id;
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [intentFilter, setIntentFilter] = useState("all");
  const [pillarFilter, setPillarFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkPillar, setBulkPillar] = useState<string>("");

  const { data: pillars = [] } = useQuery({
    queryKey: ["seo-pillars-list", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase.from("seo_clusters")
        .select("id,name,color").eq("organization_id", orgId!).order("name");
      return data || [];
    },
  });

  const { data: keywords, isLoading } = useQuery({
    queryKey: ["seo-keywords", orgId, search, statusFilter, intentFilter, pillarFilter],
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
      if (pillarFilter === NO_PILLAR) q = q.is("cluster_id", null);
      else if (pillarFilter !== "all") q = q.eq("cluster_id", pillarFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const pillarMap = useMemo(() => new Map(pillars.map(p => [p.id, p])), [pillars]);

  const refreshPillarStatuses = async (ids: (string | null | undefined)[]) => {
    const unique = Array.from(new Set(ids.filter(Boolean) as string[]));
    await Promise.all(
      unique.map(id => (supabase.rpc as any)("refresh_cluster_status", { _cluster_id: id }))
    );
  };

  const handleDelete = async (id: string, oldPillar?: string | null) => {
    if (!confirm("Xóa keyword này?")) return;
    const { error } = await supabase.from("seo_keywords").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Đã xóa");
    if (oldPillar) await refreshPillarStatuses([oldPillar]);
    qc.invalidateQueries({ queryKey: ["seo-keywords"] });
    qc.invalidateQueries({ queryKey: ["seo-keywords-dashboard"] });
    qc.invalidateQueries({ queryKey: ["seo-cluster-coverage"] });
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    const { error } = await supabase.from("seo_keywords").update({ status: newStatus }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["seo-keywords"] });
  };

  const handlePillarChange = async (id: string, newPillar: string, oldPillar?: string | null) => {
    const value = newPillar === NONE ? null : newPillar;
    const { error } = await supabase.from("seo_keywords").update({ cluster_id: value }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(value ? "Đã gán vào pillar" : "Đã gỡ khỏi pillar");
    await refreshPillarStatuses([oldPillar, value]);
    qc.invalidateQueries({ queryKey: ["seo-keywords"] });
    qc.invalidateQueries({ queryKey: ["seo-cluster-coverage"] });
    qc.invalidateQueries({ queryKey: ["seo-cluster-keywords"] });
  };

  const toggleOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    if (!keywords) return;
    if (selectedIds.size === keywords.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(keywords.map(k => k.id)));
  };

  const handleBulkAssign = async () => {
    if (!bulkPillar || selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const value = bulkPillar === NONE ? null : bulkPillar;
    const oldPillars = (keywords || []).filter(k => selectedIds.has(k.id)).map(k => k.cluster_id);
    const { error } = await supabase.from("seo_keywords").update({ cluster_id: value }).in("id", ids);
    if (error) return toast.error(error.message);
    toast.success(`Đã ${value ? "gán" : "gỡ"} ${ids.length} keyword`);
    await refreshPillarStatuses([...oldPillars, value]);
    setSelectedIds(new Set());
    setBulkPillar("");
    qc.invalidateQueries({ queryKey: ["seo-keywords"] });
    qc.invalidateQueries({ queryKey: ["seo-cluster-coverage"] });
    qc.invalidateQueries({ queryKey: ["seo-cluster-keywords"] });
  };

  if (!orgId) return <p className="text-muted-foreground">Chọn workspace.</p>;

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          <Input placeholder="Tìm keyword..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={intentFilter} onValueChange={setIntentFilter}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>{INTENT_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={pillarFilter} onValueChange={setPillarFilter}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Pillar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả pillar</SelectItem>
              <SelectItem value={NO_PILLAR}>— Chưa gán pillar —</SelectItem>
              {pillars.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color || "#6B7280" }} />
                    {p.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 p-2.5 bg-muted/40 border rounded-md">
            <Target className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{selectedIds.size} keyword đã chọn</span>
            <div className="flex-1" />
            <Select value={bulkPillar} onValueChange={setBulkPillar}>
              <SelectTrigger className="w-56 h-8">
                <SelectValue placeholder="Chọn pillar..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>— Gỡ khỏi pillar —</SelectItem>
                {pillars.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color || "#6B7280" }} />
                      {p.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={handleBulkAssign} disabled={!bulkPillar}>
              Gán
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
              Hủy
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
        ) : (
          <div className="rounded border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">
                    <Checkbox
                      checked={!!keywords && keywords.length > 0 && selectedIds.size === keywords.length}
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
                  <TableHead>Keyword</TableHead>
                  <TableHead className="text-right">Volume</TableHead>
                  <TableHead className="text-right">KD</TableHead>
                  <TableHead>Intent</TableHead>
                  <TableHead>Funnel</TableHead>
                  <TableHead>Pillar</TableHead>
                  <TableHead className="text-right">Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(keywords || []).map(k => {
                  const pillar = k.cluster_id ? pillarMap.get(k.cluster_id) : null;
                  return (
                    <TableRow key={k.id} data-state={selectedIds.has(k.id) ? "selected" : undefined}>
                      <TableCell>
                        <Checkbox checked={selectedIds.has(k.id)} onCheckedChange={() => toggleOne(k.id)} />
                      </TableCell>
                      <TableCell className="font-medium max-w-xs truncate">{k.keyword}</TableCell>
                      <TableCell className="text-right">{k.search_volume?.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{k.difficulty}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{k.intent}</Badge></TableCell>
                      <TableCell><Badge variant="secondary" className="text-xs">{k.funnel_stage}</Badge></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Select
                            value={k.cluster_id || NONE}
                            onValueChange={v => handlePillarChange(k.id, v, k.cluster_id)}
                          >
                            <SelectTrigger className="h-7 w-40 text-xs gap-1">
                              {pillar ? (
                                <span className="inline-flex items-center gap-1.5 truncate">
                                  <span
                                    className="h-2 w-2 rounded-full shrink-0"
                                    style={{ backgroundColor: pillar.color || "#6B7280" }}
                                  />
                                  <span className="truncate">{pillar.name}</span>
                                </span>
                              ) : (
                                <span className="text-muted-foreground">— Chưa gán —</span>
                              )}
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={NONE}>— Chưa gán —</SelectItem>
                              {pillars.map(p => (
                                <SelectItem key={p.id} value={p.id}>
                                  <span className="inline-flex items-center gap-2">
                                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color || "#6B7280" }} />
                                    {p.name}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {pillar && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              title="Mở pillar"
                              onClick={() => navigate(`/admin/seo?tab=pillars&pillar=${pillar.id}`)}
                            >
                              <ArrowRight className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">{k.priority_score}</TableCell>
                      <TableCell>
                        <Select value={k.status} onValueChange={v => handleStatusChange(k.id, v)}>
                          <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>{STATUS_OPTIONS.filter(s => s !== "all").map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(k.id, k.cluster_id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {(!keywords || keywords.length === 0) && (
                  <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">Chưa có keyword. Vào tab Research Lab để bắt đầu.</TableCell></TableRow>
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
