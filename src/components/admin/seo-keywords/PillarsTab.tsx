import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Target, Trash2, ArrowRight, Search, LayoutGrid, List, X, GitMerge, Archive } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import PillarDetailView from "./PillarDetailView";
import PillarBulkMergeDialog from "./PillarBulkMergeDialog";

interface Cluster {
  id: string;
  name: string;
  description: string | null;
  status: string;
  color: string | null;
  pillar_keyword_id: string | null;
  pillar_content_id: string | null;
  created_at?: string;
}

interface Coverage {
  cluster_id: string;
  keyword_count: number;
  keywords_covered: number;
  topic_count: number;
  topics_used: number;
  coverage_pct: number;
}

const STATUSES = ["all", "planning", "active", "completed", "archived"] as const;
type StatusFilter = (typeof STATUSES)[number];
type SortKey = "recent" | "coverage" | "keywords" | "name";
type ViewMode = "grid" | "list";

function healthFromCoverage(pct: number) {
  if (pct >= 70) return { dot: "bg-emerald-500", label: "Khoẻ" };
  if (pct >= 30) return { dot: "bg-amber-500", label: "Trung bình" };
  return { dot: "bg-rose-500", label: "Yếu" };
}

export default function PillarsTab() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id;
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [params, setParams] = useSearchParams();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("recent");
  const [view, setView] = useState<ViewMode>("grid");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [mergeOpen, setMergeOpen] = useState(false);

  const toggleSel = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const bulkArchive = async () => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    if (!confirm(`Archive ${ids.length} pillar?`)) return;
    const { error } = await supabase
      .from("seo_clusters")
      .update({ status: "archived" })
      .in("id", ids);
    if (error) return toast.error(error.message);
    toast.success(`Đã archive ${ids.length} pillar`);
    setSelected(new Set());
    qc.invalidateQueries({ queryKey: ["seo-clusters"] });
    qc.invalidateQueries({ queryKey: ["seo-pillars-shared"] });
  };

  useEffect(() => {
    const p = params.get("pillar");
    if (p && p !== activeId) setActiveId(p);
  }, [params]);

  const openPillar = (id: string | null) => {
    setActiveId(id);
    const next = new URLSearchParams(params);
    if (id) next.set("pillar", id);
    else next.delete("pillar");
    setParams(next, { replace: true });
  };

  const { data: clusters = [], isLoading } = useQuery({
    queryKey: ["seo-clusters", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seo_clusters")
        .select("id,name,description,status,color,pillar_keyword_id,pillar_content_id,created_at")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Cluster[];
    },
  });

  const { data: coverage = [] } = useQuery({
    queryKey: ["seo-cluster-coverage", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("cluster_coverage")
        .select("*")
        .eq("organization_id", orgId!);
      if (error) throw error;
      return ((data || []) as unknown) as Coverage[];
    },
  });

  const covMap = useMemo(() => new Map(coverage.map((c) => [c.cluster_id, c])), [coverage]);

  const statusCounts = useMemo(() => {
    const m: Record<string, number> = { all: clusters.length };
    for (const c of clusters) m[c.status] = (m[c.status] || 0) + 1;
    return m;
  }, [clusters]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = clusters.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.description || "").toLowerCase().includes(q)
      );
    });
    list = [...list].sort((a, b) => {
      const ca = covMap.get(a.id);
      const cb = covMap.get(b.id);
      switch (sortKey) {
        case "coverage":
          return (cb?.coverage_pct || 0) - (ca?.coverage_pct || 0);
        case "keywords":
          return (cb?.keyword_count || 0) - (ca?.keyword_count || 0);
        case "name":
          return a.name.localeCompare(b.name);
        case "recent":
        default:
          return (b.created_at || "").localeCompare(a.created_at || "");
      }
    });
    return list;
  }, [clusters, statusFilter, search, sortKey, covMap]);

  const handleCreate = async () => {
    if (!name.trim() || !orgId) return;
    const { error } = await supabase.from("seo_clusters").insert({
      organization_id: orgId,
      name: name.trim(),
      description: desc.trim() || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Đã tạo Pillar cluster");
    setName("");
    setDesc("");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["seo-clusters"] });
    qc.invalidateQueries({ queryKey: ["seo-pillars-shared"] });
  };

  const handleDelete = async (id: string, kwCount: number) => {
    if (kwCount > 0 && !confirm(`Pillar có ${kwCount} keyword. Xóa? (Keyword & topic sẽ unassign)`)) return;
    const { error } = await supabase.from("seo_clusters").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Đã xóa");
    qc.invalidateQueries({ queryKey: ["seo-clusters"] });
    qc.invalidateQueries({ queryKey: ["seo-pillars-shared"] });
    qc.invalidateQueries({ queryKey: ["seo-cluster-coverage"] });
  };

  if (activeId) {
    return <PillarDetailView clusterId={activeId} onBack={() => openPillar(null)} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">Topic Pillars</h2>
          <p className="text-sm text-muted-foreground">
            Nhóm pillar + cluster keywords + content. Mỗi pillar = một silo SEO.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> Tạo Pillar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tạo Pillar mới</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Tên pillar</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Vd: Nâng mũi cấu trúc"
                />
              </div>
              <div>
                <Label>Mô tả (tùy chọn)</Label>
                <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Hủy
              </Button>
              <Button onClick={handleCreate} disabled={!name.trim()}>
                Tạo
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Toolbar */}
      {clusters.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap p-2.5 rounded-lg border bg-muted/20">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm pillar..."
              className="h-8 pl-8 text-sm"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 flex-wrap">
            {STATUSES.map((s) => {
              const cnt = statusCounts[s] || 0;
              const active = statusFilter === s;
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    "px-2 py-0.5 rounded-full text-[11px] capitalize border transition-colors",
                    active
                      ? "border-foreground/40 bg-foreground/5 text-foreground"
                      : "border-border/60 text-muted-foreground hover:bg-muted"
                  )}
                >
                  {s === "all" ? "Tất cả" : s} <span className="opacity-60">({cnt})</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1 ml-auto">
            <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
              <SelectTrigger className="h-8 w-[150px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Mới tạo</SelectItem>
                <SelectItem value="coverage">Coverage cao</SelectItem>
                <SelectItem value="keywords">Nhiều keyword</SelectItem>
                <SelectItem value="name">Tên A→Z</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center border rounded-md overflow-hidden">
              <Button
                size="sm"
                variant={view === "grid" ? "secondary" : "ghost"}
                onClick={() => setView("grid")}
                className="h-8 rounded-none px-2"
                aria-label="Grid"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant={view === "list" ? "secondary" : "ghost"}
                onClick={() => setView("list")}
                className="h-8 rounded-none px-2"
                aria-label="List"
              >
                <List className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="basis-full text-[11px] text-muted-foreground -mt-1">
            Hiển thị {visible.length}/{clusters.length} pillar
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Đang tải...</div>
      ) : clusters.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Target className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p>Chưa có Pillar nào. Tạo pillar đầu tiên để gom keyword + content thành silo SEO.</p>
          </CardContent>
        </Card>
      ) : visible.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Không có pillar khớp bộ lọc.{" "}
            <button
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
              }}
              className="text-primary hover:underline"
            >
              Xóa bộ lọc
            </button>
          </CardContent>
        </Card>
      ) : view === "grid" ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {visible.map((c) => {
            const cov = covMap.get(c.id);
            const pct = cov?.coverage_pct || 0;
            const health = healthFromCoverage(pct);
            const orphans = Math.max(0, (cov?.keyword_count || 0) - (cov?.keywords_covered || 0));
            return (
              <Card
                key={c.id}
                className="hover:ring-1 hover:ring-foreground/15 transition-all cursor-pointer"
                onClick={() => openPillar(c.id)}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selected.has(c.id)}
                          onCheckedChange={() => toggleSel(c.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="shrink-0"
                        />
                        <span
                          className={cn("h-2.5 w-2.5 rounded-full shrink-0", health.dot)}
                          title={`Sức khoẻ: ${health.label}`}
                        />
                        <h3 className="font-semibold truncate">{c.name}</h3>
                      </div>
                      {c.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.description}</p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {c.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <div className="text-muted-foreground">Keywords</div>
                      <div className="font-medium">
                        {cov?.keywords_covered || 0}/{cov?.keyword_count || 0}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Topics</div>
                      <div className="font-medium">
                        {cov?.topics_used || 0}/{cov?.topic_count || 0}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Orphan</div>
                      <div className={cn("font-medium", orphans > 0 ? "text-amber-600 dark:text-amber-500" : "")}>
                        {orphans}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                      <span>Coverage</span>
                      <span>{pct}%</span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                  </div>

                  <div className="flex gap-1.5 pt-1" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 gap-1"
                      onClick={() => openPillar(c.id)}
                    >
                      Mở <ArrowRight className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(c.id, cov?.keyword_count || 0)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0 divide-y">
            {visible.map((c) => {
              const cov = covMap.get(c.id);
              const pct = cov?.coverage_pct || 0;
              const health = healthFromCoverage(pct);
              const orphans = Math.max(0, (cov?.keyword_count || 0) - (cov?.keywords_covered || 0));
              return (
                <div
                  key={c.id}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-muted/40 cursor-pointer"
                  onClick={() => openPillar(c.id)}
                >
                  <Checkbox
                    checked={selected.has(c.id)}
                    onCheckedChange={() => toggleSel(c.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="shrink-0"
                  />
                  <span className={cn("h-2 w-2 rounded-full shrink-0", health.dot)} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{c.name}</span>
                      <Badge variant="outline" className="text-[10px] capitalize h-4 px-1.5">
                        {c.status}
                      </Badge>
                    </div>
                    {c.description && (
                      <p className="text-[11px] text-muted-foreground truncate">{c.description}</p>
                    )}
                  </div>
                  <div className="hidden sm:flex items-center gap-3 text-[11px] text-muted-foreground tabular-nums">
                    <span>
                      KW <span className="text-foreground font-medium">{cov?.keywords_covered || 0}/{cov?.keyword_count || 0}</span>
                    </span>
                    {orphans > 0 && (
                      <span className="text-amber-600 dark:text-amber-500">{orphans} orphan</span>
                    )}
                  </div>
                  <div className="hidden md:block w-24">
                    <Progress value={pct} className="h-1.5" />
                  </div>
                  <span className="text-[11px] tabular-nums w-9 text-right text-muted-foreground">{pct}%</span>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" variant="ghost" onClick={() => openPillar(c.id)}>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(c.id, cov?.keyword_count || 0)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Sticky bulk bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-background border rounded-full shadow-lg px-3 py-2 flex items-center gap-2 text-sm">
          <span className="font-medium">{selected.size} pillar đã chọn</span>
          <span className="text-muted-foreground">·</span>
          <Button
            size="sm"
            variant="outline"
            className="gap-1 h-8"
            disabled={selected.size < 2}
            onClick={() => setMergeOpen(true)}
          >
            <GitMerge className="h-3.5 w-3.5" /> Merge
          </Button>
          <Button size="sm" variant="outline" className="gap-1 h-8" onClick={bulkArchive}>
            <Archive className="h-3.5 w-3.5" /> Archive
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      <PillarBulkMergeDialog
        open={mergeOpen}
        onOpenChange={setMergeOpen}
        selectedIds={Array.from(selected)}
        pillars={clusters.map((c) => ({ id: c.id, name: c.name }))}
        coverage={coverage}
        onDone={() => setSelected(new Set())}
      />
    </div>
  );
}
