import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useCurrentBrand } from "@/contexts/BrandContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Plus,
  X,
  FileText,
  ExternalLink,
  Sparkles,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Search,
  ChevronDown,
  ChevronRight,
  Wand2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import KeywordTargetPicker from "@/components/seo/KeywordTargetPicker";
import SuggestTopicsDialog from "./SuggestTopicsDialog";
import IntentFunnelMatrix from "./IntentFunnelMatrix";
import AutoClusterOrphansDialog from "./AutoClusterOrphansDialog";
import {
  CATEGORY_META,
  CATEGORY_ORDER,
  buildContextFromBrand,
  categorizeKeyword,
  type KeywordCategory,
} from "@/lib/seo/keywordCategorizer";
import { useSeoPillars } from "@/hooks/useSeoPillars";

interface Props {
  clusterId: string;
  onBack: () => void;
}

type GroupBy = "none" | "category" | "intent" | "funnel";
const FUNNELS = ["TOFU", "MOFU", "BOFU"] as const;
const INTENTS = ["informational", "commercial", "transactional", "navigational"] as const;

interface Kw {
  id: string;
  keyword: string;
  search_volume: number | null;
  difficulty: number | null;
  intent: string | null;
  funnel_stage: string | null;
  priority_score: number | null;
  assigned_landing_page_id: string | null;
}

