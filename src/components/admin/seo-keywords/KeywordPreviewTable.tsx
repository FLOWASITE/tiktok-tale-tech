import { useState, useMemo, Fragment as FragmentGroup } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Loader2, Save, CheckSquare, Square, Sparkles, Trophy, ChevronRight, ChevronDown, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  CATEGORY_META,
  CATEGORY_ORDER,
  categorizeKeyword,
  buildContextFromBrand,
  expandKeywordWithModifiers,
  type KeywordCategory,
  type CategorizerContext,
} from "@/lib/seo/keywordCategorizer";

export interface PreviewKeyword {
  keyword: string;
  search_volume: number;
  difficulty: number;
  cpc_vnd?: number;
  intent: string;
  funnel_stage: string;
  cluster_name: string;
  rationale?: string;
  source_seed?: string;
  pillar_match?: string | null;
  audience_match?: "core" | "adjacent" | "off-target";
  brand_fit_score?: number;
  brand_fit_reason?: string;
  final_score?: number;
  social_match?: string | null;
  is_gap?: boolean;
  priority_breakdown?: {
    relevance: number;
    intent: string;
    intent_weight: number;
    volume: number;
    difficulty: number;
  };
  _pending?: boolean;
}

interface Props {
  jobId: string;
  keywords: PreviewKeyword[];
  isStreaming: boolean;
  onSaved?: (inserted: number, enrichJobId: string | null) => void;
  /** Brand for category detection. If omitted, all keywords go to "topical". */
  brand?: any;
  /** Callback when user clicks "expand modifier" — to add new seeds back to research */
  onExpandSeed?: (newSeeds: string[]) => void;
}

const INTENT_COLORS: Record<string, string> = {
  informational: "bg-blue-50 text-blue-700 border-blue-200",
  commercial: "bg-amber-50 text-amber-700 border-amber-200",
  transactional: "bg-emerald-50 text-emerald-700 border-emerald-200",
  navigational: "bg-purple-50 text-purple-700 border-purple-200",
};

const INTENT_BONUS: Record<string, number> = {
  transactional: 100, commercial: 80, informational: 50, navigational: 30,
};

function computeScore(k: PreviewKeyword): number {
  const vol = Math.min(100, ((k.search_volume || 0) / 5000) * 100); // normalize 5000+ → 100
  const ease = 100 - (k.difficulty || 50);
  const intent = INTENT_BONUS[k.intent] ?? 50;
  return Math.round(vol * 0.5 + ease * 0.3 + intent * 0.2);
}

function scoreColor(s: number): string {
  if (s >= 70) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (s >= 40) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-muted text-muted-foreground border-border";
}

