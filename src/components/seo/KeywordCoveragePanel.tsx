import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Target, RefreshCw, CheckCircle2, AlertTriangle, XCircle, Flame } from "lucide-react";
import { useKeywordsByIds } from "@/hooks/useKeywordsByIds";
import { cn } from "@/lib/utils";

interface Props {
  contentId: string;
  targetKeywordIds: string[];
  clusterId?: string | null;
  contentText: string;
  title?: string;
}

type Status = "missing" | "low" | "good" | "over";

interface Row {
  keyword: string;
  count: number;
  density: number;
  inTitle: boolean;
  inH1: boolean;
  inH2: boolean;
  inH3: boolean;
  inFirstParagraph: boolean;
  status: Status;
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const norm = (s: string) => (s || "").normalize("NFC").toLowerCase();

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  const h = norm(haystack);
  const n = norm(needle);
  // Try word-boundary first (works well for non-diacritic)
  try {
    const re = new RegExp(`\\b${escapeRegex(n)}\\b`, "giu");
    const m = h.match(re);
    if (m && m.length > 0) return m.length;
  } catch {}
  // Fallback: substring count (handles Vietnamese phrases)
  let i = 0, count = 0;
  while ((i = h.indexOf(n, i)) !== -1) { count++; i += n.length; }
  return count;
}

function computeRows(text: string, title: string | undefined, keywords: string[]): { rows: Row[]; totalWords: number } {
  const safe = text || "";
  const lines = safe.split("\n");
  const h1s = lines.filter(l => /^#\s+/.test(l)).join(" \n ");
  const h2s = lines.filter(l => /^##\s+/.test(l)).join(" \n ");
  const h3s = lines.filter(l => /^###\s+/.test(l)).join(" \n ");
  const firstPara = lines.find(l => l.trim() && !l.startsWith("#")) || "";
  const totalWords = safe.trim().split(/\s+/).filter(Boolean).length || 1;

  const rows: Row[] = keywords.map((kw) => {
    const count = countOccurrences(safe, kw);
    const density = (count / totalWords) * 100;
    const inTitle = !!title && countOccurrences(title, kw) > 0;
    const inH1 = countOccurrences(h1s, kw) > 0;
    const inH2 = countOccurrences(h2s, kw) > 0;
    const inH3 = countOccurrences(h3s, kw) > 0;
    const inFirstParagraph = countOccurrences(firstPara, kw) > 0;

    let status: Status;
    if (count === 0) status = "missing";
    else if (density > 3) status = "over";
    else if (count >= 3 && density >= 0.3 && (inH1 || inH2 || inTitle)) status = "good";
    else status = "low";

    return { keyword: kw, count, density, inTitle, inH1, inH2, inH3, inFirstParagraph, status };
  });

  return { rows, totalWords };
}

const statusMeta: Record<Status, { label: string; icon: any; cls: string }> = {
  missing: { label: "Thiếu", icon: XCircle, cls: "text-destructive border-destructive/40 bg-destructive/5" },
  low:     { label: "Thấp", icon: AlertTriangle, cls: "text-amber-600 border-amber-500/40 bg-amber-500/5 dark:text-amber-400" },
  good:    { label: "Tốt",  icon: CheckCircle2, cls: "text-emerald-600 border-emerald-500/40 bg-emerald-500/5 dark:text-emerald-400" },
  over:    { label: "Nhồi", icon: Flame,        cls: "text-orange-600 border-orange-500/40 bg-orange-500/5 dark:text-orange-400" },
};

export default function KeywordCoveragePanel({ contentId, targetKeywordIds, contentText, title }: Props) {
  const { data: keywords = [], isLoading } = useKeywordsByIds(targetKeywordIds);
  const [tick, setTick] = useState(0);

  const { rows, totalWords } = useMemo(
    () => computeRows(contentText, title, keywords),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [contentText, title, keywords.join("|"), tick]
  );

  const okCount = rows.filter(r => r.status === "good").length;
  const coveredCount = rows.filter(r => r.status !== "missing").length;
  const coveragePct = rows.length ? Math.round((coveredCount / rows.length) * 100) : 0;

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            Bao phủ từ khóa
            {rows.length > 0 && (
              <Badge variant="secondary" className="text-[10px]">
                {okCount}/{rows.length} tốt
              </Badge>
            )}
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setTick(t => t + 1)}
            className="h-7 gap-1.5"
            title="Quét lại"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && (
          <p className="text-xs text-muted-foreground">Đang tải từ khóa...</p>
        )}

        {!isLoading && rows.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Bài viết này chưa gắn từ khóa SEO. Quay lại form và chọn keyword để bật audit.
          </p>
        )}

        {rows.length > 0 && (
          <>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Coverage</span>
                <span className="font-medium">{coveragePct}% ({totalWords} từ)</span>
              </div>
              <Progress value={coveragePct} className="h-1.5" />
            </div>

            <div className="space-y-1.5">
              {rows.map((r) => {
                const m = statusMeta[r.status];
                const Icon = m.icon;
                const positions: string[] = [];
                if (r.inTitle) positions.push("Title");
                if (r.inH1) positions.push("H1");
                if (r.inH2) positions.push("H2");
                if (r.inH3) positions.push("H3");
                if (r.inFirstParagraph) positions.push("Intro");
                return (
                  <div
                    key={r.keyword}
                    className={cn("border rounded-md p-2 text-xs space-y-1", m.cls)}
                  >
                    <div className="flex items-start gap-2">
                      <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-foreground truncate" title={r.keyword}>
                          {r.keyword}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground mt-0.5">
                          <span>×{r.count}</span>
                          <span>· {r.density.toFixed(2)}%</span>
                          <span>· {m.label}</span>
                        </div>
                        {positions.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {positions.map(p => (
                              <Badge key={p} variant="outline" className="text-[9px] py-0 h-4 px-1">
                                {p}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-[10px] text-muted-foreground italic">
              Mục tiêu: keyword chính xuất hiện trong Title/H1/H2 và mật độ 0.5–2.5%.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
