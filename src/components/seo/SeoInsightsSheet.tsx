import { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sparkles, Target, Link2, Network, Gauge,
  CheckCircle2, AlertTriangle, XCircle, ArrowRight, FileText, Type, Hash, ListTree,
} from "lucide-react";
import ClusterContextCard from "@/components/seo/ClusterContextCard";
import KeywordCoveragePanel from "@/components/seo/KeywordCoveragePanel";
import InternalLinksPanel from "@/components/seo/InternalLinksPanel";
import { useKeywordsByIds } from "@/hooks/useKeywordsByIds";
import { calculateSEOScore } from "@/utils/seoScoreCalculator";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { cn } from "@/lib/utils";

interface Props {
  contentId: string;
  clusterId?: string | null;
  targetKeywordIds?: string[] | null;
  contentText: string;
  title?: string;
  isLongForm: boolean;
}

type TabKey = "overview" | "keywords" | "links" | "cluster";

export default function SeoInsightsSheet({
  contentId, clusterId, targetKeywordIds, contentText, title, isLongForm,
}: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<TabKey>("overview");
  const hasKeywords = Array.isArray(targetKeywordIds) && targetKeywordIds.length > 0;
  const hasCluster = !!clusterId;

  const { currentOrganization } = useOrganization();
  const { data: keywords = [] } = useKeywordsByIds(targetKeywordIds ?? undefined);

  // ─── Compute overview stats (cheap, runs on open) ─────────────────────────
  const stats = useMemo(() => computeStats(contentText, title, keywords), [contentText, title, keywords]);

  // Internal links count (loaded when sheet opens)
  const [linkCount, setLinkCount] = useState<number | null>(null);
  useEffect(() => {
    if (!open || !isLongForm || !currentOrganization?.id) return;
    let alive = true;
    (async () => {
      const { count } = await (supabase as any)
        .from("internal_links")
        .select("id", { count: "exact", head: true })
        .eq("source_content_id", contentId)
        .eq("organization_id", currentOrganization.id);
      if (alive) setLinkCount(count ?? 0);
    })();
    return () => { alive = false; };
  }, [open, isLongForm, contentId, currentOrganization?.id]);

  // Cluster coverage (loaded when sheet opens)
  const [clusterCov, setClusterCov] = useState<{ covered: number; total: number; pct: number } | null>(null);
  useEffect(() => {
    if (!open || !hasCluster) return;
    let alive = true;
    (async () => {
      const { data } = await (supabase as any)
        .from("cluster_coverage")
        .select("keyword_count, keywords_covered, coverage_pct")
        .eq("cluster_id", clusterId)
        .maybeSingle();
      if (alive && data) setClusterCov({ covered: data.keywords_covered, total: data.keyword_count, pct: Number(data.coverage_pct) || 0 });
    })();
    return () => { alive = false; };
  }, [open, hasCluster, clusterId]);

  // Health = average of available dimensions (kw coverage, seo structure, links, cluster)
  const dims: Array<{ key: string; label: string; value: number; weight: number; icon: any }> = [];
  if (hasKeywords && isLongForm) dims.push({ key: "kw", label: "Từ khóa", value: stats.kwCoveragePct, weight: 0.35, icon: Target });
  if (isLongForm) {
    dims.push({ key: "seo", label: "Cấu trúc SEO", value: stats.seoScore, weight: 0.25, icon: Gauge });
    dims.push({ key: "links", label: "Liên kết nội bộ", value: linkPct(linkCount), weight: 0.20, icon: Link2 });
  }
  if (hasCluster) dims.push({ key: "cluster", label: "Cluster", value: clusterCov?.pct ?? 0, weight: 0.20, icon: Network });

  const totalWeight = dims.reduce((s, d) => s + d.weight, 0) || 1;
  const health = Math.round(dims.reduce((s, d) => s + d.value * d.weight, 0) / totalWeight);
  const tone = health >= 75 ? "good" : health >= 45 ? "warn" : "bad";
  const toneCls = tone === "good"
    ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
    : tone === "warn"
    ? "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30"
    : "text-destructive bg-destructive/10 border-destructive/30";
  const ToneIcon = tone === "good" ? CheckCircle2 : tone === "warn" ? AlertTriangle : XCircle;

  // Recommendations — based on missing pieces
  const recs = useMemo(() => buildRecs({
    isLongForm, hasKeywords, hasCluster, stats, linkCount, clusterCov,
  }), [isLongForm, hasKeywords, hasCluster, stats, linkCount, clusterCov]);

  // Default tab — overview if any data, else first available
  useEffect(() => {
    if (!open) return;
    if (dims.length > 0) setTab("overview");
    else if (hasKeywords && isLongForm) setTab("keywords");
    else if (isLongForm) setTab("links");
    else if (hasCluster) setTab("cluster");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const triggerBadgeCls = !dims.length
    ? ""
    : tone === "good" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
    : tone === "warn" ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
    : "bg-destructive/15 text-destructive border-destructive/30";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2 h-8 text-xs font-medium border-dashed"
        >
          <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="flex-1 text-left">SEO Insights</span>
          {dims.length > 0 && (
            <Badge variant="outline" className={cn("h-4 px-1.5 text-[10px] tabular-nums border", triggerBadgeCls)}>
              {health}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col">
        <SheetHeader className="px-5 py-4 border-b border-border/40 shrink-0">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Sparkles className="w-4 h-4 text-muted-foreground" />
            SEO Insights
          </SheetTitle>
          <SheetDescription className="text-xs line-clamp-1">
            {title || "Phân tích SEO chi tiết cho bài viết này"}
          </SheetDescription>
        </SheetHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-5 mt-3 grid grid-cols-4 h-9 shrink-0">
            <TabsTrigger value="overview" className="text-xs gap-1.5">
              <Gauge className="w-3.5 h-3.5" />
              Tổng quan
            </TabsTrigger>
            <TabsTrigger value="keywords" className="text-xs gap-1.5" disabled={!hasKeywords || !isLongForm}>
              <Target className="w-3.5 h-3.5" />
              Từ khóa
            </TabsTrigger>
            <TabsTrigger value="links" className="text-xs gap-1.5" disabled={!isLongForm}>
              <Link2 className="w-3.5 h-3.5" />
              Liên kết
            </TabsTrigger>
            <TabsTrigger value="cluster" className="text-xs gap-1.5" disabled={!hasCluster}>
              <Network className="w-3.5 h-3.5" />
              Cluster
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            {/* ── OVERVIEW ───────────────────────────────────────────────── */}
            <TabsContent value="overview" className="mt-0 space-y-4">
              {dims.length === 0 ? (
                <EmptyState
                  icon={<Gauge className="w-8 h-8 text-muted-foreground/40" />}
                  title="Chưa có dữ liệu SEO"
                  hint="Mở bài long-form (Website/Blog) hoặc gắn từ khóa SEO để bật phân tích."
                />
              ) : (
                <>
                  {/* Health score card */}
                  <Card className={cn("border-dashed", toneCls)}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={cn("h-12 w-12 rounded-full border flex items-center justify-center", toneCls)}>
                          <ToneIcon className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-semibold tabular-nums">{health}</span>
                            <span className="text-xs text-muted-foreground">/ 100</span>
                          </div>
                          <p className="text-xs mt-0.5 opacity-90">
                            {tone === "good" ? "SEO tổng quan tốt — sẵn sàng publish." :
                             tone === "warn" ? "Còn vài chỗ cần tinh chỉnh trước khi publish." :
                             "Cần cải thiện đáng kể để xếp hạng tốt."}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Dimension breakdown */}
                  <div className="space-y-2">
                    <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                      Phân tích chi tiết
                    </div>
                    {dims.map((d) => {
                      const DIcon = d.icon;
                      const targetTab: TabKey =
                        d.key === "kw" ? "keywords" :
                        d.key === "links" ? "links" :
                        d.key === "cluster" ? "cluster" : "overview";
                      const valTone = d.value >= 75 ? "text-emerald-600 dark:text-emerald-400"
                        : d.value >= 45 ? "text-amber-600 dark:text-amber-400"
                        : "text-destructive";
                      return (
                        <button
                          key={d.key}
                          onClick={() => targetTab !== "overview" && setTab(targetTab)}
                          className={cn(
                            "w-full text-left rounded-md border bg-card p-3 space-y-1.5 transition-colors",
                            targetTab !== "overview" && "hover:bg-muted/40 cursor-pointer"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <DIcon className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-xs font-medium flex-1">{d.label}</span>
                            <span className={cn("text-xs font-semibold tabular-nums", valTone)}>
                              {d.value}
                              <span className="text-muted-foreground font-normal">/100</span>
                            </span>
                          </div>
                          <Progress value={d.value} className="h-1" />
                        </button>
                      );
                    })}
                  </div>

                  {/* Quick stats grid */}
                  {isLongForm && (
                    <div className="grid grid-cols-2 gap-2">
                      <StatTile icon={FileText} label="Từ" value={stats.totalWords.toLocaleString()} />
                      <StatTile icon={Type} label="H1 / H2 / H3" value={`${stats.h1}/${stats.h2}/${stats.h3}`} />
                      <StatTile icon={Hash} label="Đoạn văn" value={stats.paragraphs.toString()} />
                      <StatTile icon={Link2} label="Liên kết" value={(linkCount ?? 0).toString()} />
                    </div>
                  )}

                  {/* Recommendations */}
                  {recs.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                        Đề xuất hành động
                      </div>
                      <div className="space-y-1.5">
                        {recs.map((r, i) => (
                          <button
                            key={i}
                            onClick={() => r.tab && setTab(r.tab)}
                            className="w-full text-left flex items-start gap-2 rounded-md border border-dashed p-2.5 hover:bg-muted/40 transition-colors group"
                          >
                            <ListTree className="w-3.5 h-3.5 mt-0.5 text-muted-foreground shrink-0" />
                            <span className="text-xs flex-1 leading-relaxed">{r.text}</span>
                            {r.tab && (
                              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="keywords" className="mt-0 space-y-3">
              {hasKeywords && isLongForm ? (
                <KeywordCoveragePanel
                  contentId={contentId}
                  targetKeywordIds={targetKeywordIds!}
                  clusterId={clusterId}
                  contentText={contentText}
                  title={title}
                />
              ) : (
                <EmptyState
                  icon={<Target className="w-8 h-8 text-muted-foreground/40" />}
                  title="Chưa có từ khóa mục tiêu"
                  hint={isLongForm ? "Gắn từ khóa SEO khi tạo bài để xem audit." : "Audit chỉ áp dụng cho long-form (Website/Blog)."}
                />
              )}
            </TabsContent>

            <TabsContent value="links" className="mt-0">
              {isLongForm ? (
                <InternalLinksPanel contentId={contentId} />
              ) : (
                <EmptyState
                  icon={<Link2 className="w-8 h-8 text-muted-foreground/40" />}
                  title="Internal link chỉ cho long-form"
                  hint="Mở bài Website / Blogger / WordPress để xem gợi ý liên kết nội bộ."
                />
              )}
            </TabsContent>

            <TabsContent value="cluster" className="mt-0">
              {hasCluster ? (
                <ClusterContextCard clusterId={clusterId!} currentContentId={contentId} />
              ) : (
                <EmptyState
                  icon={<Network className="w-8 h-8 text-muted-foreground/40" />}
                  title="Bài viết chưa thuộc Pillar Cluster"
                  hint="Gắn cluster trong wizard tạo bài để xem coverage và sister content."
                />
              )}
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function StatTile({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-md border bg-card p-2.5">
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wide">
        <Icon className="w-3 h-3" />
        {label}
      </div>
      <div className="text-sm font-semibold mt-0.5 tabular-nums">{value}</div>
    </div>
  );
}

function EmptyState({ icon, title, hint }: { icon: React.ReactNode; title: string; hint: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4 gap-3">
      {icon}
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground max-w-[280px]">{hint}</p>
      </div>
    </div>
  );
}

function linkPct(count: number | null): number {
  if (count == null) return 0;
  // 3+ internal links = full score; 0 = 0; linear
  return Math.min(100, Math.round((count / 3) * 100));
}

interface Stats {
  totalWords: number;
  h1: number; h2: number; h3: number;
  paragraphs: number;
  seoScore: number;
  kwCoveragePct: number;
  missingKw: string[];
  overKw: string[];
}

function computeStats(text: string, title: string | undefined, keywords: string[]): Stats {
  const safe = text || "";
  const totalWords = safe.trim().split(/\s+/).filter(Boolean).length;
  const h1 = (safe.match(/^#\s+/gm) || []).length;
  const h2 = (safe.match(/^##\s+/gm) || []).length;
  const h3 = (safe.match(/^###\s+/gm) || []).length;
  const paragraphs = safe.split(/\n\s*\n/).filter(p => p.trim().length > 20).length;
  const seoScore = calculateSEOScore(safe);

  const norm = (s: string) => (s || "").normalize("NFC").toLowerCase();
  const haystack = norm(safe + " " + (title || ""));
  let covered = 0;
  const missing: string[] = [];
  const over: string[] = [];
  keywords.forEach((kw) => {
    const n = norm(kw);
    if (!n) return;
    let i = 0, count = 0;
    while ((i = haystack.indexOf(n, i)) !== -1) { count++; i += n.length; }
    if (count === 0) missing.push(kw);
    else covered++;
    const density = totalWords ? (count / totalWords) * 100 : 0;
    if (density > 3) over.push(kw);
  });
  const kwCoveragePct = keywords.length ? Math.round((covered / keywords.length) * 100) : 0;
  return { totalWords, h1, h2, h3, paragraphs, seoScore, kwCoveragePct, missingKw: missing, overKw: over };
}

function buildRecs(args: {
  isLongForm: boolean;
  hasKeywords: boolean;
  hasCluster: boolean;
  stats: Stats;
  linkCount: number | null;
  clusterCov: { covered: number; total: number; pct: number } | null;
}): Array<{ text: string; tab?: TabKey }> {
  const out: Array<{ text: string; tab?: TabKey }> = [];
  const { isLongForm, hasKeywords, hasCluster, stats, linkCount, clusterCov } = args;

  if (isLongForm && stats.totalWords < 300) {
    out.push({ text: `Bài chỉ ${stats.totalWords} từ — viết thêm để đạt tối thiểu 500 từ cho SEO.` });
  }
  if (isLongForm && stats.h1 === 0) out.push({ text: "Thiếu H1 — thêm 1 tiêu đề chính (# Tiêu đề)." });
  if (isLongForm && stats.h2 < 2) out.push({ text: `Mới có ${stats.h2} H2 — cần ≥2 H2 để chia bố cục rõ ràng.` });

  if (hasKeywords && stats.missingKw.length > 0) {
    out.push({
      text: `${stats.missingKw.length} từ khóa chưa xuất hiện: ${stats.missingKw.slice(0, 3).join(", ")}${stats.missingKw.length > 3 ? "…" : ""}`,
      tab: "keywords",
    });
  }
  if (hasKeywords && stats.overKw.length > 0) {
    out.push({
      text: `Cảnh báo nhồi từ khóa: ${stats.overKw.slice(0, 2).join(", ")} (mật độ >3%).`,
      tab: "keywords",
    });
  }

  if (isLongForm && (linkCount ?? 0) === 0) {
    out.push({ text: "Chưa có liên kết nội bộ — quét gợi ý để cải thiện topic authority.", tab: "links" });
  } else if (isLongForm && (linkCount ?? 0) < 3) {
    out.push({ text: `Mới có ${linkCount} liên kết nội bộ — thêm để đạt ≥3 link.`, tab: "links" });
  }

  if (hasCluster && clusterCov && clusterCov.pct < 50) {
    out.push({
      text: `Cluster mới phủ ${clusterCov.covered}/${clusterCov.total} keyword (${clusterCov.pct}%) — viết thêm sister content.`,
      tab: "cluster",
    });
  }

  return out;
}
