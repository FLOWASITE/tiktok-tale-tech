import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink, Sparkles, FileText, RefreshCw, Loader2, Trophy } from "lucide-react";
import { useLatestSerpSnapshot, useEnrichSerp } from "@/hooks/useSerpSnapshot";
import { useNavigate } from "react-router-dom";

interface Props {
  keywordId: string | null;
  keyword: string | null;
  clusterId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SerpInsightsSheet({ keywordId, keyword, clusterId, open, onOpenChange }: Props) {
  const { data: snap, isLoading } = useLatestSerpSnapshot(keywordId);
  const enrich = useEnrichSerp();
  const navigate = useNavigate();

  const targetWordCount = snap?.median_word_count ? Math.max(800, snap.median_word_count) : null;

  const goCreate = () => {
    if (!keywordId) return;
    const params = new URLSearchParams();
    params.set("seoKeywordId", keywordId);
    if (clusterId) params.set("clusterId", clusterId);
    if (targetWordCount) params.set("minWords", String(targetWordCount));
    navigate(`/multichannel?${params.toString()}`);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="truncate">SERP Insights · {keyword}</SheetTitle>
          <SheetDescription>
            Phân tích top 10 Google + đối thủ trực tiếp để định hướng nội dung.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => keywordId && enrich.mutate(keywordId)}
              disabled={!keywordId || enrich.isPending}
              className="gap-1.5"
            >
              {enrich.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              {snap ? "Quét lại" : "Quét SERP"}
            </Button>
            {snap?.snapshot_at && (
              <span className="text-xs text-muted-foreground">
                Cập nhật: {new Date(snap.snapshot_at).toLocaleString("vi-VN")}
              </span>
            )}
          </div>

          {isLoading && <Skeleton className="h-24 w-full" />}

          {!isLoading && !snap && (
            <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
              Chưa có snapshot. Bấm <b>Quét SERP</b> để phân tích đối thủ.
            </CardContent></Card>
          )}

          {snap && (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-3 gap-2">
                <KpiTile label="Đối thủ trong top 10" value={snap.top_results.filter(r => !r.our_site).length} icon={<Trophy className="h-3.5 w-3.5" />} />
                <KpiTile label="Độ dài bài median" value={snap.median_word_count ?? "—"} suffix="từ" icon={<FileText className="h-3.5 w-3.5" />} />
                <KpiTile label="Bạn đang ở rank" value={snap.top_results.find(r => r.our_site)?.rank ?? "—"} icon={<Sparkles className="h-3.5 w-3.5" />} />
              </div>

              {/* Action recommendation */}
              {targetWordCount && (
                <Card className="border-primary/30 bg-primary/[0.03]">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">Khuyến nghị</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Top 10 có độ dài median <b>{snap.median_word_count} từ</b>. Để cạnh tranh, viết bài tối thiểu <b>{targetWordCount}+ từ</b>, cover ít nhất {snap.common_h2s?.length ?? 5} chủ đề con.
                    </p>
                    <Button size="sm" onClick={goCreate} className="gap-1.5 mt-1">
                      <FileText className="h-3.5 w-3.5" /> Tạo bài viết SEO với keyword này
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Top 10 SERP */}
              <div>
                <h3 className="text-sm font-semibold mb-2">Top 10 Google</h3>
                <ol className="space-y-1.5">
                  {snap.top_results.map((r) => (
                    <li key={r.rank} className="flex items-start gap-2 text-sm border rounded-md p-2 hover:bg-muted/40">
                      <Badge variant={r.our_site ? "default" : "outline"} className="shrink-0 w-7 justify-center">{r.rank}</Badge>
                      <div className="min-w-0 flex-1">
                        <a href={r.url} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline truncate block" title={r.title ?? r.url}>
                          {r.title ?? r.url}
                        </a>
                        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <span>{r.host}</span>
                          {r.our_site && <Badge variant="secondary" className="text-[10px] h-4">Bài của bạn</Badge>}
                        </div>
                        {r.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.description}</p>}
                      </div>
                      <a href={r.url} target="_blank" rel="noopener noreferrer">
                        <Button size="icon" variant="ghost" className="h-7 w-7"><ExternalLink className="h-3.5 w-3.5" /></Button>
                      </a>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Common H2s */}
              {snap.common_h2s && snap.common_h2s.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Chủ đề con phổ biến (H2)</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {snap.common_h2s.map((h) => (
                      <Badge key={h} variant="outline" className="text-xs capitalize">{h}</Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Outline gợi ý bao phủ những H2 này để cạnh tranh.</p>
                </div>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function KpiTile({ label, value, suffix, icon }: { label: string; value: string | number; suffix?: string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="text-[10px] text-muted-foreground flex items-center gap-1 mb-0.5">{icon}{label}</div>
        <div className="text-lg font-semibold tabular-nums">{value}{suffix && <span className="text-xs font-normal text-muted-foreground ml-1">{suffix}</span>}</div>
      </CardContent>
    </Card>
  );
}
