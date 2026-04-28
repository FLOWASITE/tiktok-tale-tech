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