export default function PillarDetailView({ clusterId, onBack }: Props) {
  const { currentOrganization } = useOrganization();
  const { currentBrand } = useCurrentBrand();
  const orgId = currentOrganization?.id;
  const qc = useQueryClient();

  const [adding, setAdding] = useState(false);
  const [pickedIds, setPickedIds] = useState<string[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [autoClusterOpen, setAutoClusterOpen] = useState(false);

  // Toolbar state
  const [search, setSearch] = useState("");
  const [groupBy, setGroupBy] = useState<GroupBy>("category");
  const [activeCategories, setActiveCategories] = useState<Set<KeywordCategory>>(new Set());
  const [activeMatrix, setActiveMatrix] = useState<{ funnel: (typeof FUNNELS)[number]; intent: (typeof INTENTS)[number] } | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: cluster } = useQuery({
    queryKey: ["seo-cluster", clusterId],
    enabled: !!clusterId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seo_clusters")
        .select("id,name,description,status,color,pillar_keyword_id,pillar_content_id")
        .eq("id", clusterId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: keywords = [] } = useQuery({
    queryKey: ["seo-cluster-keywords", clusterId],
    enabled: !!clusterId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seo_keywords")
        .select("id,keyword,search_volume,difficulty,intent,funnel_stage,priority_score,assigned_landing_page_id")
        .eq("cluster_id", clusterId)
        .order("priority_score", { ascending: false });
      if (error) throw error;
      return (data || []) as Kw[];
    },
  });

  const { data: contents = [] } = useQuery({
    queryKey: ["seo-cluster-contents", orgId, clusterId],
    enabled: !!orgId && !!clusterId,
    queryFn: async () => {
      const { data } = await supabase
        .from("multi_channel_contents")
        .select("id,title,topic,target_keyword_ids")
        .eq("organization_id", orgId!)
        .limit(500);
      return data || [];
    },
  });

  const { data: pillars = [] } = useSeoPillars();

  const ctx = useMemo(() => buildContextFromBrand(currentBrand), [currentBrand]);

  const coverageMap = useMemo(() => {
    const map = new Map<string, { id: string; title: string | null; topic: string | null }[]>();
    contents.forEach((c) => {
      (c.target_keyword_ids || []).forEach((kid: string) => {
        if (!map.has(kid)) map.set(kid, []);
        map.get(kid)!.push(c);
      });
    });
    return map;
  }, [contents]);

  // Categorize all keywords once
  const enriched = useMemo(() => {
    return keywords.map((k) => ({
      ...k,
      _category: categorizeKeyword(k.keyword, ctx, { intent: k.intent || undefined }),
    }));
  }, [keywords, ctx]);

  const categoryCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const k of enriched) m[k._category] = (m[k._category] || 0) + 1;
    return m;
  }, [enriched]);

  // Apply filters: search + category chips + matrix cell
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enriched.filter((k) => {
      if (q && !k.keyword.toLowerCase().includes(q)) return false;
      if (activeCategories.size > 0 && !activeCategories.has(k._category)) return false;
      if (activeMatrix) {
        const f = (k.funnel_stage || "TOFU") as any;
        const i = (k.intent || "informational") as any;
        if (f !== activeMatrix.funnel || i !== activeMatrix.intent) return false;
      }
      return true;
    });
  }, [enriched, search, activeCategories, activeMatrix]);

  // Group
  const groups = useMemo(() => {
    if (groupBy === "none") return [{ key: "all", label: "Tất cả", items: filtered }];
    const map = new Map<string, typeof filtered>();
    for (const k of filtered) {
      let key: string;
      let label: string;
      if (groupBy === "category") {
        key = k._category;
        label = `${CATEGORY_META[k._category].emoji} ${CATEGORY_META[k._category].label}`;
      } else if (groupBy === "intent") {
        key = k.intent || "unknown";
        label = key === "unknown" ? "Chưa xác định" : key.charAt(0).toUpperCase() + key.slice(1);
      } else {
        key = k.funnel_stage || "TOFU";
        label = key;
      }
      const arr = map.get(key) || [];
      arr.push(k);
      map.set(key, arr);
      // Save label by key
      (map as any)._labels = (map as any)._labels || {};
      (map as any)._labels[key] = label;
    }
    const order: string[] =
      groupBy === "category"
        ? CATEGORY_ORDER
        : groupBy === "intent"
        ? [...INTENTS, "unknown"]
        : [...FUNNELS];
    const result = order
      .filter((k) => map.has(k))
      .map((k) => ({ key: k, label: (map as any)._labels[k], items: map.get(k)! }));
    // Add any leftover keys
    for (const [k, v] of map.entries()) {
      if (typeof k !== "string") continue;
      if (!result.find((g) => g.key === k)) result.push({ key: k, label: (map as any)._labels[k], items: v });
    }
    return result;
  }, [filtered, groupBy]);

  // Default expanded groups (first 3)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const toggleGroup = (k: string) =>
    setCollapsedGroups((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const stats = useMemo(() => {
    const total = keywords.length;
    const covered = keywords.filter((k) => coverageMap.has(k.id)).length;
    const orphans = keywords.filter((k) => !coverageMap.has(k.id));
    const stages = (["TOFU", "MOFU", "BOFU"] as const).map((s) => {
      const list = keywords.filter((k) => (k.funnel_stage || "TOFU") === s);
      const cov = list.filter((k) => coverageMap.has(k.id)).length;
      return { stage: s, total: list.length, covered: cov, orphans: list.length - cov };
    });
    const topOrphans = [...orphans]
      .sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0))
      .slice(0, 8);
    const topCovered = keywords
      .filter((k) => coverageMap.has(k.id))
      .sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0))
      .slice(0, 5);
    return { total, covered, orphans, stages, topOrphans, topCovered, ratio: total ? covered / total : 0 };
  }, [keywords, coverageMap]);

  const { data: pillarKw } = useQuery({
    queryKey: ["seo-pillar-kw", cluster?.pillar_keyword_id],
    enabled: !!cluster?.pillar_keyword_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("seo_keywords")
        .select("id,keyword,search_volume")
        .eq("id", cluster!.pillar_keyword_id!)
        .maybeSingle();
      return data;
    },
  });

  const addKeywords = async (ids: string[]) => {
    if (!ids.length) return;
    const { error } = await supabase.from("seo_keywords").update({ cluster_id: clusterId }).in("id", ids);
    if (error) return toast.error(error.message);
    toast.success(`Đã thêm ${ids.length} keyword vào pillar`);
    setPickedIds([]);
    setAdding(false);
    qc.invalidateQueries({ queryKey: ["seo-cluster-keywords", clusterId] });
    qc.invalidateQueries({ queryKey: ["seo-cluster-coverage"] });
  };

  const removeKeyword = async (id: string) => {
    const { error } = await supabase.from("seo_keywords").update({ cluster_id: null }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["seo-cluster-keywords", clusterId] });
    qc.invalidateQueries({ queryKey: ["seo-cluster-coverage"] });
  };

  const setPillar = async (kwId: string) => {
    const { error } = await supabase.from("seo_clusters").update({ pillar_keyword_id: kwId }).eq("id", clusterId);
    if (error) return toast.error(error.message);
    toast.success("Đã đặt pillar keyword");
    qc.invalidateQueries({ queryKey: ["seo-cluster", clusterId] });
  };

  // Bulk actions
  const bulkMove = async (toClusterId: string | null) => {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    const { error } = await supabase.from("seo_keywords").update({ cluster_id: toClusterId }).in("id", ids);
    if (error) return toast.error(error.message);
    toast.success(toClusterId ? `Đã chuyển ${ids.length} keyword` : `Đã bỏ ${ids.length} keyword khỏi pillar`);
    setSelected(new Set());
    qc.invalidateQueries({ queryKey: ["seo-cluster-keywords"] });
    qc.invalidateQueries({ queryKey: ["seo-cluster-coverage"] });
  };

  const bulkSetStage = async (stage: string) => {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    const { error } = await supabase.from("seo_keywords").update({ funnel_stage: stage }).in("id", ids);
    if (error) return toast.error(error.message);
    toast.success(`Đã set funnel stage = ${stage} cho ${ids.length} keyword`);
    setSelected(new Set());
    qc.invalidateQueries({ queryKey: ["seo-cluster-keywords", clusterId] });
  };

  const toggleSel = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const toggleExp = (id: string) =>
    setExpanded((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  if (!cluster) return <div className="text-sm text-muted-foreground">Đang tải...</div>;

  const otherPillars = pillars.filter((p) => p.id !== clusterId);

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Quay lại
        </Button>
        <span className="text-muted-foreground">/</span>
        <h2 className="text-lg font-semibold">{cluster.name}</h2>
        <Badge variant="outline" className="capitalize">
          {cluster.status}
        </Badge>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" className="gap-1" onClick={() => setAutoClusterOpen(true)}>
            <Wand2 className="h-3.5 w-3.5" /> AI gom orphan
          </Button>
          <Button size="sm" variant="outline" className="gap-1" onClick={() => setSuggestOpen(true)}>
            <Sparkles className="h-3.5 w-3.5" /> Gợi ý topic AI
          </Button>
        </div>
      </div>

      <SuggestTopicsDialog open={suggestOpen} onOpenChange={setSuggestOpen} clusterId={clusterId} />
      <AutoClusterOrphansDialog
        open={autoClusterOpen}
        onOpenChange={setAutoClusterOpen}
        preferredClusterId={clusterId}
      />

      {/* Pillar card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Pillar Keyword (head term)</div>
              {pillarKw ? (
                <div className="flex items-center gap-2">
                  <span className="font-medium">{pillarKw.keyword}</span>
                  {pillarKw.search_volume != null && (
                    <Badge variant="secondary" className="text-[10px]">
                      Vol {pillarKw.search_volume.toLocaleString()}
                    </Badge>
                  )}
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">
                  Chưa đặt — click "Đặt làm pillar" trên 1 keyword bên dưới
                </span>
              )}
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground mb-1">Pillar Content</div>
              {cluster.pillar_content_id ? (
                <Link
                  to={`/multichannel/${cluster.pillar_content_id}`}
                  className="text-sm font-medium inline-flex items-center gap-1 hover:underline"
                >
                  Xem bài <ExternalLink className="h-3 w-3" />
                </Link>
              ) : (
                <span className="text-sm text-muted-foreground">Chưa có</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Drill-down summary */}
      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Coverage</p>
                <p className="text-2xl font-bold mt-1">
                  {stats.covered}/{stats.total}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {Math.round(stats.ratio * 100)}% keywords có content
                </p>
              </div>
              <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
            </div>
            <Progress value={stats.ratio * 100} className="h-1.5 mt-3" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs text-muted-foreground">Funnel breakdown</p>
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              {stats.stages.map((s) => {
                const pct = s.total ? (s.covered / s.total) * 100 : 0;
                return (
                  <div key={s.stage}>
                    <div className="flex justify-between text-[11px] mb-0.5">
                      <span className="font-medium">{s.stage}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {s.covered}/{s.total}
                      </span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs text-muted-foreground">Top orphans (priority)</p>
              <AlertCircle className="h-5 w-5 text-muted-foreground" />
            </div>
            {stats.topOrphans.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">🎉 Không có orphan.</p>
            ) : (
              <ul className="space-y-1">
                {stats.topOrphans.slice(0, 5).map((k) => (
                  <li key={k.id} className="flex items-center justify-between text-xs gap-2">
                    <span className="truncate flex-1">{k.keyword}</span>
                    <Badge variant="secondary" className="h-4 text-[10px]">
                      {k.priority_score ?? 0}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Intent × Funnel matrix (clickable to filter list) */}
      <IntentFunnelMatrix
        keywords={keywords}
        activeCell={activeMatrix}
        onCellClick={(c) => setActiveMatrix(c)}
      />

      {stats.topCovered.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-2">Top covered keywords (đã có content)</p>
            <div className="space-y-1.5">
              {stats.topCovered.map((k) => {
                const list = coverageMap.get(k.id) || [];
                return (
                  <div key={k.id} className="flex items-start justify-between gap-2 text-xs">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{k.keyword}</div>
                      <div className="text-muted-foreground text-[10px] truncate">
                        {list.map((c) => c.title || c.topic || c.id.slice(0, 8)).join(" · ")}
                      </div>
                    </div>
                    <Badge
                      variant={list.length >= 2 ? "destructive" : "outline"}
                      className="h-4 text-[10px] shrink-0"
                    >
                      {list.length} content
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cluster Keywords toolbar */}
      <div>
        <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
          <h3 className="font-semibold text-sm">
            Cluster Keywords ({filtered.length}
            {filtered.length !== keywords.length ? `/${keywords.length}` : ""})
          </h3>
          <Button size="sm" variant="outline" onClick={() => setAdding(!adding)} className="gap-1">
            <Plus className="h-3.5 w-3.5" /> Thêm keyword
          </Button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 flex-wrap p-2.5 rounded-lg border bg-muted/20 mb-3">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm keyword..."
              className="h-8 pl-8 text-sm"
            />
          </div>
          <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
            <SelectTrigger className="h-8 w-[170px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="category">Group: Universe</SelectItem>
              <SelectItem value="intent">Group: Intent</SelectItem>
              <SelectItem value="funnel">Group: Funnel</SelectItem>
              <SelectItem value="none">Không group</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1 flex-wrap">
            {CATEGORY_ORDER.map((cat) => {
              const cnt = categoryCounts[cat] || 0;
              if (cnt === 0) return null;
              const meta = CATEGORY_META[cat];
              const active = activeCategories.has(cat);
              return (
                <button
                  key={cat}
                  onClick={() =>
                    setActiveCategories((s) => {
                      const n = new Set(s);
                      if (n.has(cat)) n.delete(cat);
                      else n.add(cat);
                      return n;
                    })
                  }
                  className={cn(
                    "px-2 py-0.5 rounded-full text-[11px] border transition-colors flex items-center gap-1",
                    active
                      ? "border-foreground/40 bg-foreground/5"
                      : "border-border/60 text-muted-foreground hover:bg-muted"
                  )}
                >
                  <span className={cn("h-1.5 w-1.5 rounded-full", meta.dotClass)} />
                  {meta.label} <span className="opacity-60">({cnt})</span>
                </button>
              );
            })}
            {(activeCategories.size > 0 || activeMatrix || search) && (
              <button
                onClick={() => {
                  setActiveCategories(new Set());
                  setActiveMatrix(null);
                  setSearch("");
                }}
                className="text-[11px] text-muted-foreground hover:text-foreground underline"
              >
                Xóa filter
              </button>
            )}
          </div>
        </div>

        {adding && (
          <Card className="mb-3">
            <CardContent className="p-3 space-y-2">
              <KeywordTargetPicker selectedIds={pickedIds} onChange={setPickedIds} max={20} />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => addKeywords(pickedIds)} disabled={!pickedIds.length}>
                  Thêm {pickedIds.length} keyword
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setAdding(false);
                    setPickedIds([]);
                  }}
                >
                  Hủy
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {keywords.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              Chưa có keyword. Click "Thêm keyword" để gắn vào pillar này.
            </CardContent>
          </Card>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              Không có keyword khớp filter.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {groups.map((g) => {
              const collapsed = collapsedGroups.has(g.key);
              const allSelected = g.items.every((k) => selected.has(k.id));
              return (
                <div key={g.key} className="border rounded-md overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-b">
                    <button onClick={() => toggleGroup(g.key)} className="flex items-center gap-1 text-sm font-medium">
                      {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      {g.label}
                      <span className="text-xs text-muted-foreground ml-1">({g.items.length})</span>
                    </button>
                    <button
                      onClick={() => {
                        setSelected((s) => {
                          const n = new Set(s);
                          if (allSelected) g.items.forEach((k) => n.delete(k.id));
                          else g.items.forEach((k) => n.add(k.id));
                          return n;
                        });
                      }}
                      className="ml-auto text-[11px] text-muted-foreground hover:text-foreground"
                    >
                      {allSelected ? "Bỏ chọn nhóm" : "Chọn cả nhóm"}
                    </button>
                  </div>
                  {!collapsed && (
                    <div className="divide-y">
                      {g.items.map((k) => {
                        const isExp = expanded.has(k.id);
                        const isSel = selected.has(k.id);
                        const meta = CATEGORY_META[k._category];
                        const covList = coverageMap.get(k.id) || [];
                        return (
                          <div key={k.id} className={cn("hover:bg-muted/30", isSel && "bg-foreground/5")}>
                            <div className="flex items-center gap-2 p-2.5">
                              <Checkbox
                                checked={isSel}
                                onCheckedChange={() => toggleSel(k.id)}
                                className="shrink-0"
                              />
                              <button
                                onClick={() => toggleExp(k.id)}
                                className="text-muted-foreground hover:text-foreground shrink-0"
                                aria-label="Expand"
                              >
                                {isExp ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                              </button>
                              <div className="min-w-0 flex-1 cursor-pointer" onClick={() => toggleExp(k.id)}>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-sm truncate">{k.keyword}</span>
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] h-4 px-1.5 gap-1"
                                    title={meta.description}
                                  >
                                    <span className={cn("h-1.5 w-1.5 rounded-full", meta.dotClass)} />
                                    {meta.label}
                                  </Badge>
                                  {cluster.pillar_keyword_id === k.id && (
                                    <Badge variant="default" className="text-[10px] h-4 px-1.5">PILLAR</Badge>
                                  )}
                                  {covList.length > 0 && (
                                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5 gap-0.5">
                                      <FileText className="h-2.5 w-2.5" /> {covList.length}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex gap-2 mt-0.5 text-[10px] text-muted-foreground">
                                  {k.intent && <span>{k.intent}</span>}
                                  {k.funnel_stage && <span>{k.funnel_stage}</span>}
                                  {k.search_volume != null && <span>Vol: {k.search_volume.toLocaleString()}</span>}
                                  {k.difficulty != null && <span>KD: {k.difficulty}</span>}
                                  {k.priority_score != null && <span>Priority: {k.priority_score}</span>}
                                </div>
                              </div>
                              {cluster.pillar_keyword_id !== k.id && (
                                <Button size="sm" variant="ghost" onClick={() => setPillar(k.id)} className="text-xs">
                                  Đặt pillar
                                </Button>
                              )}
                              <Button size="sm" variant="ghost" onClick={() => removeKeyword(k.id)}>
                                <X className="h-3.5 w-3.5 text-muted-foreground" />
                              </Button>
                            </div>

                            {isExp && (
                              <div className="px-3 pb-3 pl-12 space-y-2 text-xs">
                                <div className="text-muted-foreground">
                                  <strong className="text-foreground">{meta.label}:</strong> {meta.description}
                                </div>
                                {covList.length > 0 && (
                                  <div>
                                    <span className="text-muted-foreground">Đã có trong content: </span>
                                    {covList.map((c) => c.title || c.topic || c.id.slice(0, 8)).join(" · ")}
                                  </div>
                                )}
                                <div className="flex gap-2 flex-wrap">
                                  <Link
                                    to={`/multi-channel/create?clusterId=${clusterId}&keywordIds=${k.id}`}
                                    className="text-primary hover:underline inline-flex items-center gap-1"
                                  >
                                    <FileText className="h-3 w-3" /> Tạo content từ keyword này
                                  </Link>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bulk action bar (sticky bottom) */}
      {selected.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-background border rounded-full shadow-lg px-3 py-2 flex items-center gap-2 text-sm">
          <span className="font-medium">{selected.size} đã chọn</span>
          <span className="text-muted-foreground">·</span>
          <Select onValueChange={(v) => bulkMove(v === "__remove__" ? null : v)}>
            <SelectTrigger className="h-8 w-[170px] text-xs border-0 bg-muted/50">
              <SelectValue placeholder="Chuyển pillar..." />
            </SelectTrigger>
            <SelectContent>
              {otherPillars.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  → {p.name}
                </SelectItem>
              ))}
              <SelectItem value="__remove__">
                <span className="text-destructive">Bỏ khỏi pillar</span>
              </SelectItem>
            </SelectContent>
          </Select>
          <Select onValueChange={bulkSetStage}>
            <SelectTrigger className="h-8 w-[140px] text-xs border-0 bg-muted/50">
              <SelectValue placeholder="Set funnel..." />
            </SelectTrigger>
            <SelectContent>
              {FUNNELS.map((f) => (
                <SelectItem key={f} value={f}>
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