// Simple cluster canonicalization: lowercase + strip diacritics + dedupe near-duplicates
function normalizeCluster(name: string): string {
  return (name || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .trim().replace(/\s+/g, " ");
}

function jaccard(a: string, b: string): number {
  const sa = new Set(a.split(" ").filter(Boolean));
  const sb = new Set(b.split(" ").filter(Boolean));
  const inter = [...sa].filter(x => sb.has(x)).length;
  const union = new Set([...sa, ...sb]).size || 1;
  return inter / union;
}

function buildClusterMap(keywords: PreviewKeyword[]): Map<string, string> {
  // canonical cluster name → display name (longest)
  const groups: { norm: string; display: string; count: number }[] = [];
  const norms = [...new Set(keywords.map(k => normalizeCluster(k.cluster_name)))].filter(Boolean);
  for (const n of norms) {
    const display = keywords.find(k => normalizeCluster(k.cluster_name) === n)?.cluster_name || n;
    let merged = false;
    for (const g of groups) {
      if (jaccard(g.norm, n) >= 0.6) {
        g.count++;
        if (display.length > g.display.length) g.display = display;
        // map this norm to canonical
        groups.push({ norm: n, display: g.display, count: 0 });
        merged = true;
        break;
      }
    }
    if (!merged) groups.push({ norm: n, display, count: 1 });
  }
  // build mapping from each norm → canonical display
  const map = new Map<string, string>();
  for (const g of groups) map.set(g.norm, g.display);
  return map;
}

export default function KeywordPreviewTable({ jobId, keywords, isStreaming, onSaved, brand, onExpandSeed }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("");
  const [intentFilter, setIntentFilter] = useState<string | null>(null);
  const [funnelFilter, setFunnelFilter] = useState<string | null>(null);
  const [gapOnly, setGapOnly] = useState(false);
  const [pillarOnly, setPillarOnly] = useState(false);
  const [coreAudienceOnly, setCoreAudienceOnly] = useState(false);
  const [minBrandFit, setMinBrandFit] = useState(0);
  const [sortByScore, setSortByScore] = useState(true);
  const [saving, setSaving] = useState(false);
  const [groupBy, setGroupBy] = useState<"category" | "intent" | "funnel" | "none">("category");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<KeywordCategory | null>(null);

  const hasPillarData = useMemo(() => keywords.some(k => k.pillar_match), [keywords]);
  const hasBrandFit = useMemo(() => keywords.some(k => typeof k.brand_fit_score === "number"), [keywords]);

  const clusterMap = useMemo(() => buildClusterMap(keywords), [keywords]);
  const ctx: CategorizerContext = useMemo(() => buildContextFromBrand(brand), [brand]);

  const enriched = useMemo(() => keywords.map(k => {
    const priority = computeScore(k);
    const fit = typeof k.brand_fit_score === "number" ? k.brand_fit_score : null;
    const final = typeof k.final_score === "number"
      ? k.final_score
      : (fit !== null ? Math.round(priority * 0.6 + fit * 0.4) : priority);
    return {
      ...k,
      _score: final,
      _priority: priority,
      _fit: fit,
      _cluster: clusterMap.get(normalizeCluster(k.cluster_name)) || k.cluster_name,
      _category: categorizeKeyword(k.keyword, ctx, { intent: k.intent }),
    };
  }), [keywords, clusterMap, ctx]);

  const filtered = useMemo(() => {
    let list = enriched.filter(k => {
      if (filter && !k.keyword.toLowerCase().includes(filter.toLowerCase())) return false;
      if (intentFilter && k.intent !== intentFilter) return false;
      if (funnelFilter && k.funnel_stage !== funnelFilter) return false;
      if (gapOnly && !k.is_gap) return false;
      if (pillarOnly && !k.pillar_match) return false;
      if (coreAudienceOnly && k.audience_match !== "core") return false;
      if (minBrandFit > 0 && (k._fit ?? 0) < minBrandFit) return false;
      if (categoryFilter && k._category !== categoryFilter) return false;
      return true;
    });
    if (sortByScore) list = [...list].sort((a, b) => b._score - a._score);
    return list;
  }, [enriched, filter, intentFilter, funnelFilter, gapOnly, pillarOnly, coreAudienceOnly, minBrandFit, sortByScore, categoryFilter]);

  // ---- Group rows by selected dimension ----
  const groups = useMemo(() => {
    if (groupBy === "none") return [{ key: "all", label: "Tất cả", items: filtered, meta: null as any }];
    const buckets = new Map<string, typeof filtered>();
    for (const k of filtered) {
      const key =
        groupBy === "category" ? k._category :
        groupBy === "intent" ? (k.intent || "unknown") :
        (k.funnel_stage || "unknown");
      if (!buckets.has(key)) buckets.set(key, [] as any);
      buckets.get(key)!.push(k);
    }
    if (groupBy === "category") {
      return CATEGORY_ORDER.filter(c => buckets.has(c)).map(c => ({
        key: c, label: CATEGORY_META[c].label, items: buckets.get(c)!, meta: CATEGORY_META[c],
      }));
    }
    return Array.from(buckets.entries()).map(([key, items]) => ({ key, label: key, items, meta: null as any }));
  }, [filtered, groupBy]);

  const toggleGroup = (key: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };
  const selectGroup = (items: typeof filtered) => {
    setSelected(prev => {
      const next = new Set(prev);
      items.forEach(it => next.add(it.keyword));
      return next;
    });
  };


  const toggle = (kw: string) => {
    const next = new Set(selected);
    next.has(kw) ? next.delete(kw) : next.add(kw);
    setSelected(next);
  };
  const selectAll = () => setSelected(new Set(filtered.map(k => k.keyword)));
  const selectGaps = () => setSelected(new Set(filtered.filter(k => k.is_gap).map(k => k.keyword)));
  const selectTop20 = () => {
    const top = [...enriched].sort((a, b) => b._score - a._score).slice(0, 20);
    setSelected(new Set(top.map(k => k.keyword)));
  };
  const clear = () => setSelected(new Set());

  const handleSave = async () => {
    if (!selected.size) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("keyword-research-save", {
        body: { jobId, selectedKeywords: [...selected], autoEnrich: true, locale: "vi" },
      });
      if (error) throw error;
      toast.success(`Đã lưu ${data.inserted} keyword${data.enrichJobId ? " + đang enrich top 10" : ""}`);
      setSelected(new Set());
      onSaved?.(data.inserted, data.enrichJobId);
    } catch (e: any) {
      toast.error(e.message || "Lỗi khi lưu");
    } finally {
      setSaving(false);
    }
  };

  const gapCount = keywords.filter(k => k.is_gap).length;
  const pillarMatchCount = keywords.filter(k => k.pillar_match).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2 flex-wrap">
            <Sparkles className="h-4 w-4 text-primary" />
            Preview {keywords.length > 0 && `(${keywords.length})`}
            {isStreaming && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            {gapCount > 0 && <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">{gapCount} gap mới</Badge>}
            {pillarMatchCount > 0 && <Badge variant="secondary" className="text-xs">{pillarMatchCount} match pillar</Badge>}
          </CardTitle>
          <div className="flex gap-1.5">
            <Button size="sm" variant="outline" onClick={selectTop20} disabled={saving || keywords.length === 0}>
              <Trophy className="h-3.5 w-3.5 mr-1" /> Top 20 theo score
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving || !selected.size}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
              Lưu {selected.size} keyword
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <Input placeholder="Lọc..." value={filter} onChange={e => setFilter(e.target.value)} className="h-8 w-44" />
          <select value={intentFilter || ""} onChange={e => setIntentFilter(e.target.value || null)}
            className="h-8 px-2 rounded border text-xs bg-background">
            <option value="">Mọi intent</option>
            <option value="informational">Info</option>
            <option value="commercial">Commercial</option>
            <option value="transactional">Transactional</option>
            <option value="navigational">Navigational</option>
          </select>
          <select value={funnelFilter || ""} onChange={e => setFunnelFilter(e.target.value || null)}
            className="h-8 px-2 rounded border text-xs bg-background">
            <option value="">Mọi funnel</option>
            <option value="TOFU">TOFU</option>
            <option value="MOFU">MOFU</option>
            <option value="BOFU">BOFU</option>
          </select>
          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
            <Checkbox checked={gapOnly} onCheckedChange={v => setGapOnly(!!v)} /> Chỉ gap
          </label>
          {hasPillarData && (
            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
              <Checkbox checked={pillarOnly} onCheckedChange={v => setPillarOnly(!!v)} /> Match pillar
            </label>
          )}
          {hasBrandFit && (
            <>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <Checkbox checked={coreAudienceOnly} onCheckedChange={v => setCoreAudienceOnly(!!v)} /> Core audience
              </label>
              <label className="flex items-center gap-1.5 text-xs">
                <span className="text-muted-foreground">Brand fit ≥</span>
                <input type="range" min={0} max={100} step={10} value={minBrandFit}
                  onChange={e => setMinBrandFit(parseInt(e.target.value))}
                  className="w-20 accent-foreground" />
                <span className="tabular-nums w-7 text-right text-foreground">{minBrandFit}</span>
              </label>
            </>
          )}
          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
            <Checkbox checked={sortByScore} onCheckedChange={v => setSortByScore(!!v)} /> Sort theo score
          </label>
          <select value={groupBy} onChange={e => setGroupBy(e.target.value as any)}
            className="h-8 px-2 rounded border text-xs bg-background ml-1">
            <option value="category">Group: Category</option>
            <option value="intent">Group: Intent</option>
            <option value="funnel">Group: Funnel</option>
            <option value="none">Không nhóm</option>
          </select>
          <div className="ml-auto flex gap-1">
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={selectAll}><CheckSquare className="h-3 w-3 mr-1" />Tất cả ({filtered.length})</Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={selectGaps}>Chọn gap</Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={clear}><Square className="h-3 w-3 mr-1" />Xoá</Button>
          </div>
        </div>

        {/* Category chips: counts per Keyword Universe bucket */}
        {keywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5 items-center text-xs">
            <span className="text-muted-foreground">Universe:</span>
            <button
              type="button"
              onClick={() => setCategoryFilter(null)}
              className={cn(
                "px-2 py-0.5 rounded-full border transition",
                !categoryFilter ? "bg-foreground text-background border-foreground" : "bg-background text-muted-foreground hover:bg-muted"
              )}
            >Tất cả ({enriched.length})</button>
            {CATEGORY_ORDER.map(c => {
              const count = enriched.filter(k => k._category === c).length;
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

        <div className="border rounded max-h-[480px] overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 sticky top-0 text-xs">
              <tr>
                <th className="p-2 w-8"></th>
                <th className="p-2 text-left">Keyword</th>
                <th className="p-2 text-right">Score</th>
                {hasBrandFit && <th className="p-2 text-right">Brand fit</th>}
                <th className="p-2 text-right">Vol</th>
                <th className="p-2 text-right">KD</th>
                <th className="p-2 text-left">Intent</th>
                <th className="p-2 text-left">Funnel</th>
                <th className="p-2 text-left">Cluster / Pillar</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {groups.map(group => {
                const isCollapsed = collapsed.has(group.key);
                const colSpan = hasBrandFit ? 10 : 9;
                const meta = group.meta;
                const groupLabel = meta ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span>{meta.emoji}</span>
                    <span className="font-medium">{meta.label}</span>
                    <span className="text-[10px] text-muted-foreground hidden md:inline">— {meta.description}</span>
                  </span>
                ) : (
                  <span className="font-medium capitalize">{group.label}</span>
                );
                return (
                  <FragmentGroup key={group.key}>
                    {groupBy !== "none" && (
                      <tr className="bg-muted/40 border-t sticky">
                        <td colSpan={colSpan + 1} className="p-2">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => toggleGroup(group.key)}
                              className="inline-flex items-center gap-1 text-xs hover:text-foreground text-muted-foreground"
                            >
                              {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                              {groupLabel}
                              <span className="ml-1 text-[10px] text-muted-foreground">({group.items.length})</span>
                            </button>
                            <Button size="sm" variant="ghost" className="h-6 text-[10px] ml-auto"
                              onClick={() => selectGroup(group.items)}>
                              Chọn nhóm
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )}
                    {!isCollapsed && group.items.map((k, i) => {
                      const rowKey = `${group.key}-${k.keyword}-${i}`;
                      const isSel = selected.has(k.keyword);
                      const isExpanded = expandedRow === rowKey;
                      const fitColor = k._fit === null ? "bg-muted text-muted-foreground border-border"
                        : k._fit >= 70 ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : k._fit >= 40 ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-rose-50 text-rose-700 border-rose-200";
                      const cm = CATEGORY_META[k._category];
                      return (
                        <FragmentGroup key={rowKey}>
                          <tr className={cn("border-t hover:bg-muted/30", isSel && "bg-primary/5", k._pending && "opacity-70")}>
                            <td className="p-2"><Checkbox checked={isSel} onCheckedChange={() => toggle(k.keyword)} disabled={k._pending} /></td>
                            <td className="p-2 font-medium cursor-pointer" onClick={() => setExpandedRow(isExpanded ? null : rowKey)}>
                              <span className="inline-flex items-center gap-1.5">
                                {isExpanded ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                                <span className={cn("inline-block h-1.5 w-1.5 rounded-full", cm.dotClass)} title={cm.label} />
                                {k.keyword}
                                {k._pending && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
                                {k.social_match && (
                                  <span className="text-[9px] px-1 py-0.5 rounded bg-foreground/5 border border-border/50 text-foreground/70" title={`Khớp social: "${k.social_match}"`}>📱</span>
                                )}
                              </span>
                            </td>
                            <td className="p-2 text-right">
                              {k._pending ? (
                                <span className="inline-block h-4 w-8 rounded bg-muted animate-pulse" />
                              ) : (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded border tabular-nums cursor-help ${scoreColor(k._score)}`}
                                  title={k.priority_breakdown
                                    ? `Priority = (relevance ${k.priority_breakdown.relevance} × intent ${k.priority_breakdown.intent_weight}× × log10(${k.priority_breakdown.volume}+10)) / sqrt(${k.priority_breakdown.difficulty}+1)\nIntent: ${k.priority_breakdown.intent}`
                                    : `Score: ${k._score}`}>{k._score}</span>
                              )}
                            </td>
                            {hasBrandFit && (
                              <td className="p-2 text-right">
                                {k._pending ? <span className="text-[10px] text-muted-foreground">…</span>
                                  : k._fit !== null ? (
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded border tabular-nums ${fitColor}`}
                                    title={[k.brand_fit_reason, k.social_match ? `📱 Khớp social: "${k.social_match}"` : null, k.audience_match ? `audience: ${k.audience_match}` : null].filter(Boolean).join(" · ")}>
                                    {k._fit}
                                  </span>
                                ) : <span className="text-[10px] text-muted-foreground">—</span>}
                              </td>
                            )}
                            <td className="p-2 text-right tabular-nums">{k.search_volume ? k.search_volume.toLocaleString() : (k._pending ? <span className="text-muted-foreground">—</span> : 0)}</td>
                            <td className="p-2 text-right tabular-nums">{k.difficulty || (k._pending ? <span className="text-muted-foreground">—</span> : 0)}</td>
                            <td className="p-2"><span className={`text-[10px] px-1.5 py-0.5 rounded border ${INTENT_COLORS[k.intent] || ""}`}>{k.intent}</span></td>
                            <td className="p-2 text-xs">{k.funnel_stage}</td>
                            <td className="p-2 text-xs text-muted-foreground truncate max-w-[180px]">
                              <div className="truncate">{k._cluster}</div>
                              {k.pillar_match && <div className="text-[10px] text-primary/80 truncate">★ {k.pillar_match}</div>}
                            </td>
                            <td className="p-2">{k.is_gap && <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">Mới</Badge>}</td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-muted/20 border-t">
                              <td></td>
                              <td colSpan={colSpan} className="p-3 space-y-2">
                                <div className="flex flex-wrap gap-2 items-center text-xs">
                                  <Badge variant="outline" className={cn("text-[10px]", cm.badgeClass)}>{cm.emoji} {cm.label}</Badge>
                                  <span className="text-muted-foreground">{cm.description}</span>
                                </div>
                                {k.rationale && (
                                  <div className="text-xs text-foreground/80"><span className="text-muted-foreground">Rationale:</span> {k.rationale}</div>
                                )}
                                {k.brand_fit_reason && (
                                  <div className="text-xs text-foreground/80"><span className="text-muted-foreground">Brand fit:</span> {k.brand_fit_reason}</div>
                                )}
                                {k.priority_breakdown && (
                                  <div className="text-[10px] text-muted-foreground tabular-nums">
                                    Priority = (relevance {k.priority_breakdown.relevance} × intent {k.priority_breakdown.intent_weight}× × log10({k.priority_breakdown.volume}+10)) / √({k.priority_breakdown.difficulty}+1)
                                  </div>
                                )}
                                <div>
                                  <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                    <Plus className="h-3 w-3" /> Mở rộng modifier (click để thêm vào seed):
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {expandKeywordWithModifiers(k.keyword, ["commercial", "problem", "long_tail"]).slice(0, 12).map((s, idx) => (
                                      <button
                                        key={idx}
                                        type="button"
                                        onClick={() => onExpandSeed?.([s.keyword])}
                                        disabled={!onExpandSeed}
                                        className={cn(
                                          "text-[10px] px-2 py-0.5 rounded-full border bg-background hover:bg-muted transition",
                                          !onExpandSeed && "opacity-60 cursor-not-allowed"
                                        )}
                                        title={`Group: ${s.group}`}
                                      >
                                        + {s.keyword}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </FragmentGroup>
                      );
                    })}
                  </FragmentGroup>
                );
              })}
              {filtered.length === 0 && !isStreaming && (
                <tr><td colSpan={hasBrandFit ? 10 : 9} className="p-6 text-center text-muted-foreground text-xs">Không có keyword khớp filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
