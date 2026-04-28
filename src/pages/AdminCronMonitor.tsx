import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Play, RefreshCw, Clock, CheckCircle2, AlertTriangle, XCircle, Trash2, FileWarning,
  Calendar, TrendingUp, Download, Search, Copy, ChevronDown, ChevronUp, Timer,
  Activity, CalendarClock,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  formatDistanceToNow, format, startOfDay, startOfWeek, startOfHour,
  eachDayOfInterval, eachWeekOfInterval, eachHourOfInterval, subDays, subHours,
  differenceInHours, addDays,
} from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip as RTooltip, Legend,
} from 'recharts';
import { Sparkline } from '@/components/dashboard';

type CronLog = {
  id: string;
  job_name: string;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  status: 'success' | 'partial' | 'failed' | 'running';
  triggered_by: 'cron' | 'manual';
  summary: Record<string, any>;
  errors: any[];
};

const DEFAULT_JOB = 'cleanup-old-media';
// Schedule per known job (UTC cron). Add entries as new jobs onboard.
const JOB_SCHEDULES: Record<string, { cron: string; description: string }> = {
  'cleanup-old-media': { cron: '0 3 * * *', description: '03:00 UTC mỗi ngày (10:00 VN)' },
};

function statusBadge(status: CronLog['status']) {
  const map: Record<CronLog['status'], { variant: any; icon: any; label: string; className: string }> = {
    success: { variant: 'default', icon: CheckCircle2, label: 'Thành công', className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' },
    partial: { variant: 'default', icon: AlertTriangle, label: 'Một phần', className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20' },
    failed: { variant: 'destructive', icon: XCircle, label: 'Lỗi', className: '' },
    running: { variant: 'secondary', icon: RefreshCw, label: 'Đang chạy', className: '' },
  };
  const cfg = map[status];
  const Icon = cfg.icon;
  return (
    <Badge variant={cfg.variant} className={cfg.className}>
      <Icon className="w-3 h-3 mr-1" />
      {cfg.label}
    </Badge>
  );
}

function formatDuration(ms: number | null) {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

type Granularity = 'hour' | 'day' | 'week';

function bucketKey(d: Date, g: Granularity) {
  if (g === 'hour') return startOfHour(d).toISOString();
  if (g === 'week') return startOfWeek(d, { weekStartsOn: 1 }).toISOString();
  return startOfDay(d).toISOString();
}
function bucketLabel(iso: string, g: Granularity) {
  const d = new Date(iso);
  if (g === 'hour') return format(d, 'HH:mm');
  if (g === 'week') return `T${format(d, 'w')} · ${format(d, 'dd/MM')}`;
  return format(d, 'dd/MM');
}
function buildBuckets(rangeFilter: string, g: Granularity): string[] {
  const now = new Date();
  if (g === 'hour') {
    const start = subHours(now, 23);
    return eachHourOfInterval({ start: startOfHour(start), end: startOfHour(now) }).map((d) => d.toISOString());
  }
  const days = rangeFilter === '7d' ? 7 : 30;
  const start = subDays(now, days - 1);
  if (g === 'week') {
    return eachWeekOfInterval(
      { start: startOfWeek(start, { weekStartsOn: 1 }), end: startOfWeek(now, { weekStartsOn: 1 }) },
      { weekStartsOn: 1 },
    ).map((d) => d.toISOString());
  }
  return eachDayOfInterval({ start: startOfDay(start), end: startOfDay(now) }).map((d) => d.toISOString());
}

type AggRow = {
  bucket: string; label: string;
  dbRecords: number; storageLinked: number; orphan: number; total: number;
  avgDurationSec: number; maxDurationSec: number; runCount: number;
};

function aggregateByPeriod(logs: CronLog[], g: Granularity, rangeFilter: string): AggRow[] {
  const buckets = buildBuckets(rangeFilter, g);
  const map = new Map<string, AggRow>();
  buckets.forEach((b) => {
    map.set(b, { bucket: b, label: bucketLabel(b, g), dbRecords: 0, storageLinked: 0, orphan: 0, total: 0, avgDurationSec: 0, maxDurationSec: 0, runCount: 0 });
  });
  const sumDur = new Map<string, number>();
  logs.forEach((log) => {
    const key = bucketKey(new Date(log.started_at), g);
    const row = map.get(key);
    if (!row) return;
    const s = log.summary || {};
    const db = (s.channel_images_deleted ?? 0) + (s.carousel_images_deleted ?? 0) + (s.videos_deleted ?? 0);
    const storage = s.storage_files_removed ?? 0;
    const orphan = s.orphan_storage_files_removed ?? 0;
    row.dbRecords += db; row.storageLinked += storage; row.orphan += orphan;
    row.total += db + storage + orphan;
    const durSec = (log.duration_ms ?? 0) / 1000;
    sumDur.set(key, (sumDur.get(key) ?? 0) + durSec);
    if (durSec > row.maxDurationSec) row.maxDurationSec = durSec;
    row.runCount += 1;
  });
  for (const row of map.values()) {
    if (row.runCount > 0) {
      row.avgDurationSec = +(sumDur.get(row.bucket)! / row.runCount).toFixed(2);
      row.maxDurationSec = +row.maxDurationSec.toFixed(2);
    }
  }
  return Array.from(map.values());
}

// ---------- Next-run estimation (supports daily cron only "0 H * * *") ----------
function computeNextRun(cronExpr: string): Date | null {
  const m = cronExpr.match(/^(\d+)\s+(\d+)\s+\*\s+\*\s+\*$/);
  if (!m) return null;
  const minute = parseInt(m[1], 10);
  const hour = parseInt(m[2], 10);
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour, minute, 0));
  if (next.getTime() <= now.getTime()) next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

// ---------- Health checks ----------
type HealthIssue = { id: string; severity: 'warn' | 'error'; title: string; detail: string };
function detectHealthIssues(logs: CronLog[], jobName: string): HealthIssue[] {
  const issues: HealthIssue[] = [];
  if (!logs.length) return issues;
  const last = logs[0];
  const hoursSinceLast = differenceInHours(new Date(), new Date(last.started_at));
  const sched = JOB_SCHEDULES[jobName];
  // Stale: > 26h for daily cron
  if (sched && /^0 \d+ \* \* \*$/.test(sched.cron) && hoursSinceLast > 26) {
    issues.push({
      id: 'stale',
      severity: 'error',
      title: 'Cron có thể bị treo',
      detail: `Lần chạy gần nhất cách đây ${hoursSinceLast} giờ — vượt ngưỡng 26h cho cron hằng ngày.`,
    });
  }
  // Consecutive failures
  let consecFail = 0;
  for (const l of logs) {
    if (l.status === 'failed') consecFail++; else break;
  }
  if (consecFail >= 2) {
    issues.push({
      id: 'consec-fail',
      severity: 'error',
      title: `${consecFail} lần chạy lỗi liên tiếp`,
      detail: 'Kiểm tra log chi tiết bên dưới và edge function logs.',
    });
  }
  // Duration spike (last 7 days)
  const recent = logs.filter((l) => differenceInHours(new Date(), new Date(l.started_at)) <= 7 * 24 && l.duration_ms);
  if (recent.length >= 3) {
    const avg = recent.reduce((s, l) => s + (l.duration_ms ?? 0), 0) / recent.length;
    const max = Math.max(...recent.map((l) => l.duration_ms ?? 0));
    if (max > avg * 3 && max > 30_000) {
      issues.push({
        id: 'duration-spike',
        severity: 'warn',
        title: 'Phát hiện duration spike',
        detail: `Một lần chạy gần đây mất ${formatDuration(max)} (gấp ${(max / avg).toFixed(1)}× trung bình ${formatDuration(Math.round(avg))}).`,
      });
    }
  }
  return issues;
}

// ---------- Tooltips ----------
function DeletionTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const r = payload[0].payload as AggRow;
  return (
    <div className="bg-popover border rounded-md p-2.5 shadow-md text-xs space-y-1">
      <div className="font-medium">{label}</div>
      <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-sm bg-primary" /> DB records: <span className="font-mono">{r.dbRecords.toLocaleString()}</span></div>
      <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-sm bg-muted-foreground/60" /> Storage (linked): <span className="font-mono">{r.storageLinked.toLocaleString()}</span></div>
      <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-sm bg-accent-foreground/40" /> Mồ côi: <span className="font-mono">{r.orphan.toLocaleString()}</span></div>
      <div className="border-t pt-1 mt-1 font-medium">Tổng: <span className="font-mono">{r.total.toLocaleString()}</span></div>
      <div className="text-muted-foreground">{r.runCount} lần chạy</div>
    </div>
  );
}
function DurationTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const r = payload[0].payload as AggRow;
  return (
    <div className="bg-popover border rounded-md p-2.5 shadow-md text-xs space-y-1">
      <div className="font-medium">{label}</div>
      <div>Trung bình: <span className="font-mono">{r.avgDurationSec.toFixed(1)}s</span></div>
      <div>Tối đa: <span className="font-mono">{r.maxDurationSec.toFixed(1)}s</span></div>
      <div className="text-muted-foreground">{r.runCount} lần chạy</div>
    </div>
  );
}

