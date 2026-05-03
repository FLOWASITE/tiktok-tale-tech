import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useKeywordEnrichment } from "@/hooks/useKeywordEnrichment";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2, RefreshCw, ChevronDown, ChevronRight, AlertTriangle, CheckCircle2, Clock, HelpCircle, Star, Play, ShoppingBag, MapPin, Newspaper, Users, Sparkles, Copy, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const SERP_ICONS: Record<string, { icon: typeof HelpCircle; label: string }> = {
  paa: { icon: HelpCircle, label: "People Also Ask" },
  snippet: { icon: Star, label: "Featured Snippet" },
  video: { icon: Play, label: "Video" },
  shopping: { icon: ShoppingBag, label: "Shopping" },
  local: { icon: MapPin, label: "Local Pack" },
  news: { icon: Newspaper, label: "News" },
  social: { icon: Users, label: "Social" },
};

const STATUS_META: Record<string, { label: string; icon: typeof Clock; cls: string }> = {
  queued: { label: "Đang chờ", icon: Clock, cls: "text-muted-foreground" },
  running: { label: "Đang chạy", icon: Loader2, cls: "text-blue-600" },
  done: { label: "Hoàn tất", icon: CheckCircle2, cls: "text-emerald-600" },
  failed: { label: "Thất bại", icon: AlertTriangle, cls: "text-destructive" },
};

interface Job {
  id: string;
  status: string;
  total: number;
  done: number;
  errors: { id: string; error: string }[];
  keyword_ids: string[];
  created_at: string;
  completed_at: string | null;
}

