import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Loader2, Save, CheckSquare, Square, Sparkles, Trophy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
  is_gap?: boolean;
}

interface Props {
  jobId: string;
  keywords: PreviewKeyword[];
  isStreaming: boolean;
  onSaved?: (inserted: number, enrichJobId: string | null) => void;
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

export default function KeywordPreviewTable({ jobId, keywords, isStreaming, onSaved }: Props) {
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

  const hasPillarData = useMemo(() => keywords.some(k => k.pillar_match), [keywords]);
  const hasBrandFit = useMemo(() => keywords.some(k => typeof k.brand_fit_score === "number"), [keywords]);

  const clusterMap = useMemo(() => buildClusterMap(keywords), [keywords]);

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
    };
  }), [keywords, clusterMap]);

  const filtered = useMemo(() => {
    let list = enriched.filter(k => {
      if (filter && !k.keyword.toLowerCase().includes(filter.toLowerCase())) return false;
      if (intentFilter && k.intent !== intentFilter) return false;
      if (funnelFilter && k.funnel_stage !== funnelFilter) return false;
      if (gapOnly && !k.is_gap) return false;
      if (pillarOnly && !k.pillar_match) return false;
      if (coreAudienceOnly && k.audience_match !== "core") return false;
      if (minBrandFit > 0 && (k._fit ?? 0) < minBrandFit) return false;
      return true;
    });
    if (sortByScore) list = [...list].sort((a, b) => b._score - a._score);
    return list;
  }, [enriched, filter, intentFilter, funnelFilter, gapOnly, pillarOnly, coreAudienceOnly, minBrandFit, sortByScore]);

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
          <div className="ml-auto flex gap-1">
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={selectAll}><CheckSquare className="h-3 w-3 mr-1" />Tất cả ({filtered.length})</Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={selectGaps}>Chọn gap</Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={clear}><Square className="h-3 w-3 mr-1" />Xoá</Button>
          </div>
        </div>

        <div className="border rounded max-h-[480px] overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 sticky top-0 text-xs">
              <tr>
                <th className="p-2 w-8"></th>
                <th className="p-2 text-left">Keyword</th>
                <th className="p-2 text-right">Score</th>
                <th className="p-2 text-right">Vol</th>
                <th className="p-2 text-right">KD</th>
                <th className="p-2 text-left">Intent</th>
                <th className="p-2 text-left">Funnel</th>
                <th className="p-2 text-left">Cluster / Pillar</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((k, i) => {
                const isSel = selected.has(k.keyword);
                return (
                  <tr key={i} className={`border-t hover:bg-muted/30 cursor-pointer ${isSel ? "bg-primary/5" : ""}`} onClick={() => toggle(k.keyword)}>
                    <td className="p-2"><Checkbox checked={isSel} onCheckedChange={() => toggle(k.keyword)} /></td>
                    <td className="p-2 font-medium">{k.keyword}</td>
                    <td className="p-2 text-right">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border tabular-nums ${scoreColor(k._score)}`}>{k._score}</span>
                    </td>
                    <td className="p-2 text-right tabular-nums">{k.search_volume?.toLocaleString() || 0}</td>
                    <td className="p-2 text-right tabular-nums">{k.difficulty || 0}</td>
                    <td className="p-2"><span className={`text-[10px] px-1.5 py-0.5 rounded border ${INTENT_COLORS[k.intent] || ""}`}>{k.intent}</span></td>
                    <td className="p-2 text-xs">{k.funnel_stage}</td>
                    <td className="p-2 text-xs text-muted-foreground truncate max-w-[180px]">
                      <div className="truncate">{k._cluster}</div>
                      {k.pillar_match && <div className="text-[10px] text-primary/80 truncate">★ {k.pillar_match}</div>}
                    </td>
                    <td className="p-2">{k.is_gap && <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">Mới</Badge>}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && !isStreaming && (
                <tr><td colSpan={9} className="p-6 text-center text-muted-foreground text-xs">Không có keyword khớp filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
