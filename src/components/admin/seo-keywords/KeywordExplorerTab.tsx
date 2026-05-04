import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2, Trash2, Target, ArrowRight, Sparkles, HelpCircle, Star, Play, ShoppingBag, MapPin, Newspaper, Users, Download, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useKeywordEnrichment } from "@/hooks/useKeywordEnrichment";
import { useCurrentBrand } from "@/contexts/BrandContext";
import {
  CATEGORY_META,
  CATEGORY_ORDER,
  categorizeKeyword,
  buildContextFromBrand,
  type KeywordCategory,
} from "@/lib/seo/keywordCategorizer";

const STATUS_OPTIONS = ["all", "new", "researching", "planned", "assigned", "published", "tracking", "archived"];
const INTENT_OPTIONS = ["all", "informational", "commercial", "transactional", "navigational"];

const NONE = "__none__";
const NO_PILLAR = "__no_pillar__";

// Grid template aligned for header + each row (11 columns: + SERP icons col)
const GRID_COLS =
  "grid grid-cols-[32px_minmax(220px,2fr)_88px_64px_120px_110px_120px_180px_88px_140px_44px] items-center gap-2 px-3";

const SERP_ICONS: Record<string, { icon: typeof HelpCircle; label: string }> = {
  paa: { icon: HelpCircle, label: "People Also Ask" },
  snippet: { icon: Star, label: "Featured Snippet" },
  video: { icon: Play, label: "Video" },
  shopping: { icon: ShoppingBag, label: "Shopping" },
  local: { icon: MapPin, label: "Local Pack" },
  news: { icon: Newspaper, label: "News" },
  social: { icon: Users, label: "Social" },
};

