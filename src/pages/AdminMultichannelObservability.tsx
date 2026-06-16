import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, CheckCircle2, XCircle, AlertTriangle, Timer, Repeat } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

type Task = {
  id: string;
  organization_id: string | null;
  status: 'pending' | 'generating' | 'completed' | 'failed' | 'cancelled';
  task_type: string | null;
  progress: number | null;
  current_step: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  last_heartbeat_at: string | null;
};

const LOOKBACK_HOURS = 24;

export default function AdminMultichannelObservability() {
  const since = useMemo(() => new Date(Date.now() - LOOKBACK_HOURS * 3600_000).toISOString(), []);

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['admin-multichannel-tasks', since],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('generation_tasks')
        .select('id, organization_id, status, task_type, progress, current_step, error_message, created_at, updated_at, last_heartbeat_at')
        .gte('created_at', since)
        .in('task_type', ['multichannel', 'multi_channel', 'multi-channel'])
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as Task[];
    },
    refetchInterval: 30_000,
  });

  const stats = useMemo(() => {
    const list = tasks ?? [];
    const total = list.length;
    const completed = list.filter(t => t.status === 'completed').length;
    const failed = list.filter(t => t.status === 'failed').length;
    const cancelled = list.filter(t => t.status === 'cancelled').length;
    const generating = list.filter(t => t.status === 'generating').length;
    const recovered = list.filter(t => t.status === 'failed' && (t.error_message ?? '').includes('Auto-recovered')).length;
    const durations = list
      .filter(t => t.status === 'completed')
      .map(t => new Date(t.updated_at).getTime() - new Date(t.created_at).getTime())
      .filter(d => d > 0 && d < 30 * 60_000)
      .sort((a, b) => a - b);
    const avgMs = durations.length ? durations.reduce((s, d) => s + d, 0) / durations.length : 0;
    const p95Ms = durations.length ? durations[Math.floor(durations.length * 0.95)] ?? 0 : 0;
    const successRate = total > 0 ? (completed / total) * 100 : 0;
    return { total, completed, failed, cancelled, generating, recovered, avgMs, p95Ms, successRate };
  }, [tasks]);

  const recentFailures = useMemo(
    () => (tasks ?? []).filter(t => t.status === 'failed' || t.status === 'cancelled').slice(0, 50),
    [tasks]
  );

  const fmtMs = (ms: number) => (ms > 0 ? `${(ms / 1000).toFixed(1)}s` : '—');

  return (
    <div className="container mx-auto py-8 space-y-6 max-w-7xl">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Multichannel Observability</h1>
        <p className="text-sm text-muted-foreground">
          Generation tasks 24h gần nhất — health của luồng tạo nội dung đa kênh.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard icon={<Activity className="w-4 h-4" />} label="Tổng" value={stats.total} loading={isLoading} />
        <KpiCard icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />} label="Hoàn tất" value={stats.completed} hint={`${stats.successRate.toFixed(0)}%`} loading={isLoading} />
        <KpiCard icon={<XCircle className="w-4 h-4 text-rose-600" />} label="Thất bại" value={stats.failed} loading={isLoading} />
        <KpiCard icon={<AlertTriangle className="w-4 h-4 text-amber-600" />} label="Đã hủy" value={stats.cancelled} loading={isLoading} />
        <KpiCard icon={<Timer className="w-4 h-4" />} label="Đang chạy" value={stats.generating} loading={isLoading} />
        <KpiCard icon={<Repeat className="w-4 h-4 text-violet-600" />} label="Auto-recover" value={stats.recovered} loading={isLoading} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Thời lượng trung bình</CardTitle>
            <CardDescription>Chỉ tính task completed (<30m)</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{fmtMs(stats.avgMs)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">P95</CardTitle>
            <CardDescription>95% task hoàn tất dưới mốc này</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{fmtMs(stats.p95Ms)}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Failures & Cancellations gần đây</CardTitle>
          <CardDescription>50 task cuối có status failed/cancelled trong 24h</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : recentFailures.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Không có lỗi trong 24h qua 🎉</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Thời điểm</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Step</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Lỗi</TableHead>
                  <TableHead>Org</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentFailures.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-xs">{formatDistanceToNow(new Date(t.created_at), { addSuffix: true, locale: vi })}</TableCell>
                    <TableCell>
                      <Badge variant={t.status === 'failed' ? 'destructive' : 'secondary'} className="text-xs">{t.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{t.current_step ?? '—'}</TableCell>
                    <TableCell className="text-xs">{t.progress ?? 0}%</TableCell>
                    <TableCell className="text-xs max-w-md truncate" title={t.error_message ?? ''}>{t.error_message ?? '—'}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{t.organization_id?.slice(0, 8) ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ icon, label, value, hint, loading }: { icon: React.ReactNode; label: string; value: number; hint?: string; loading?: boolean }) {
  return (
    <Card>
      <CardContent className="pt-4 space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">{icon} {label}</span>
          {hint && <span className="text-xs font-medium">{hint}</span>}
        </div>
        {loading ? <Skeleton className="h-7 w-14" /> : <div className="text-2xl font-semibold">{value}</div>}
      </CardContent>
    </Card>
  );
}
