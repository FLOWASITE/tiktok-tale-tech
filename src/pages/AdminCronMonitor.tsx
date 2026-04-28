import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Play, RefreshCw, Clock, CheckCircle2, AlertTriangle, XCircle, Trash2, FileWarning, Calendar, TrendingUp } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { formatDistanceToNow, format, startOfDay, startOfWeek, startOfHour, eachDayOfInterval, eachWeekOfInterval, eachHourOfInterval, subDays, subHours } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  Legend,
} from 'recharts';

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

const JOB_NAME = 'cleanup-old-media';

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
  bucket: string;
  label: string;
  dbRecords: number;
  storageLinked: number;
  orphan: number;
  total: number;
  avgDurationSec: number;
  maxDurationSec: number;
  runCount: number;
};

function aggregateByPeriod(logs: CronLog[], g: Granularity, rangeFilter: string): AggRow[] {
  const buckets = buildBuckets(rangeFilter, g);
  const map = new Map<string, AggRow>();
  buckets.forEach((b) => {
    map.set(b, {
      bucket: b,
      label: bucketLabel(b, g),
      dbRecords: 0,
      storageLinked: 0,
      orphan: 0,
      total: 0,
      avgDurationSec: 0,
      maxDurationSec: 0,
      runCount: 0,
    });
  });

  // accumulators for avg
  const sumDur = new Map<string, number>();

  logs.forEach((log) => {
    const key = bucketKey(new Date(log.started_at), g);
    const row = map.get(key);
    if (!row) return; // outside range
    const s = log.summary || {};
    const db =
      (s.channel_images_deleted ?? 0) + (s.carousel_images_deleted ?? 0) + (s.videos_deleted ?? 0);
    const storage = s.storage_files_removed ?? 0;
    const orphan = s.orphan_storage_files_removed ?? 0;
    row.dbRecords += db;
    row.storageLinked += storage;
    row.orphan += orphan;
    row.total += db + storage + orphan;
    const durSec = (log.duration_ms ?? 0) / 1000;
    sumDur.set(key, (sumDur.get(key) ?? 0) + durSec);
    if (durSec > row.maxDurationSec) row.maxDurationSec = durSec;
    row.runCount += 1;
  });

  // finalise avg
  for (const row of map.values()) {
    if (row.runCount > 0) {
      row.avgDurationSec = +(sumDur.get(row.bucket)! / row.runCount).toFixed(2);
      row.maxDurationSec = +row.maxDurationSec.toFixed(2);
    }
  }

  return Array.from(map.values());
}

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

  // Reset granularity when range changes
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
            {/* Deletion stacked bar */}
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
                    <Bar dataKey="dbRecords" name="DB records" stackId="a" fill="hsl(var(--primary))" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="storageLinked" name="Storage (linked)" stackId="a" fill="hsl(var(--muted-foreground) / 0.6)" />
                    <Bar dataKey="orphan" name="Mồ côi" stackId="a" fill="hsl(var(--accent-foreground) / 0.4)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Duration line */}
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