export default function EnrichmentJobsTab() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id;
  const { enrich, job: activeJob, starting } = useKeywordEnrichment();
  const [params, setParams] = useSearchParams();
  const focusedJobId = params.get("jobId");
  const [expanded, setExpanded] = useState<string | null>(focusedJobId);
  const [search, setSearch] = useState("");

  // Auto-expand focused job
  useEffect(() => {
    if (focusedJobId) setExpanded(focusedJobId);
  }, [focusedJobId]);

  const { data: jobs = [], isLoading, refetch } = useQuery({
    queryKey: ["keyword-enrichment-jobs", orgId, activeJob?.status],
    enabled: !!orgId,
    refetchInterval: activeJob && activeJob.status !== "done" && activeJob.status !== "failed" ? 3000 : false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("keyword_enrichment_jobs")
        .select("id,status,total,done,errors,keyword_ids,created_at,completed_at")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data || []).map(j => ({
        ...j,
        errors: Array.isArray(j.errors) ? (j.errors as Job["errors"]) : [],
        keyword_ids: Array.isArray(j.keyword_ids) ? (j.keyword_ids as string[]) : [],
      })) as Job[];
    },
  });

  const filteredJobs = useMemo(() => {
    if (!search.trim()) return jobs;
    const q = search.trim().toLowerCase();
    return jobs.filter(j => j.id.toLowerCase().includes(q));
  }, [jobs, search]);

  const clearFocus = () => {
    const next = new URLSearchParams(params);
    next.delete("jobId");
    setParams(next, { replace: true });
  };

  if (!orgId) return <p className="text-muted-foreground">Chọn workspace.</p>;

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-sm font-semibold">Lịch sử Enrich SERP</h3>
            <p className="text-xs text-muted-foreground">
              Xem KD score, SERP features, intent theo từng job. Retry các keyword lỗi.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Lọc theo Job ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-8 w-56 text-xs font-mono"
            />
            <Button size="sm" variant="ghost" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={cn("h-3.5 w-3.5 mr-1", isLoading && "animate-spin")} /> Làm mới
            </Button>
          </div>
        </div>

        {focusedJobId && (
          <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/20 rounded text-xs">
            <span className="text-muted-foreground">Đang xem job:</span>
            <code className="font-mono text-[11px]">{focusedJobId}</code>
            <button onClick={clearFocus} className="ml-auto text-muted-foreground hover:text-foreground">
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm py-6">
            <Loader2 className="h-4 w-4 animate-spin" /> Đang tải...
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-10 border rounded">
            {search ? "Không khớp Job ID nào." : <>Chưa có lần enrich nào. Vào tab <strong>Keywords</strong>, chọn keyword và bấm <strong>Enrich SERP</strong>.</>}
          </div>
        ) : (
          <div className="border rounded divide-y">
            {filteredJobs.map(job => (
              <JobRow
                key={job.id}
                job={job}
                expanded={expanded === job.id}
                onToggle={() => setExpanded(expanded === job.id ? null : job.id)}
                onRetry={ids => enrich(ids)}
                retryDisabled={starting || (!!activeJob && activeJob.status !== "done" && activeJob.status !== "failed")}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function JobRow({
  job,
  expanded,
  onToggle,
  onRetry,
  retryDisabled,
}: {
  job: Job;
  expanded: boolean;
  onToggle: () => void;
  onRetry: (ids: string[]) => void;
  retryDisabled: boolean;
}) {
  const meta = STATUS_META[job.status] || STATUS_META.queued;
  const Icon = meta.icon;
  const errorIds = useMemo(() => job.errors.map(e => e.id), [job.errors]);
  const isActive = job.status === "queued" || job.status === "running";
  const pct = job.total ? Math.round((job.done / job.total) * 100) : 0;

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/40 transition-colors"
      >
        {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
        <Icon className={cn("h-4 w-4 shrink-0", meta.cls, isActive && "animate-spin")} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">{job.done}/{job.total} keyword</span>
            <Badge variant={job.status === "failed" ? "destructive" : job.status === "done" ? "secondary" : "outline"} className="text-[10px] h-5">
              {meta.label}
            </Badge>
            {job.errors.length > 0 && (
              <Badge variant="destructive" className="text-[10px] h-5">
                {job.errors.length} lỗi
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
            <span>{formatDistanceToNow(new Date(job.created_at), { addSuffix: true, locale: vi })}</span>
            <span className="text-muted-foreground/50">·</span>
            <code className="font-mono text-[10px]">{job.id.slice(0, 8)}</code>
            <span
              role="button"
              tabIndex={0}
              onClick={e => {
                e.stopPropagation();
                navigator.clipboard.writeText(job.id);
                toast.success("Đã copy Job ID");
              }}
              className="text-muted-foreground/60 hover:text-foreground cursor-pointer"
              title="Copy Job ID"
            >
              <Copy className="h-2.5 w-2.5" />
            </span>
          </div>
        </div>
        {isActive && (
          <div className="w-32 h-1.5 bg-muted rounded overflow-hidden shrink-0">
            <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
        )}
        {errorIds.length > 0 && !isActive && (
          <Button
            size="sm"
            variant="outline"
            disabled={retryDisabled}
            onClick={e => { e.stopPropagation(); onRetry(errorIds.slice(0, 50)); }}
            className="shrink-0"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Retry {errorIds.length}
          </Button>
        )}
      </button>

      {expanded && <JobDetail job={job} onRetry={onRetry} retryDisabled={retryDisabled} />}
    </div>
  );
}

interface KeywordDetail {
  id: string;
  keyword: string;
  difficulty: number | null;
  intent: string | null;
  serp_features: string[] | null;
  top_competitors: string[] | null;
}

function JobDetail({ job, onRetry, retryDisabled }: { job: Job; onRetry: (ids: string[]) => void; retryDisabled: boolean }) {
  const errorMap = useMemo(() => new Map(job.errors.map(e => [e.id, e.error])), [job.errors]);
  const failedIds = useMemo(() => job.errors.map(e => e.id), [job.errors]);

  // Use exact keyword_ids stored on the job. Fallback (jobs cũ chưa có cột) → fetch theo failedIds.
  const allIds = job.keyword_ids.length > 0 ? job.keyword_ids : failedIds;

  const { data: kws = [], isLoading } = useQuery({
    queryKey: ["enrich-job-kws", job.id, allIds.length],
    enabled: allIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("seo_keywords")
        .select("id,keyword,difficulty,intent,serp_features,top_competitors")
        .in("id", allIds);
      return (data || []) as KeywordDetail[];
    },
  });

  const failedKws = useMemo(() => kws.filter(k => errorMap.has(k.id)), [kws, errorMap]);
  const successKws = useMemo(() => kws.filter(k => !errorMap.has(k.id)), [kws, errorMap]);
  const isLegacy = job.keyword_ids.length === 0 && job.done > 0;

  return (
    <div className="bg-muted/20 px-3 py-3 space-y-3 border-t">
      {isLegacy && (
        <p className="text-[11px] text-muted-foreground italic">
          Job cũ — chỉ liệt kê keyword lỗi (danh sách thành công không lưu).
        </p>
      )}

      {isLoading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Đang tải chi tiết...
        </div>
      )}

      {failedKws.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-destructive flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Keyword lỗi ({failedKws.length})
            </h4>
            <Button
              size="sm"
              variant="outline"
              disabled={retryDisabled}
              onClick={() => onRetry(failedIds.slice(0, 50))}
            >
              <RefreshCw className="h-3 w-3 mr-1" /> Retry tất cả
            </Button>
          </div>
          <div className="space-y-1">
            {failedKws.map(k => (
              <KeywordResultRow
                key={k.id}
                kw={k}
                error={errorMap.get(k.id)}
                onRetry={() => onRetry([k.id])}
                retryDisabled={retryDisabled}
              />
            ))}
          </div>
        </div>
      )}

      {successKws.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-emerald-600 flex items-center gap-1 mb-2">
            <Sparkles className="h-3 w-3" /> Keyword đã enrich ({successKws.length})
          </h4>
          <div className="space-y-1">
            {successKws.slice(0, 50).map(k => (
              <KeywordResultRow key={k.id} kw={k} />
            ))}
          </div>
          {successKws.length > 50 && (
            <p className="text-[11px] text-muted-foreground mt-2">+ {successKws.length - 50} keyword nữa — xem trong tab Keywords.</p>
          )}
        </div>
      )}

      {failedKws.length === 0 && successKws.length === 0 && (
        <p className="text-xs text-muted-foreground">Không có keyword nào liên quan để hiển thị.</p>
      )}
    </div>
  );
}

function KeywordResultRow({
  kw,
  error,
  onRetry,
  retryDisabled,
}: {
  kw: KeywordDetail;
  error?: string;
  onRetry?: () => void;
  retryDisabled?: boolean;
}) {
  const feats = Array.isArray(kw.serp_features) ? kw.serp_features : [];
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-background border text-xs">
      <span className="font-medium truncate flex-1 min-w-0" title={kw.keyword}>{kw.keyword}</span>
      <span className="tabular-nums w-12 text-right text-muted-foreground">
        KD {kw.difficulty ?? "—"}
      </span>
      <Badge variant="outline" className="text-[10px] h-5">{kw.intent || "—"}</Badge>
      <div className="flex items-center gap-0.5 w-24">
        {feats.length === 0 ? (
          <span className="text-muted-foreground/60">—</span>
        ) : (
          <TooltipProvider delayDuration={150}>
            {feats.slice(0, 4).map(f => {
              const def = SERP_ICONS[f];
              if (!def) return null;
              const Icon = def.icon;
              return (
                <Tooltip key={f}>
                  <TooltipTrigger asChild>
                    <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-muted text-muted-foreground">
                      <Icon className="h-2.5 w-2.5" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{def.label}</TooltipContent>
                </Tooltip>
              );
            })}
          </TooltipProvider>
        )}
      </div>
      {error && (
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-xs">{error}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      {onRetry && (
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-2"
          disabled={retryDisabled}
          onClick={onRetry}
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
