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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 flex-wrap">
            <Sparkles className="h-4 w-4 text-primary" /> AI Research Lab v2
            <Badge variant="outline" className="text-[10px]">SERP grounded</Badge>
            <Badge variant="outline" className="text-[10px] gap-1"><Wand2 className="h-2.5 w-2.5" /> Auto từ brand</Badge>
            {currentBrand && (
              <Badge variant="secondary" className="text-[10px] font-normal">
                Context: {currentBrand.brand_name}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Brand context panel */}
          {!currentBrand ? (
            <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-foreground/80">Chưa có brand được chọn — AI cần brand context để tự nghiên cứu keyword.</p>
                <Link to="/brand" className="text-amber-700 dark:text-amber-400 hover:underline mt-1 inline-block">
                  Chọn hoặc tạo brand →
                </Link>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-xs text-muted-foreground">
                  Sẽ research dựa trên brand{" "}
                  <strong className="text-foreground">«{currentBrand.brand_name}»</strong>
                  {currentBrand.industry && <> · ngành <strong className="text-foreground">{currentBrand.industry}</strong></>}
                  {hasPillars && <> · {currentBrand.content_pillars.length} pillars</>}
                </p>
              </div>
              {effectiveSeeds.length > 0 ? (
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">
                    {overrideSeeds.length > 0 ? "Seed (override thủ công):" : "Seed AI sẽ dùng (auto từ brand):"}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {effectiveSeeds.map((s, i) => (
                      <span key={i} className={`text-[11px] px-2 py-0.5 rounded-full border ${overrideSeeds.length > 0 ? "bg-background border-border" : "bg-primary/5 border-primary/20 text-foreground"}`}>
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2 text-[11px] text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>
                    Brand chưa có pillars/industry để suy ra seed.{" "}
                    <Link to="/brand" className="underline">Cấu hình brand →</Link>
                    {" "}hoặc nhập seed thủ công bên dưới.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Run / Cancel */}
          <div className="flex flex-wrap items-center gap-2">
            {running ? (
              <Button variant="outline" onClick={handleCancel}><X className="h-4 w-4 mr-1" />Huỷ</Button>
            ) : (
              <>
                <Button onClick={() => handleRun(false)} disabled={!canRun}>
                  <Sparkles className="h-4 w-4 mr-1" />Run research
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleRun(true)}
                  disabled={!canRun}
                  title="Multi-round expand + auto-lưu 100-200 keyword vào pool"
                >
                  <Wand2 className="h-4 w-4 mr-1" />Deep research →
                </Button>
              </>
            )}
            <span className="text-[11px] text-muted-foreground">
              {effectiveSeeds.length} seed · preset: {preset === "default" ? "default" : preset}
            </span>
          </div>

          {/* Advanced overrides */}
          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <ChevronDown className={`h-3 w-3 transition-transform ${advancedOpen ? "rotate-180" : ""}`} />
              Tuỳ chỉnh nâng cao (override seed, đối thủ, preset, limit)
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-3">
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Seed override (1 dòng = 1 seed, max 5)</Label>
                  <Textarea
                    rows={4}
                    value={overrideSeedsText}
                    onChange={e => setOverrideSeedsText(e.target.value)}
                    placeholder={autoSeeds.length > 0 ? `Để trống = dùng auto từ brand:\n${autoSeeds.join("\n")}` : `nhập seed...`}
                    className="font-mono text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs flex items-center gap-1"><Globe className="h-3 w-3" /> URL đối thủ (optional, max 3)</Label>
                  <Textarea rows={4} value={competitorText} onChange={e => setCompetitorText(e.target.value)}
                    placeholder={`https://competitor.com/blog\n...`} className="font-mono text-xs" />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-muted-foreground self-center mr-1">Preset:</span>
                {PRESETS.map(p => {
                  const Icon = p.icon;
                  const active = preset === p.id;
                  return (
                    <button key={p.id} type="button" onClick={() => setPreset(active ? "default" : p.id)}
                      className={`text-xs px-2.5 py-1 rounded-full border flex items-center gap-1 transition ${active ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"}`}>
                      <Icon className="h-3 w-3" /> {p.label}
                    </button>
                  );
                })}
              </div>

              <div className="max-w-[180px]">
                <Label className="text-xs">Số lượng (5-100)</Label>
                <Input type="number" min={5} max={100} value={limit}
                  onChange={e => setLimit(Math.min(100, Math.max(5, parseInt(e.target.value) || 30)))} />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {(running || progress > 0) && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  {running && <Loader2 className="h-3 w-3 animate-spin" />}
                  {progressMsg}
                </span>
                <span className="tabular-nums text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} className="h-1.5" />
              {serpInfo && (
                <p className="text-[10px] text-muted-foreground">
                  {serpInfo.hasFirecrawl ? "✓" : "⚠"} Firecrawl: {Object.entries(serpInfo.results).map(([k, v]) => `${k} (${v} results)`).join(", ") || "không có data"}
                </p>
              )}
              {expandedSeeds.length > 0 && (
                <div className="pt-1.5">
                  <p className="text-[10px] text-muted-foreground mb-1">Seed mở rộng (Autocomplete + PAA):</p>
                  <div className="flex flex-wrap gap-1">
                    {expandedSeeds.map((s, i) => (
                      <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted/60 text-muted-foreground border border-border">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
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

      <Card>
        <CardHeader><CardTitle className="text-base">Lịch sử jobs</CardTitle></CardHeader>
        <CardContent>
          {(!jobs || jobs.length === 0) ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Chưa có job nào.</p>
          ) : (
            <div className="space-y-2">
              {jobs.map((j: any) => {
                const seedsList: string[] = Array.isArray(j.seeds) ? j.seeds : [j.seed_keyword];
                const hasPreview = Array.isArray(j.preview) && j.preview.length > 0;
                return (
                  <div key={j.id} className="flex items-center justify-between p-3 rounded border text-sm hover:bg-muted/30">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">{seedsList.slice(0, 2).join(", ")}{seedsList.length > 2 && ` +${seedsList.length - 2}`}</span>
                        {j.preset && j.preset !== "default" && <Badge variant="outline" className="text-[10px]">{j.preset}</Badge>}
                        <Badge variant={j.status === "done" ? "default" : j.status === "failed" ? "destructive" : j.status === "preview_ready" ? "outline" : "secondary"} className="text-xs">
                          {j.status === "running" && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                          {j.status === "preview_ready" ? "preview chờ chọn" : j.status}
                        </Badge>
                      </div>
                      {j.error_message && <p className="text-xs text-destructive mt-1">{j.error_message}</p>}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(j.created_at), { addSuffix: true, locale: vi })}
                        {j.status === "done" && ` • Đã lưu ${j.keywords_added}/${j.selected_count || j.keywords_added}`}
                      </p>
                    </div>
                    {hasPreview && j.status === "preview_ready" && (
                      <Button size="sm" variant="ghost" onClick={() => loadJobPreview(j.id)}>Mở preview</Button>
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