export default function KeywordExplorerTab() {
  const { currentOrganization } = useOrganization();
  const { currentBrand } = useCurrentBrand();
  const orgId = currentOrganization?.id;
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { enrich, job: enrichJob, starting: enrichStarting } = useKeywordEnrichment();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [intentFilter, setIntentFilter] = useState("all");
  const [pillarFilter, setPillarFilter] = useState("all");
  const [brandScope, setBrandScope] = useState<boolean>(() => {
    try { return localStorage.getItem("seo-explorer-brand-scope") === "1"; } catch { return false; }
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkPillar, setBulkPillar] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<KeywordCategory | null>(null);

  useEffect(() => {
    try { localStorage.setItem("seo-explorer-brand-scope", brandScope ? "1" : "0"); } catch {}
  }, [brandScope]);

  // Debounce search to avoid refetching on every keystroke
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: pillars = [] } = useQuery({
    queryKey: ["seo-pillars-list", orgId],
    enabled: !!orgId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase.from("seo_clusters")
        .select("id,name,color").eq("organization_id", orgId!).order("name");
      return data || [];
    },
  });

  // Brand scope: cluster IDs whose name matches a brand pillar name + pillar keywords for OR text match
  const brandScopeData = useMemo(() => {
    if (!brandScope || !currentBrand) return null;
    const pillarsArr = Array.isArray(currentBrand.content_pillars) ? currentBrand.content_pillars : [];
    const pillarNames = new Set(pillarsArr.map((p: any) => String(p?.name || "").toLowerCase().trim()).filter(Boolean));
    const clusterIds = pillars.filter(p => pillarNames.has(String(p.name).toLowerCase().trim())).map(p => p.id);
    const pillarKeywords: string[] = [];
    for (const p of pillarsArr) {
      if (Array.isArray((p as any)?.keywords)) for (const k of (p as any).keywords) {
        const t = String(k || "").trim();
        if (t) pillarKeywords.push(t);
      }
    }
    return { clusterIds, pillarKeywords: pillarKeywords.slice(0, 20) };
  }, [brandScope, currentBrand, pillars]);

  const { data: keywords, isLoading, isFetching } = useQuery({
    queryKey: ["seo-keywords", orgId, debouncedSearch, statusFilter, intentFilter, pillarFilter, brandScope, brandScopeData?.clusterIds.join(","), brandScopeData?.pillarKeywords.join(",")],
    enabled: !!orgId,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      let q = supabase.from("seo_keywords")
        .select("id,keyword,search_volume,difficulty,intent,funnel_stage,priority_score,status,cluster_id,assigned_landing_page_id,cpc_vnd,serp_features,top_competitors")
        .eq("organization_id", orgId!)
        .order("priority_score", { ascending: false })
        .limit(500);
      if (debouncedSearch) q = q.ilike("keyword", `%${debouncedSearch}%`);
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      if (intentFilter !== "all") q = q.eq("intent", intentFilter);
      if (pillarFilter === NO_PILLAR) q = q.is("cluster_id", null);
      else if (pillarFilter !== "all") q = q.eq("cluster_id", pillarFilter);
      if (brandScopeData) {
        const orParts: string[] = [];
        if (brandScopeData.clusterIds.length) orParts.push(`cluster_id.in.(${brandScopeData.clusterIds.join(",")})`);
        for (const kw of brandScopeData.pillarKeywords) {
          const safe = kw.replace(/[(),]/g, " ");
          orParts.push(`keyword.ilike.%${safe}%`);
        }
        if (orParts.length) q = q.or(orParts.join(","));
        else q = q.eq("id", "00000000-0000-0000-0000-000000000000"); // brand has no pillars → empty
      }
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const handleExportCsv = useCallback(() => {
    const rows = keywords || [];
    if (rows.length === 0) { toast.info("Không có keyword để export"); return; }
    const header = ["keyword", "volume", "kd", "intent", "funnel", "pillar", "status", "priority"];
    const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [header.join(",")];
    for (const k of rows) {
      const pname = k.cluster_id ? (pillars.find(p => p.id === k.cluster_id)?.name ?? "") : "";
      lines.push([k.keyword, k.search_volume ?? "", k.difficulty ?? "", k.intent ?? "", k.funnel_stage ?? "", pname, k.status ?? "", k.priority_score ?? ""].map(esc).join(","));
    }
    const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `keywords-${currentBrand?.brand_name || "all"}-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Đã export ${rows.length} keyword`);
  }, [keywords, pillars, currentBrand]);

  const pillarMap = useMemo(() => new Map(pillars.map(p => [p.id, p])), [pillars]);

  const refreshPillarStatuses = useCallback(async (ids: (string | null | undefined)[]) => {
    const unique = Array.from(new Set(ids.filter(Boolean) as string[]));
    await Promise.all(
      unique.map(id => (supabase.rpc as any)("refresh_cluster_status", { _cluster_id: id }))
    );
  }, []);

  const handleDelete = useCallback(async (id: string, oldPillar?: string | null) => {
    if (!confirm("Xóa keyword này?")) return;
    const { error } = await supabase.from("seo_keywords").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Đã xóa");
    if (oldPillar) await refreshPillarStatuses([oldPillar]);
    qc.invalidateQueries({ queryKey: ["seo-keywords"] }); qc.invalidateQueries({ queryKey: ["seo-keywords-shared"] });
    qc.invalidateQueries({ queryKey: ["seo-keywords-dashboard"] });
    qc.invalidateQueries({ queryKey: ["seo-cluster-coverage"] });
  }, [qc, refreshPillarStatuses]);

  const handleStatusChange = useCallback(async (id: string, newStatus: string) => {
    const { error } = await supabase.from("seo_keywords").update({ status: newStatus }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["seo-keywords"] }); qc.invalidateQueries({ queryKey: ["seo-keywords-shared"] });
  }, [qc]);

  const handlePillarChange = useCallback(async (id: string, newPillar: string, oldPillar?: string | null) => {
    const value = newPillar === NONE ? null : newPillar;
    const { error } = await supabase.from("seo_keywords").update({ cluster_id: value }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(value ? "Đã gán vào pillar" : "Đã gỡ khỏi pillar");
    await refreshPillarStatuses([oldPillar, value]);
    qc.invalidateQueries({ queryKey: ["seo-keywords"] }); qc.invalidateQueries({ queryKey: ["seo-keywords-shared"] });
    qc.invalidateQueries({ queryKey: ["seo-cluster-coverage"] });
    qc.invalidateQueries({ queryKey: ["seo-cluster-keywords"] });
  }, [qc, refreshPillarStatuses]);

  const toggleOne = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const ctx = useMemo(() => buildContextFromBrand(currentBrand), [currentBrand]);
  const allRows = keywords || [];
  const rowsWithCat = useMemo(
    () => allRows.map(k => ({ ...k, _category: categorizeKeyword(k.keyword, ctx, { intent: k.intent }) })),
    [allRows, ctx]
  );
  const categoryCounts = useMemo(() => {
    const m = new Map<KeywordCategory, number>();
    for (const k of rowsWithCat) m.set(k._category, (m.get(k._category) || 0) + 1);
    return m;
  }, [rowsWithCat]);
  const rows = useMemo(
    () => categoryFilter ? rowsWithCat.filter(k => k._category === categoryFilter) : rowsWithCat,
    [rowsWithCat, categoryFilter]
  );
  const toggleAll = () => {
    if (rows.length === 0) return;
    if (selectedIds.size === rows.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(rows.map(k => k.id)));
  };

  const handleBulkAssign = async () => {
    if (!bulkPillar || selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const value = bulkPillar === NONE ? null : bulkPillar;
    const oldPillars = rows.filter(k => selectedIds.has(k.id)).map(k => k.cluster_id);
    const { error } = await supabase.from("seo_keywords").update({ cluster_id: value }).in("id", ids);
    if (error) return toast.error(error.message);
    toast.success(`Đã ${value ? "gán" : "gỡ"} ${ids.length} keyword`);
    await refreshPillarStatuses([...oldPillars, value]);
    setSelectedIds(new Set());
    setBulkPillar("");
    qc.invalidateQueries({ queryKey: ["seo-keywords"] }); qc.invalidateQueries({ queryKey: ["seo-keywords-shared"] });
    qc.invalidateQueries({ queryKey: ["seo-cluster-coverage"] });
    qc.invalidateQueries({ queryKey: ["seo-cluster-keywords"] });
  };

  // Virtualizer
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 44,
    overscan: 12,
  });

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
          {currentBrand && (
            <button
              type="button"
              onClick={() => setBrandScope(v => !v)}
              className={cn(
                "text-xs px-2.5 py-1 rounded-full border flex items-center gap-1 transition self-center",
                brandScope ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted text-muted-foreground"
              )}
              title="Chỉ hiện keyword thuộc pillar/keyword của brand đang chọn"
            >
              <Target className="h-3 w-3" /> Chỉ brand «{currentBrand.brand_name}»
            </button>
          )}
          <Button size="sm" variant="outline" onClick={handleExportCsv} className="ml-auto">
            <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
          </Button>
          {isFetching && !isLoading && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground self-center">
              <Loader2 className="h-3 w-3 animate-spin" /> Đang lọc...
            </span>
          )}
        </div>

        {/* Keyword Universe — phân loại theo category */}
        {rowsWithCat.length > 0 && (
          <div className="flex flex-wrap gap-1.5 items-center text-xs">
            <span className="text-muted-foreground">Phân loại:</span>
            <button
              type="button"
              onClick={() => setCategoryFilter(null)}
              className={cn(
                "px-2 py-0.5 rounded-full border transition",
                !categoryFilter ? "bg-foreground text-background border-foreground" : "bg-background text-muted-foreground hover:bg-muted"
              )}
            >Tất cả ({rowsWithCat.length})</button>
            {CATEGORY_ORDER.map(c => {
              const count = categoryCounts.get(c) || 0;
              if (count === 0) return null;
              const m = CATEGORY_META[c];
              const active = categoryFilter === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategoryFilter(active ? null : c)}
                  className={cn(
                    "px-2 py-0.5 rounded-full border transition inline-flex items-center gap-1",
                    active ? "bg-foreground text-background border-foreground" : `${m.badgeClass} hover:opacity-80`
                  )}
                  title={m.description}
                >
                  <span>{m.emoji}</span> {m.label} <span className="opacity-70">({count})</span>
                </button>
              );
            })}
          </div>
        )}

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
            <Button size="sm" onClick={handleBulkAssign} disabled={!bulkPillar}>Gán</Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => enrich(Array.from(selectedIds))}
              disabled={enrichStarting || !!enrichJob || selectedIds.size > 50}
              title={selectedIds.size > 50 ? "Tối đa 50 keyword/lần" : "Lấy KD, SERP features, intent từ Google"}
            >
              {enrichStarting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
              Enrich SERP
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>Hủy</Button>
          </div>
        )}

        {enrichJob && (
          <div className="flex items-center gap-2 p-2 bg-muted/30 border rounded-md text-xs">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            <span className="text-muted-foreground">Đang enrich {enrichJob.done}/{enrichJob.total} keyword...</span>
            <div className="flex-1 h-1.5 bg-muted rounded overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${enrichJob.total ? (enrichJob.done / enrichJob.total) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
        ) : (
          <div className="rounded border">
            {/* Header */}
            <div className={cn(GRID_COLS, "h-10 border-b bg-muted/40 text-xs font-medium text-muted-foreground")}>
              <div>
                <Checkbox
                  checked={rows.length > 0 && selectedIds.size === rows.length}
                  onCheckedChange={toggleAll}
                />
              </div>
              <div>Keyword</div>
              <div className="text-right">Volume</div>
              <div className="text-right">KD</div>
              <div>Intent</div>
              <div>Funnel</div>
              <div>SERP</div>
              <div>Pillar</div>
              <div className="text-right">Priority</div>
              <div>Status</div>
              <div />
            </div>

            {/* Virtualized body */}
            {rows.length === 0 ? (() => {
              const hasFilter = !!debouncedSearch || statusFilter !== "all" || intentFilter !== "all" || pillarFilter !== "all" || brandScope;
              const clearAll = () => {
                setSearch(""); setDebouncedSearch("");
                setStatusFilter("all"); setIntentFilter("all"); setPillarFilter("all");
                setBrandScope(false);
              };
              return (
                <div className="flex flex-col items-center justify-center text-center py-10 px-4 gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted/60 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-muted-foreground" />
                  </div>
                  {hasFilter ? (
                    <>
                      <p className="text-sm font-medium">Không có keyword nào khớp filter hiện tại</p>
                      <p className="text-xs text-muted-foreground max-w-md">
                        Thử bỏ bớt filter, tắt scope brand, hoặc chạy Deep research để mở rộng pool.
                      </p>
                      <div className="flex gap-2 flex-wrap justify-center">
                        <Button size="sm" variant="outline" onClick={clearAll}>Xoá filter</Button>
                        <Button size="sm" onClick={() => navigate("/admin/seo?tab=discover")}>
                          <Wand2 className="h-3.5 w-3.5 mr-1" /> Mở Discover
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium">Pool keyword đang trống</p>
                      <p className="text-xs text-muted-foreground max-w-md">
                        {currentBrand
                          ? <>Hệ thống có thể tự nghiên cứu bộ keyword cho brand <strong>«{currentBrand.brand_name}»</strong> chỉ với 1 click.</>
                          : <>Chọn brand rồi vào Discover để AI tự nghiên cứu bộ keyword.</>
                        }
                      </p>
                      <div className="flex gap-2 flex-wrap justify-center">
                        <Button size="sm" onClick={() => navigate("/admin/seo?tab=discover")}>
                          <Wand2 className="h-3.5 w-3.5 mr-1" /> Deep research ngay
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              );
            })() : (
              <div
                ref={parentRef}
                className="overflow-auto"
                style={{ height: Math.min(640, Math.max(220, rows.length * 44 + 8)) }}
              >
                <div
                  style={{ height: rowVirtualizer.getTotalSize(), position: "relative", width: "100%" }}
                >
                  {rowVirtualizer.getVirtualItems().map(vi => {
                    const k = rows[vi.index];
                    const pillar = k.cluster_id ? pillarMap.get(k.cluster_id) : null;
                    const selected = selectedIds.has(k.id);
                    return (
                      <div
                        key={k.id}
                        className={cn(
                          GRID_COLS,
                          "absolute left-0 right-0 border-b text-sm",
                          selected && "bg-muted/40"
                        )}
                        style={{
                          top: 0,
                          transform: `translateY(${vi.start}px)`,
                          height: vi.size,
                        }}
                      >
                        <div>
                          <Checkbox checked={selected} onCheckedChange={() => toggleOne(k.id)} />
                        </div>
                        <div className="font-medium truncate" title={k.keyword}>{k.keyword}</div>
                        <div className="text-right tabular-nums">{k.search_volume?.toLocaleString()}</div>
                        <div className="text-right tabular-nums">{k.difficulty}</div>
                        <div><Badge variant="outline" className="text-xs">{k.intent}</Badge></div>
                        <div><Badge variant="secondary" className="text-xs">{k.funnel_stage}</Badge></div>
                        <div className="flex items-center gap-1">
                          {(() => {
                            const feats = Array.isArray(k.serp_features) ? (k.serp_features as string[]) : [];
                            if (feats.length === 0) return <span className="text-xs text-muted-foreground/60">—</span>;
                            return (
                              <TooltipProvider delayDuration={150}>
                                {feats.slice(0, 4).map(f => {
                                  const def = SERP_ICONS[f];
                                  if (!def) return null;
                                  const Icon = def.icon;
                                  return (
                                    <Tooltip key={f}>
                                      <TooltipTrigger asChild>
                                        <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-muted text-muted-foreground">
                                          <Icon className="h-3 w-3" />
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent>{def.label}</TooltipContent>
                                    </Tooltip>
                                  );
                                })}
                              </TooltipProvider>
                            );
                          })()}
                        </div>
                        <div className="flex items-center gap-1 min-w-0">
                          <Select
                            value={k.cluster_id || NONE}
                            onValueChange={v => handlePillarChange(k.id, v, k.cluster_id)}
                          >
                            <SelectTrigger className="h-7 w-full text-xs gap-1">
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
                              className="h-6 w-6 shrink-0"
                              title="Mở pillar"
                              onClick={() => navigate(`/admin/seo?tab=pillars&pillar=${pillar.id}`)}
                            >
                              <ArrowRight className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        <div className="text-right font-mono tabular-nums">{k.priority_score}</div>
                        <div>
                          <Select value={k.status} onValueChange={v => handleStatusChange(k.id, v)}>
                            <SelectTrigger className="h-7 w-full text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>{STATUS_OPTIONS.filter(s => s !== "all").map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Button size="icon" variant="ghost" onClick={() => handleDelete(k.id, k.cluster_id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Hiển thị tối đa 500 keyword ({rows.length} kết quả). Dùng filter để thu hẹp.
        </p>
      </CardContent>
    </Card>
  );
}