export default function AdminCronMonitor() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [rangeFilter, setRangeFilter] = useState<string>('30d');
  const [selectedLog, setSelectedLog] = useState<CronLog | null>(null);
  const [running, setRunning] = useState(false);

  const { data: logs, isLoading } = useQuery({
    queryKey: ['cron-logs', JOB_NAME, statusFilter, rangeFilter],
    queryFn: async () => {
      const days = rangeFilter === '24h' ? 1 : rangeFilter === '7d' ? 7 : 30;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      let q = supabase
        .from('cron_run_logs')
        .select('*')
        .eq('job_name', JOB_NAME)
        .gte('started_at', since)
        .order('started_at', { ascending: false })
        .limit(50);

      if (statusFilter !== 'all') q = q.eq('status', statusFilter);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as CronLog[];
    },
    refetchInterval: 30_000,
  });

  // Aggregate stats
  const stats = {
    lastRun: logs?.[0],
    totalRuns: logs?.length ?? 0,
    successCount: logs?.filter((l) => l.status === 'success').length ?? 0,
    failedCount: logs?.filter((l) => l.status === 'failed').length ?? 0,
    totalDeleted: logs?.reduce((sum, l) => {
      const s = l.summary || {};
      return sum + (s.channel_images_deleted ?? 0) + (s.carousel_images_deleted ?? 0) + (s.videos_deleted ?? 0);
    }, 0) ?? 0,
    totalStorageRemoved: logs?.reduce((sum, l) => sum + (l.summary?.storage_files_removed ?? 0), 0) ?? 0,
    totalOrphanRemoved: logs?.reduce((sum, l) => sum + (l.summary?.orphan_storage_files_removed ?? 0), 0) ?? 0,
  };

  const successRate = stats.totalRuns > 0 ? Math.round((stats.successCount / stats.totalRuns) * 100) : 0;

  const handleRunNow = async () => {
    setRunning(true);
    toast.info('Đang chạy cleanup-old-media...');
    try {
      const { data, error } = await supabase.functions.invoke('cleanup-old-media', {
        body: { triggered_by: 'manual' },
      });
      if (error) throw error;
      const s = data?.summary ?? {};
      const dbDeleted = (s.channel_images_deleted ?? 0) + (s.carousel_images_deleted ?? 0) + (s.videos_deleted ?? 0);
      const storageDeleted = (s.storage_files_removed ?? 0) + (s.orphan_storage_files_removed ?? 0);
      toast.success(`Hoàn thành. Đã xóa ${dbDeleted} bản ghi DB và ${storageDeleted} file storage.`);
      // Wait briefly for log row to be inserted
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ['cron-logs'] }), 1500);
    } catch (e: any) {
      toast.error(`Lỗi: ${e.message ?? 'Unknown'}`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="container max-w-7xl py-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Cron Monitor</h1>
          <p className="text-muted-foreground mt-1">
            Theo dõi trạng thái các tác vụ định kỳ. Hiện tại: <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{JOB_NAME}</code> · Lịch chạy: 03:00 UTC mỗi ngày (10:00 VN)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['cron-logs'] })}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Làm mới
          </Button>
          <Button onClick={handleRunNow} disabled={running} size="sm">
            <Play className={`w-4 h-4 mr-2 ${running ? 'animate-pulse' : ''}`} />
            {running ? 'Đang chạy...' : 'Chạy ngay'}
          </Button>
        </div>
      </div>

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
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5"><Trash2 className="w-3.5 h-3.5" />Tổng bản ghi đã xóa</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{stats.totalDeleted.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-1">
              + {stats.totalStorageRemoved.toLocaleString()} files DB-linked, + {stats.totalOrphanRemoved.toLocaleString()} files mồ côi
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" />Tỉ lệ thành công</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{successRate}%</div>
            <div className="text-xs text-muted-foreground mt-1">{stats.successCount}/{stats.totalRuns} lần chạy</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5"><FileWarning className="w-3.5 h-3.5" />Lần chạy lỗi</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{stats.failedCount}</div>
            <div className="text-xs text-muted-foreground mt-1">trong khoảng đã chọn</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle className="text-base">Lịch sử chạy</CardTitle>
            <div className="flex gap-2">
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
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : !logs || logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Chưa có lần chạy nào trong khoảng đã chọn.</p>
              <p className="text-xs mt-1">Cron tiếp theo sẽ chạy lúc 03:00 UTC hoặc bấm "Chạy ngay" ở trên.</p>
            </div>
          ) : (
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
                  {logs.map((log) => (
                    <TableRow key={log.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedLog(log)}>
                      <TableCell className="font-mono text-xs">
                        {format(new Date(log.started_at), 'dd/MM HH:mm:ss')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{log.triggered_by}</Badge>
                      </TableCell>
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
          )}
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chi tiết lần chạy</DialogTitle>
            <DialogDescription>
              {selectedLog && format(new Date(selectedLog.started_at), 'dd/MM/yyyy HH:mm:ss')} · {selectedLog?.triggered_by}
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {statusBadge(selectedLog.status)}
                <span className="text-sm text-muted-foreground">Thời lượng: {formatDuration(selectedLog.duration_ms)}</span>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">Summary</h4>
                <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
                  {JSON.stringify(selectedLog.summary, null, 2)}
                </pre>
              </div>

              {selectedLog.errors?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 text-destructive">Lỗi ({selectedLog.errors.length})</h4>
                  <div className="space-y-1">
                    {selectedLog.errors.map((err, i) => (
                      <div key={i} className="bg-destructive/5 border border-destructive/20 text-destructive text-xs p-2 rounded font-mono">
                        {typeof err === 'string' ? err : JSON.stringify(err)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
