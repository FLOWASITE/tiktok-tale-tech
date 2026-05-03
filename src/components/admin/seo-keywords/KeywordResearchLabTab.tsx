import { useState, useRef, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useCurrentBrand } from "@/contexts/BrandContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Loader2, Sparkles, X, Globe, Target, MapPin, Telescope, ChevronDown, Wand2, Info, Settings2, Search, Layers, Database, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import KeywordPreviewTable, { type PreviewKeyword } from "./KeywordPreviewTable";
import IntentFunnelMatrix from "./IntentFunnelMatrix";

type Preset = "default" | "long_tail_questions" | "commercial_intent" | "local_seo_vn" | "competitor_gaps";

const PRESETS: { id: Preset; label: string; icon: any }[] = [
  { id: "long_tail_questions", label: "Long-tail Q&A", icon: Telescope },
  { id: "commercial_intent", label: "Commercial intent", icon: Target },
  { id: "local_seo_vn", label: "Local SEO VN", icon: MapPin },
  { id: "competitor_gaps", label: "Competitor gaps", icon: Globe },
];

function deriveBrandSeeds(brand: any): string[] {
  if (!brand) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (s: string) => {
    const t = (s || "").trim();
    if (!t) return;
    const k = t.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    out.push(t);
  };
  const pillars = Array.isArray(brand.content_pillars) ? [...brand.content_pillars] : [];
  pillars.sort((a: any, b: any) => (b?.weight ?? 0) - (a?.weight ?? 0));
  for (const p of pillars) {
    const kw = Array.isArray(p?.keywords) && p.keywords[0] ? String(p.keywords[0]) : String(p?.name || "");
    push(kw);
    if (out.length >= 5) break;
  }
  // Fallback nếu chưa đủ 3 seed
  const industry = brand.industry || "";
  const name = brand.brand_name || brand.name || "";
  if (out.length < 3) {
    if (name && industry) push(`${name} ${industry}`);
    if (industry) push(`${industry} là gì`);
    if (industry) push(`cách chọn ${industry}`);
    if (name) push(name);
  }
  return out.slice(0, 5);
}