function TrendCharts({ logs, rangeFilter }: { logs: CronLog[]; rangeFilter: string }) {
  const defaultGranularity: Granularity = rangeFilter === '24h' ? 'hour' : 'day';
  const [granularity, setGranularity] = useState<Granularity>(defaultGranularity);
  const allowedGranularities: Granularity[] =
    rangeFilter === '24h' ? ['hour'] : rangeFilter === '7d' ? ['day'] : ['day', 'week'];
  const effective: Granularity = allowedGranularities.includes(granularity) ? granularity : allowedGranularities[0];
  const data = aggregateByPeriod(logs, effective, rangeFilter);
  const hasAny = data.some((d) => d.runCount > 0);
  const axisTick = { fontSize: 11, fill: 'hsl(var(--muted-foreground))' };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-base">Xu hướng theo thời gian</CardTitle>
          </div>
          {allowedGranularities.length > 1 && (
            <Tabs value={effective} onValueChange={(v) => setGranularity(v as Granularity)}>
              <TabsList className="h-8">
                <TabsTrigger value="day" className="text-xs px-3">Theo ngày</TabsTrigger>
                <TabsTrigger value="week" className="text-xs px-3">Theo tuần</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </div>
        <CardDescription className="text-xs">
          Biểu đồ vẽ tất cả lần chạy (không áp dụng bộ lọc status) trong khoảng đã chọn.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasAny ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Chưa đủ dữ liệu để vẽ biểu đồ trong khoảng đã chọn.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <div className="text-sm font-medium mb-2">Bản ghi đã xóa</div>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="label" tick={axisTick} axisLine={{ stroke: 'hsl(var(--border))' }} tickLine={false} />
                    <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} />
                    <RTooltip content={<DeletionTooltip />} cursor={{ fill: 'hsl(var(--muted) / 0.4)' }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} iconType="square" />
                    <Bar dataKey="dbRecords" name="DB records" stackId="a" fill="hsl(var(--primary))" />
                    <Bar dataKey="storageLinked" name="Storage (linked)" stackId="a" fill="hsl(var(--muted-foreground) / 0.6)" />
                    <Bar dataKey="orphan" name="Mồ côi" stackId="a" fill="hsl(var(--accent-foreground) / 0.4)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div>
              <div className="text-sm font-medium mb-2">Thời gian chạy (giây)</div>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="label" tick={axisTick} axisLine={{ stroke: 'hsl(var(--border))' }} tickLine={false} />
                    <YAxis tick={axisTick} axisLine={false} tickLine={false} unit="s" />
                    <RTooltip content={<DurationTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} iconType="line" />
                    <Line type="monotone" dataKey="avgDurationSec" name="Trung bình" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey="maxDurationSec" name="Tối đa" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} strokeDasharray="4 3" dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------- CSV export ----------
function exportLogsCsv(logs: CronLog[], jobName: string) {
  const headers = ['started_at', 'completed_at', 'status', 'triggered_by', 'duration_ms',
    'channel_images_deleted', 'carousel_images_deleted', 'videos_deleted',
    'storage_files_removed', 'orphan_storage_files_removed', 'error_count'];
  const escape = (v: any) => {
    if (v == null) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = logs.map((l) => [
    l.started_at, l.completed_at ?? '', l.status, l.triggered_by, l.duration_ms ?? '',
    l.summary?.channel_images_deleted ?? 0, l.summary?.carousel_images_deleted ?? 0, l.summary?.videos_deleted ?? 0,
    l.summary?.storage_files_removed ?? 0, l.summary?.orphan_storage_files_removed ?? 0,
    l.errors?.length ?? 0,
  ].map(escape).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cron-logs-${jobName}-${format(new Date(), 'yyyyMMdd-HHmm')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------- Detail dialog content ----------
function ErrorBlock({ err }: { err: any }) {
  const obj = typeof err === 'string' ? { message: err } : (err ?? {});
  const text = typeof err === 'string' ? err : JSON.stringify(err, null, 2);
  return (
    <div className="bg-destructive/5 border border-destructive/20 rounded p-2.5 text-xs space-y-1">
      <div className="flex items-start justify-between gap-2">
        <div className="font-mono text-destructive break-all flex-1">
          {obj.message ?? obj.error ?? text.slice(0, 200)}
        </div>
        <Button
          variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0"
          onClick={() => { navigator.clipboard.writeText(text); toast.success('Đã copy lỗi'); }}
        >
          <Copy className="w-3 h-3" />
        </Button>
      </div>
      {obj.code && <div className="text-muted-foreground"><span className="font-medium">Code:</span> {obj.code}</div>}
      {obj.context?.path && <div className="text-muted-foreground"><span className="font-medium">Path:</span> <code className="text-[11px]">{obj.context.path}</code></div>}
      {obj.stack && (
        <details className="text-muted-foreground">
          <summary className="cursor-pointer">Stack</summary>
          <pre className="text-[11px] mt-1 whitespace-pre-wrap">{obj.stack}</pre>
        </details>
      )}
    </div>
  );
}

function LogDetail({ log }: { log: CronLog }) {
  const [showRaw, setShowRaw] = useState(false);
  const s = log.summary ?? {};
  const dbTotal = (s.channel_images_deleted ?? 0) + (s.carousel_images_deleted ?? 0) + (s.videos_deleted ?? 0);
  const tile = (label: string, value: number | string, sub?: string) => (
    <div className="border rounded-lg p-3 bg-muted/30">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold mt-0.5">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        {statusBadge(log.status)}
        <Badge variant="outline" className="text-xs">{log.triggered_by}</Badge>
        <span className="text-sm text-muted-foreground">Thời lượng: {formatDuration(log.duration_ms)}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {tile('DB records', dbTotal, `${s.channel_images_deleted ?? 0} ch · ${s.carousel_images_deleted ?? 0} car · ${s.videos_deleted ?? 0} vid`)}
        {tile('Storage (linked)', s.storage_files_removed ?? 0, 'file kèm DB row')}
        {tile('Mồ côi', s.orphan_storage_files_removed ?? 0, 'file storage không tham chiếu')}
        {tile('Lỗi', log.errors?.length ?? 0)}
      </div>

      {log.errors?.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2 text-destructive">Lỗi ({log.errors.length})</h4>
          <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
            {log.errors.map((err, i) => <ErrorBlock key={i} err={err} />)}
          </div>
        </div>
      )}

      <div>
        <button
          className="text-xs text-muted-foreground inline-flex items-center gap-1 hover:text-foreground"
          onClick={() => setShowRaw((v) => !v)}
        >
          {showRaw ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {showRaw ? 'Ẩn JSON gốc' : 'Xem JSON gốc'}
        </button>
        {showRaw && (
          <pre className="bg-muted p-3 rounded-md text-[11px] overflow-x-auto mt-2 max-h-[300px]">
            {JSON.stringify({ summary: log.summary, errors: log.errors }, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

// ---------- Main page ----------
export default function AdminCronMonitor() {
  const queryClient = useQueryClient();
  const [jobName, setJobName] = useState<string>(DEFAULT_JOB);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [rangeFilter, setRangeFilter] = useState<string>('30d');
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(50);
  const [selectedLog, setSelectedLog] = useState<CronLog | null>(null);
  const [running, setRunning] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastFetchedAt, setLastFetchedAt] = useState<Date>(new Date());
  const [, forceTick] = useState(0); // used to re-render countdown / "x giây trước"

  // Tick every 10s for countdown / "last updated"
  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 10_000);
    return () => clearInterval(id);
  }, []);

  // Discover available jobs
  const { data: jobsList } = useQuery({
    queryKey: ['cron-jobs-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cron_run_logs')
        .select('job_name')
        .order('started_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      const set = new Set<string>([DEFAULT_JOB, ...((data ?? []).map((r: any) => r.job_name))]);
      return Array.from(set).sort();
    },
  });

  const { data: logs, isLoading } = useQuery({
    queryKey: ['cron-logs', jobName, statusFilter, rangeFilter, pageSize],
    queryFn: async () => {
      const days = rangeFilter === '24h' ? 1 : rangeFilter === '7d' ? 7 : 30;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      let q = supabase
        .from('cron_run_logs')
        .select('*')
        .eq('job_name', jobName)
        .gte('started_at', since)
        .order('started_at', { ascending: false })
        .limit(pageSize);
      if (statusFilter !== 'all') q = q.eq('status', statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      setLastFetchedAt(new Date());
      return (data ?? []) as CronLog[];
    },
    refetchInterval: autoRefresh ? 30_000 : false,
  });

  // Filtered (search) view
  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    if (!search.trim()) return logs;
    const q = search.toLowerCase();
    return logs.filter((l) => {
      if (l.status.includes(q)) return true;
      if (l.triggered_by.includes(q)) return true;
      if (JSON.stringify(l.errors ?? []).toLowerCase().includes(q)) return true;
      if (JSON.stringify(l.summary ?? {}).toLowerCase().includes(q)) return true;
      return false;
    });
  }, [logs, search]);

  // Stats over fetched logs (not search-filtered, so cards reflect range)
  const stats = useMemo(() => {
    const arr = logs ?? [];
    const totalDeleted = arr.reduce((sum, l) => {
      const s = l.summary || {};
      return sum + (s.channel_images_deleted ?? 0) + (s.carousel_images_deleted ?? 0) + (s.videos_deleted ?? 0);
    }, 0);
    const totalDur = arr.reduce((sum, l) => sum + (l.duration_ms ?? 0), 0);
    const withDur = arr.filter((l) => l.duration_ms != null).length;
    return {
      lastRun: arr[0],
      totalRuns: arr.length,
      successCount: arr.filter((l) => l.status === 'success').length,
      failedCount: arr.filter((l) => l.status === 'failed').length,
      totalDeleted,
      totalStorageRemoved: arr.reduce((sum, l) => sum + (l.summary?.storage_files_removed ?? 0), 0),
      totalOrphanRemoved: arr.reduce((sum, l) => sum + (l.summary?.orphan_storage_files_removed ?? 0), 0),
      avgDurationMs: withDur ? Math.round(totalDur / withDur) : 0,
    };
  }, [logs]);

  // Sparkline (last 7 days, daily totals deleted incl. orphan)
  const sparkData = useMemo(() => {
    const arr = logs ?? [];
    const buckets = buildBuckets('7d', 'day');
    const map = new Map<string, number>(buckets.map((b) => [b, 0]));
    arr.forEach((l) => {
      const k = bucketKey(new Date(l.started_at), 'day');
      if (!map.has(k)) return;
      const s = l.summary || {};
      map.set(k, (map.get(k) ?? 0) +
        (s.channel_images_deleted ?? 0) + (s.carousel_images_deleted ?? 0) +
        (s.videos_deleted ?? 0) + (s.storage_files_removed ?? 0) + (s.orphan_storage_files_removed ?? 0));
    });
    return Array.from(map.values());
  }, [logs]);

  const successRate = stats.totalRuns > 0 ? Math.round((stats.successCount / stats.totalRuns) * 100) : 0;
  const sched = JOB_SCHEDULES[jobName];
  const nextRun = sched ? computeNextRun(sched.cron) : null;
  const healthIssues = useMemo(() => detectHealthIssues(logs ?? [], jobName), [logs, jobName]);

  const handleRunNow = async () => {
    setRunning(true);
    toast.info(`Đang chạy ${jobName}...`);
    try {
      const { data, error } = await supabase.functions.invoke(jobName, { body: { triggered_by: 'manual' } });
      if (error) throw error;
      const s = data?.summary ?? {};
      const dbDeleted = (s.channel_images_deleted ?? 0) + (s.carousel_images_deleted ?? 0) + (s.videos_deleted ?? 0);
      const storageDeleted = (s.storage_files_removed ?? 0) + (s.orphan_storage_files_removed ?? 0);
      toast.success(`Hoàn thành. Đã xóa ${dbDeleted} bản ghi DB và ${storageDeleted} file storage.`);
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ['cron-logs'] }), 1500);
    } catch (e: any) {
      toast.error(`Lỗi: ${e.message ?? 'Unknown'}`);
    } finally {
      setRunning(false);
    }
  };

  const showJobSelector = (jobsList?.length ?? 0) > 1;

  return (
    <div className="container max-w-7xl py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Cron Monitor</h1>
          <div className="flex items-center gap-2 flex-wrap text-sm text-muted-foreground">
            <span>Job:</span>
            {showJobSelector ? (
              <Select value={jobName} onValueChange={setJobName}>
                <SelectTrigger className="w-[220px] h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {jobsList!.map((j) => (
                    <SelectItem key={j} value={j} className="font-mono text-xs">{j}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{jobName}</code>
            )}
            {sched && <span className="text-xs">· Lịch: {sched.description}</span>}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Activity className={`w-3 h-3 ${autoRefresh ? 'text-emerald-500' : ''}`} />
            <span>Cập nhật {formatDistanceToNow(lastFetchedAt, { addSuffix: true, locale: vi })}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Switch id="auto-refresh" checked={autoRefresh} onCheckedChange={setAutoRefresh} />
            <Label htmlFor="auto-refresh" className="text-xs cursor-pointer">Tự làm mới</Label>
          </div>
          <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['cron-logs'] })}>
            <RefreshCw className="w-4 h-4 mr-2" /> Làm mới
          </Button>
          <Button onClick={handleRunNow} disabled={running} size="sm">
            <Play className={`w-4 h-4 mr-2 ${running ? 'animate-pulse' : ''}`} />
            {running ? 'Đang chạy...' : 'Chạy ngay'}
          </Button>
        </div>
      </div>

      {/* Health banner */}
      {healthIssues.length > 0 && (
        <div className="space-y-2">
          {healthIssues.map((issue) => (
            <div
              key={issue.id}
              className={`border rounded-lg px-4 py-3 flex items-start gap-3 ${
                issue.severity === 'error'
                  ? 'border-destructive/30 bg-destructive/5'
                  : 'border-amber-500/30 bg-amber-500/5'
              }`}
            >
              <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${issue.severity === 'error' ? 'text-destructive' : 'text-amber-600 dark:text-amber-400'}`} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{issue.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{issue.detail}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />Lần chạy gần nhất</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.lastRun ? (
              <>
                <div className="text-2xl font-semibold">{formatDistanceToNow(new Date(stats.lastRun.started_at), { addSuffix: true, locale: vi })}</div>
                <div className="text-xs text-muted-foreground mt-1">{format(new Date(stats.lastRun.started_at), 'dd/MM/yyyy HH:mm:ss')}</div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">Chưa có lần chạy nào</div>
            )}
            {nextRun && (
              <div className="text-xs text-muted-foreground mt-2 pt-2 border-t flex items-center gap-1">
                <CalendarClock className="w-3 h-3" />
                Kế tiếp: {format(nextRun, 'HH:mm dd/MM')} ({formatDistanceToNow(nextRun, { addSuffix: true, locale: vi })})
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5"><Trash2 className="w-3.5 h-3.5" />Tổng bản ghi đã xóa</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between gap-2">
              <div>
                <div className="text-2xl font-semibold">{stats.totalDeleted.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  + {stats.totalStorageRemoved.toLocaleString()} linked, + {stats.totalOrphanRemoved.toLocaleString()} mồ côi
                </div>
              </div>
              {sparkData.some((v) => v > 0) && (
                <Sparkline data={sparkData} width={72} height={32} color="hsl(var(--primary))" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" />Tỉ lệ thành công</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{successRate}%</div>
            <div className="text-xs text-muted-foreground mt-1">
              {stats.successCount}/{stats.totalRuns} lần · {stats.failedCount} lỗi
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5"><Timer className="w-3.5 h-3.5" />Thời lượng trung bình</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatDuration(stats.avgDurationMs)}</div>
            <div className="text-xs text-muted-foreground mt-1">trên {stats.totalRuns} lần chạy</div>
          </CardContent>
        </Card>
      </div>

      {/* Trend charts */}
      <TrendCharts logs={logs ?? []} rangeFilter={rangeFilter} />

      {/* History table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle className="text-base">Lịch sử chạy</CardTitle>
            <div className="flex gap-2 flex-wrap">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm trong lỗi, status..."
                  className="h-9 w-[200px] pl-8 text-sm"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả status</SelectItem>
                  <SelectItem value="success">Thành công</SelectItem>
                  <SelectItem value="partial">Một phần</SelectItem>
                  <SelectItem value="failed">Lỗi</SelectItem>
                </SelectContent>
              </Select>
              <Select value={rangeFilter} onValueChange={setRangeFilter}>
                <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">24 giờ qua</SelectItem>
                  <SelectItem value="7d">7 ngày qua</SelectItem>
                  <SelectItem value="30d">30 ngày qua</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline" size="sm"
                onClick={() => exportLogsCsv(filteredLogs, jobName)}
                disabled={!filteredLogs.length}
              >
                <Download className="w-4 h-4 mr-2" /> CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : !filteredLogs.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>{search ? 'Không tìm thấy lần chạy phù hợp.' : 'Chưa có lần chạy nào trong khoảng đã chọn.'}</p>
              {!search && sched && (
                <p className="text-xs mt-1">Cron tiếp theo: {sched.description} hoặc bấm "Chạy ngay" ở trên.</p>
              )}
            </div>
          ) : (
            <>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Thời gian</TableHead>
                      <TableHead>Trigger</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Thời lượng</TableHead>
                      <TableHead className="text-right">Channel</TableHead>
                      <TableHead className="text-right">Carousel</TableHead>
                      <TableHead className="text-right">Video</TableHead>
                      <TableHead className="text-right">Storage</TableHead>
                      <TableHead className="text-right">Mồ côi</TableHead>
                      <TableHead className="text-right">Lỗi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedLog(log)}>
                        <TableCell className="font-mono text-xs">{format(new Date(log.started_at), 'dd/MM HH:mm:ss')}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{log.triggered_by}</Badge></TableCell>
                        <TableCell>{statusBadge(log.status)}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{formatDuration(log.duration_ms)}</TableCell>
                        <TableCell className="text-right">{log.summary?.channel_images_deleted ?? 0}</TableCell>
                        <TableCell className="text-right">{log.summary?.carousel_images_deleted ?? 0}</TableCell>
                        <TableCell className="text-right">{log.summary?.videos_deleted ?? 0}</TableCell>
                        <TableCell className="text-right">{log.summary?.storage_files_removed ?? 0}</TableCell>
                        <TableCell className="text-right">{log.summary?.orphan_storage_files_removed ?? 0}</TableCell>
                        <TableCell className="text-right">
                          {log.errors?.length > 0 ? (
                            <Badge variant="destructive" className="text-xs">{log.errors.length}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                <span>
                  Hiển thị {filteredLogs.length}{search && logs && logs.length !== filteredLogs.length ? ` / ${logs.length}` : ''} dòng
                </span>
                {(logs?.length ?? 0) >= pageSize && (
                  <Button variant="outline" size="sm" onClick={() => setPageSize((n) => n + 50)}>
                    Tải thêm 50
                  </Button>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chi tiết lần chạy</DialogTitle>
            <DialogDescription>
              {selectedLog && format(new Date(selectedLog.started_at), 'dd/MM/yyyy HH:mm:ss')} · {selectedLog?.triggered_by}
            </DialogDescription>
          </DialogHeader>
          {selectedLog && <LogDetail log={selectedLog} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
