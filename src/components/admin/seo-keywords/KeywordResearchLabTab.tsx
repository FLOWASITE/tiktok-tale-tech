import { useState, useRef, useMemo, useEffect } from "react";
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
import { Loader2, Sparkles, X, Globe, Target, MapPin, Telescope } from "lucide-react";
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

export default function KeywordResearchLabTab() {
  const { currentOrganization } = useOrganization();
  const { currentBrand } = useCurrentBrand();
  const orgId = currentOrganization?.id;
  const qc = useQueryClient();

  const [seedsText, setSeedsText] = useState("");
  const [competitorText, setCompetitorText] = useState("");
  const [preset, setPreset] = useState<Preset>("default");
  const [limit, setLimit] = useState(30);

  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState("");
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [previewKeywords, setPreviewKeywords] = useState<PreviewKeyword[]>([]);
  const [serpInfo, setSerpInfo] = useState<{ hasFirecrawl: boolean; results: Record<string, number> } | null>(null);
  const [expandedSeeds, setExpandedSeeds] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  // Pre-fill seeds từ content_pillars của brand active
  const suggestedSeeds = useMemo<string[]>(() => {
    const pillars = currentBrand?.content_pillars;
    if (!Array.isArray(pillars) || pillars.length === 0) return [];
    const sorted = [...pillars].sort((a: any, b: any) => (b?.weight ?? 0) - (a?.weight ?? 0));
    const seen = new Set<string>();
    const out: string[] = [];
    for (const p of sorted) {
      const candidate = (Array.isArray((p as any)?.keywords) && (p as any).keywords[0])
        ? String((p as any).keywords[0])
        : String((p as any)?.name || "");
      const trimmed = candidate.trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(trimmed);
      if (out.length >= 5) break;
    }
    return out;
  }, [currentBrand?.id, currentBrand?.content_pillars]);

  // Auto-fill khi đổi brand và textarea còn trống
  useEffect(() => {
    if (suggestedSeeds.length > 0 && seedsText.trim() === "") {
      setSeedsText(suggestedSeeds.join("\n"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBrand?.id]);


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

  const handleRun = async () => {
    const seeds = seedsText.split("\n").map(s => s.trim()).filter(Boolean).slice(0, 5);
    const competitorUrls = competitorText.split("\n").map(s => s.trim()).filter(Boolean).slice(0, 3);
    if (!seeds.length || !orgId) {
      toast.error("Cần ít nhất 1 seed keyword");
      return;
    }
    setRunning(true);
    setProgress(0);
    setProgressMsg("Đang khởi động...");
    setPreviewKeywords([]);
    setSerpInfo(null);
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
        body: JSON.stringify({ seeds, competitorUrls, preset, organizationId: orgId, locale: "vi", limit }),
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
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
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
            } else if (currentEvent === "keyword_batch") {
              setPreviewKeywords(prev => [...prev, ...(data.batch || [])]);
            } else if (currentEvent === "done") {
              setProgress(100);
              setProgressMsg(`Hoàn tất: ${data.total} keyword (${data.gaps} gap mới)`);
              setActiveJobId(data.jobId);
              toast.success(`AI sinh xong ${data.total} keyword. Chọn để lưu.`);
              qc.invalidateQueries({ queryKey: ["keyword-jobs-v2"] });
            } else if (currentEvent === "error") {
              throw new Error(data.message || "Stream error");
            }
          } catch (e) { /* partial json — ignore */ }
        }
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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> AI Research Lab v2
            <Badge variant="outline" className="text-[10px]">SERP grounded</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <Label className="text-xs">Seed keywords (1 dòng = 1 seed, max 5)</Label>
                {suggestedSeeds.length > 0 && seedsText.trim() === "" && currentBrand && (
                  <button
                    type="button"
                    onClick={() => setSeedsText(suggestedSeeds.join("\n"))}
                    className="text-[10px] px-2 py-0.5 rounded-full border border-border bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition"
                  >
                    Dùng gợi ý từ «{currentBrand.brand_name}»
                  </button>
                )}
              </div>
              <Textarea rows={4} value={seedsText} onChange={e => setSeedsText(e.target.value)}
                placeholder={currentBrand && suggestedSeeds.length > 0
                  ? `Auto-fill từ content pillars của brand, hoặc gõ tay...`
                  : `AI tạo content cho spa\ncách viết caption Instagram\n...`}
                className="font-mono text-sm" />
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

          <div className="flex items-end gap-2">
            <div className="flex-1 max-w-[180px]">
              <Label className="text-xs">Số lượng (5-100)</Label>
              <Input type="number" min={5} max={100} value={limit}
                onChange={e => setLimit(Math.min(100, Math.max(5, parseInt(e.target.value) || 30)))} />
            </div>
            {running ? (
              <Button variant="outline" onClick={handleCancel}><X className="h-4 w-4 mr-1" />Huỷ</Button>
            ) : (
              <Button onClick={handleRun} disabled={!seedsText.trim()}>
                <Sparkles className="h-4 w-4 mr-1" />Run research
              </Button>
            )}
          </div>

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