export default function KeywordResearchLabTab() {
  const { currentOrganization } = useOrganization();
  const { currentBrand } = useCurrentBrand();
  const orgId = currentOrganization?.id;
  const qc = useQueryClient();

  const [overrideSeedsText, setOverrideSeedsText] = useState("");
  const [competitorText, setCompetitorText] = useState("");
  const [preset, setPreset] = useState<Preset>("default");
  const [limit, setLimit] = useState(30);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState("");
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [previewKeywords, setPreviewKeywords] = useState<PreviewKeyword[]>([]);
  const [serpInfo, setSerpInfo] = useState<{ hasFirecrawl: boolean; results: Record<string, number> } | null>(null);
  const [expandedSeeds, setExpandedSeeds] = useState<string[]>([]);
  const [brandSignals, setBrandSignals] = useState<{
    active_platforms: string[];
    handles: { platform: string; handle: string }[];
    recent_topics: string[];
    recent_hashtags: string[];
    frequent_terms: string[];
    audience_questions: string[];
  } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const autoSeeds = useMemo(() => deriveBrandSeeds(currentBrand), [currentBrand?.id, currentBrand?.content_pillars, currentBrand?.industry, currentBrand?.brand_name]);
  const overrideSeeds = useMemo(
    () => overrideSeedsText.split("\n").map(s => s.trim()).filter(Boolean).slice(0, 5),
    [overrideSeedsText]
  );
  const effectiveSeeds = overrideSeeds.length > 0 ? overrideSeeds : autoSeeds;
  const hasPillars = Array.isArray(currentBrand?.content_pillars) && currentBrand.content_pillars.length > 0;

  const { data: jobs } = useQuery({
    queryKey: ["keyword-jobs-v2", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase.from("keyword_research_jobs")
        .select("id,seed_keyword,seeds,preset,status,keywords_added,selected_count,error_message,created_at,completed_at,preview")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false }).limit(20);
      return data || [];
    },
    refetchInterval: 5000,
  });

  const handleRun = async (deep = false) => {
    if (!orgId) return;
    if (!currentBrand && overrideSeeds.length === 0) {
      toast.error("Chọn brand hoặc nhập seed thủ công ở Tuỳ chỉnh nâng cao");
      return;
    }
    if (effectiveSeeds.length === 0) {
      toast.error("Brand chưa có pillars/industry — nhập seed thủ công ở Tuỳ chỉnh nâng cao");
      return;
    }
    const competitorUrls = competitorText.split("\n").map(s => s.trim()).filter(Boolean).slice(0, 3);
    setRunning(true);
    setProgress(0);
    setProgressMsg("Đang khởi động...");
    setPreviewKeywords([]);
    setSerpInfo(null);
    setExpandedSeeds([]);
    setBrandSignals(null);
    setActiveJobId(null);

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/keyword-research-v2`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.access_token || ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          seeds: effectiveSeeds,
          competitorUrls,
          preset,
          organizationId: orgId,
          brandTemplateId: currentBrand?.id,
          locale: "vi",
          limit: deep ? 150 : limit,
          mode: deep ? "deep" : "preview",
          autoFromBrand: overrideSeeds.length === 0,
        }),
        signal: ctrl.signal,
      });
      if (!resp.ok || !resp.body) {
        const t = await resp.text().catch(() => "");
        throw new Error(`HTTP ${resp.status}: ${t.slice(0, 200)}`);
      }
      const reader = resp.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let currentEvent = "";
      let lastChunkAt = Date.now();
      const watchdog = setInterval(() => {
        if (Date.now() - lastChunkAt > 90_000) {
          ctrl.abort();
          clearInterval(watchdog);
        }
      }, 5000);
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          lastChunkAt = Date.now();
          buf += dec.decode(value, { stream: true });
          let nl: number;
          while ((nl = buf.indexOf("\n")) !== -1) {
            let line = buf.slice(0, nl);
            buf = buf.slice(nl + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (line.startsWith("event: ")) { currentEvent = line.slice(7).trim(); continue; }
            if (!line.startsWith("data: ")) continue;
            const json = line.slice(6);
            try {
              const data = JSON.parse(json);
              if (currentEvent === "progress") {
                setProgress(data.pct || 0);
                if (data.message) setProgressMsg(data.message);
                if (data.jobId) setActiveJobId(data.jobId);
              } else if (currentEvent === "serp") {
                setSerpInfo(data);
              } else if (currentEvent === "expanded_seeds") {
                setExpandedSeeds(Array.isArray(data.seeds) ? data.seeds : []);
              } else if (currentEvent === "keyword_batch") {
                setPreviewKeywords(prev => [...prev, ...(data.batch || [])]);
              } else if (currentEvent === "done") {
                setProgress(100);
                const isDeep = data.mode === "deep";
                if (isDeep) {
                  setProgressMsg(`Deep research hoàn tất: lưu ${data.inserted}/${data.total} keyword vào pool`);
                  toast.success(`Đã lưu ${data.inserted} keyword mới vào pool. Mở Plan để xem.`);
                } else {
                  setProgressMsg(`Hoàn tất: ${data.total} keyword (${data.gaps} gap mới)`);
                  toast.success(`AI sinh xong ${data.total} keyword. Chọn để lưu.`);
                }
                setActiveJobId(data.jobId);
                qc.invalidateQueries({ queryKey: ["keyword-jobs-v2"] });
                qc.invalidateQueries({ queryKey: ["seo-keywords"] });
                qc.invalidateQueries({ queryKey: ["seo-keywords-shared"] });
              } else if (currentEvent === "error") {
                throw new Error(data.message || "Stream error");
              }
            } catch (e) { /* partial json — ignore */ }
          }
        }
      } finally {
        clearInterval(watchdog);
      }
    } catch (e: any) {
      if (e.name !== "AbortError") {
        toast.error(e.message || "Lỗi research");
        setProgressMsg(`Lỗi: ${e.message}`);
      }
    } finally {
      setRunning(false);
    }
  };

  const handleCancel = () => {
    abortRef.current?.abort();
    setRunning(false);
    setProgressMsg("Đã huỷ");
  };

  const loadJobPreview = async (jobId: string) => {
    const { data } = await supabase.from("keyword_research_jobs").select("preview").eq("id", jobId).single();
    if (data?.preview && Array.isArray(data.preview)) {
      setPreviewKeywords(data.preview as any);
      setActiveJobId(jobId);
      toast.info("Đã nạp lại preview");
    }
  };

  if (!orgId) return <p className="text-muted-foreground">Chọn workspace.</p>;

  const canRun = !running && effectiveSeeds.length > 0;

  // Phase mapping for stepper
  const PHASES = [
    { id: "serp", label: "SERP grounding", icon: Search, range: [0, 15] },
    { id: "expand", label: "Expand seeds", icon: Layers, range: [15, 40] },
    { id: "generate", label: "AI generation", icon: Sparkles, range: [40, 90] },
    { id: "save", label: "Save pool", icon: Database, range: [90, 100] },
  ] as const;
  const currentPhaseIdx = PHASES.findIndex(p => progress >= p.range[0] && progress < p.range[1]);
  const activeIdx = progress >= 100 ? PHASES.length - 1 : (currentPhaseIdx === -1 ? 0 : currentPhaseIdx);

  return (
    <div className="space-y-4">
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 flex-wrap">
            <Sparkles className="h-4 w-4 text-foreground/70" />
            <span>AI Research Lab</span>
            {currentBrand && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span className="text-sm font-normal text-muted-foreground">
                  {currentBrand.brand_name}
                </span>
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Brand context panel */}
          {!currentBrand ? (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border/50 bg-muted/30 text-xs">
              <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground flex-1">
                AI cần brand context để tự nghiên cứu keyword.
              </span>
              <Link to="/brand" className="text-foreground hover:underline font-medium">
                Chọn brand →
              </Link>
            </div>
          ) : (
            <div className="rounded-lg border border-border/50 bg-muted/30 p-3.5 space-y-2.5">
              <div className="grid md:grid-cols-[minmax(0,180px)_1fr] gap-4">
                {/* Brand summary */}
                <div className="space-y-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70">Brand context</p>
                  <p className="text-sm font-medium text-foreground truncate">{currentBrand.brand_name}</p>
                  <p className="text-xs text-muted-foreground space-x-1">
                    {currentBrand.industry && <span>{currentBrand.industry}</span>}
                    {hasPillars && (
                      <>
                        <span className="text-muted-foreground/40">·</span>
                        <span>{currentBrand.content_pillars.length} pillars</span>
                      </>
                    )}
                  </p>
                </div>
                {/* Seeds */}
                <div className="space-y-1.5 min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                    {overrideSeeds.length > 0 ? "Manual seeds" : "Auto seeds (smart-derived)"}
                  </p>
                  {effectiveSeeds.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {effectiveSeeds.map((s, i) => (
                        <span key={i} className="text-[11px] px-2 py-0.5 rounded-full border border-border/60 bg-background text-foreground inline-flex items-center gap-1.5">
                          {overrideSeeds.length > 0 && <span className="h-1 w-1 rounded-full bg-muted-foreground/50" />}
                          {s}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Info className="w-3 h-3" />
                      <span>
                        Brand chưa có pillars/industry.{" "}
                        <Link to="/brand" className="underline hover:text-foreground">Cấu hình →</Link>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Brand DNA detail */}
              {(() => {
                const usp = (currentBrand as any).unique_value_proposition;
                const positioning = (currentBrand as any).brand_positioning;
                const audience = [(currentBrand as any).target_age_range, (currentBrand as any).market_segment, (currentBrand as any).target_gender].filter(Boolean).join(" / ");
                const locations: string[] = Array.isArray((currentBrand as any).target_locations) ? (currentBrand as any).target_locations : [];
                const competitors: string[] = Array.isArray((currentBrand as any).main_competitors) ? (currentBrand as any).main_competitors : [];
                const evergreen: string[] = Array.isArray((currentBrand as any).evergreen_themes) ? (currentBrand as any).evergreen_themes : [];
                const hasDna = !!(usp || positioning || audience || locations.length || competitors.length || evergreen.length);
                if (!hasDna) return null;
                return (
                  <Collapsible>
                    <CollapsibleTrigger className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition w-full pt-1.5 border-t border-border/40">
                      <Sparkles className="h-3 w-3" />
                      <span>Brand DNA AI đang áp dụng</span>
                      <ChevronDown className="h-3 w-3 ml-auto transition-transform data-[state=open]:rotate-180" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-1.5 pt-2 text-[11px]">
                      {usp && <div><span className="text-muted-foreground/70">USP: </span><span className="text-foreground">{usp}</span></div>}
                      {positioning && <div><span className="text-muted-foreground/70">Positioning: </span><span className="text-foreground">{positioning}</span></div>}
                      {audience && <div><span className="text-muted-foreground/70">Audience: </span><span className="text-foreground">{audience}</span>{locations.length > 0 && <span className="text-muted-foreground"> · {locations.join(", ")}</span>}</div>}
                      {competitors.length > 0 && <div><span className="text-muted-foreground/70">Đối thủ: </span><span className="text-foreground">{competitors.slice(0, 4).join(", ")}</span></div>}
                      {evergreen.length > 0 && <div><span className="text-muted-foreground/70">Evergreen: </span><span className="text-foreground">{evergreen.slice(0, 4).join(" · ")}</span></div>}
                    </CollapsibleContent>
                  </Collapsible>
                );
              })()}
            </div>
          )}

          {/* Primary CTA */}
          {!running ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-stretch gap-2">
                <Button
                  size="lg"
                  onClick={() => handleRun(true)}
                  disabled={!canRun}
                  className="flex-1 min-w-[260px] h-auto py-3 px-4 flex items-center justify-start gap-3 text-left"
                >
                  <Wand2 className="h-5 w-5 shrink-0" />
                  <div className="flex flex-col items-start gap-0 leading-tight">
                    <span className="font-semibold">Auto research bộ keyword brand</span>
                    <span className="text-[11px] font-normal opacity-80">AI mở rộng 2 vòng → lưu 100-200 keyword vào pool</span>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleRun(false)}
                  disabled={!canRun}
                  className="h-auto py-3 px-4 flex flex-col items-start gap-0 leading-tight"
                  title="Sinh preview để chọn keyword muốn lưu"
                >
                  <span className="font-medium text-sm flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" /> Run preview
                  </span>
                  <span className="text-[10px] font-normal text-muted-foreground">Xem trước · chọn lọc</span>
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {effectiveSeeds.length} seed · preset <span className="text-foreground/70">{preset === "default" ? "default" : preset}</span> · limit {limit}
              </p>
            </div>
          ) : (
            /* Progress phases */
            <div className="space-y-3 rounded-lg border border-border/50 bg-muted/20 p-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs">
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                  <span className="text-foreground font-medium">{progressMsg || "Đang khởi động..."}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="tabular-nums text-xs text-muted-foreground">{progress}%</span>
                  <Button size="sm" variant="ghost" onClick={handleCancel} className="h-7 px-2 text-xs">
                    <X className="h-3 w-3 mr-1" /> Huỷ
                  </Button>
                </div>
              </div>

              {/* Stepper */}
              <div className="flex items-center gap-1 overflow-x-auto">
                {PHASES.map((p, i) => {
                  const Icon = p.icon;
                  const done = i < activeIdx || progress >= 100;
                  const active = i === activeIdx && progress < 100;
                  return (
                    <div key={p.id} className="flex items-center gap-1 flex-1 min-w-0">
                      <div className={cn(
                        "flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] whitespace-nowrap",
                        done && "text-foreground",
                        active && "text-foreground font-medium bg-background border border-border/60",
                        !done && !active && "text-muted-foreground/60"
                      )}>
                        <span className={cn(
                          "h-1.5 w-1.5 rounded-full shrink-0",
                          done && "bg-foreground",
                          active && "bg-foreground animate-pulse",
                          !done && !active && "bg-muted-foreground/30"
                        )} />
                        {done && !active ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                        <span>{p.label}</span>
                      </div>
                      {i < PHASES.length - 1 && (
                        <div className={cn(
                          "h-px flex-1 min-w-[8px]",
                          done ? "bg-foreground/40" : "bg-border/60"
                        )} />
                      )}
                    </div>
                  );
                })}
              </div>

              <Progress value={progress} className="h-1" />

              {/* Inline phase details */}
              {(serpInfo || expandedSeeds.length > 0) && (
                <div className="space-y-2 pt-1 border-t border-border/40">
                  {serpInfo && (
                    <div className="flex items-start gap-1.5 text-[10px] text-muted-foreground">
                      <span className={cn("mt-0.5", serpInfo.hasFirecrawl ? "text-foreground/70" : "text-muted-foreground")}>
                        {serpInfo.hasFirecrawl ? "✓" : "○"}
                      </span>
                      <span>
                        SERP · {Object.entries(serpInfo.results).map(([k, v]) => `${k} (${v})`).join(" · ") || "no data"}
                      </span>
                    </div>
                  )}
                  {expandedSeeds.length > 0 && (
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-1">Seed mở rộng:</p>
                      <div className="flex flex-wrap gap-1">
                        {expandedSeeds.map((s, i) => (
                          <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full bg-background text-muted-foreground border border-border/50">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Advanced collapsible */}
          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <div className="border-t border-border/40 pt-3">
              <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition">
                <Settings2 className="h-3.5 w-3.5" />
                <span>Tuỳ chỉnh nâng cao</span>
                <ChevronDown className={cn("h-3 w-3 transition-transform", advancedOpen && "rotate-180")} />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-3">
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Seed override (1 dòng = 1 seed, max 5)</Label>
                    <Textarea
                      rows={3}
                      value={overrideSeedsText}
                      onChange={e => setOverrideSeedsText(e.target.value)}
                      placeholder={autoSeeds.length > 0 ? `Để trống = dùng auto:\n${autoSeeds.slice(0, 2).join("\n")}` : `nhập seed...`}
                      className="font-mono text-sm resize-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <Globe className="h-3 w-3" /> URL đối thủ (max 3)
                    </Label>
                    <Textarea
                      rows={3}
                      value={competitorText}
                      onChange={e => setCompetitorText(e.target.value)}
                      placeholder={`https://competitor.com/blog`}
                      className="font-mono text-xs resize-none"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex-1 min-w-[260px]">
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Preset</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {PRESETS.map(p => {
                        const Icon = p.icon;
                        const active = preset === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setPreset(active ? "default" : p.id)}
                            className={cn(
                              "text-xs px-2.5 py-1 rounded-full border flex items-center gap-1 transition",
                              active
                                ? "bg-foreground text-background border-foreground"
                                : "bg-background hover:bg-muted/60 border-border/60 text-muted-foreground"
                            )}
                          >
                            <Icon className="h-3 w-3" /> {p.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="w-[120px]">
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Số lượng</Label>
                    <Input
                      type="number"
                      min={5}
                      max={100}
                      value={limit}
                      onChange={e => setLimit(Math.min(100, Math.max(5, parseInt(e.target.value) || 30)))}
                      className="h-8"
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        </CardContent>
      </Card>

      {previewKeywords.length > 0 && activeJobId && (
        <>
          <KeywordPreviewTable
            jobId={activeJobId}
            keywords={previewKeywords}
            isStreaming={running}
            onSaved={() => { setPreviewKeywords([]); qc.invalidateQueries({ queryKey: ["seo-keywords-shared"] }); }}
          />
          <IntentFunnelMatrix keywords={previewKeywords} />
        </>
      )}

      <Card className="border-border/60">
        <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-muted-foreground">Lịch sử jobs</CardTitle></CardHeader>
        <CardContent className="pt-0">
          {(!jobs || jobs.length === 0) ? (
            <p className="text-xs text-muted-foreground py-4 text-center">Chưa có job nào.</p>
          ) : (
            <div className="divide-y divide-border/40">
              {jobs.map((j: any) => {
                const seedsList: string[] = Array.isArray(j.seeds) ? j.seeds : [j.seed_keyword];
                const hasPreview = Array.isArray(j.preview) && j.preview.length > 0;
                const dotColor =
                  j.status === "done" ? "bg-foreground" :
                  j.status === "failed" ? "bg-destructive" :
                  j.status === "running" ? "bg-foreground animate-pulse" :
                  "bg-muted-foreground/40";
                return (
                  <div key={j.id} className="flex items-center justify-between gap-3 py-2.5 hover:bg-muted/20 -mx-2 px-2 rounded transition">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotColor)} />
                        <span className="text-sm font-medium truncate text-foreground">
                          {seedsList.slice(0, 2).join(", ")}{seedsList.length > 2 && ` +${seedsList.length - 2}`}
                        </span>
                        {j.preset && j.preset !== "default" && (
                          <Badge variant="outline" className="text-[10px] font-normal h-4 px-1.5">{j.preset}</Badge>
                        )}
                        <span className="text-[11px] text-muted-foreground">
                          {j.status === "preview_ready" ? "preview chờ chọn" : j.status}
                        </span>
                      </div>
                      {j.error_message && <p className="text-xs text-destructive mt-0.5 ml-3.5">{j.error_message}</p>}
                      <p className="text-[11px] text-muted-foreground mt-0.5 ml-3.5">
                        {formatDistanceToNow(new Date(j.created_at), { addSuffix: true, locale: vi })}
                        {j.status === "done" && ` · đã lưu ${j.keywords_added}/${j.selected_count || j.keywords_added}`}
                      </p>
                    </div>
                    {hasPreview && j.status === "preview_ready" && (
                      <Button size="sm" variant="ghost" onClick={() => loadJobPreview(j.id)} className="h-7 text-xs">Mở preview</Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
