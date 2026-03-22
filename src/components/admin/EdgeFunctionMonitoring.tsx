import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend
} from 'recharts';
import {
  Activity, AlertTriangle, Clock, Zap, TrendingUp, Server, Loader2
} from 'lucide-react';
import {
  useMetricsSummary, useEdgeFunctionDailyStats, useRecentMetrics
} from '@/hooks/useEdgeFunctionMetrics';

export function EdgeFunctionMonitoring() {
  const { summary, isLoading: summaryLoading } = useMetricsSummary(14);
  const { data: dailyStats, isLoading: dailyLoading } = useEdgeFunctionDailyStats(14);
  const { data: recentMetrics, isLoading: recentLoading } = useRecentMetrics(30);

  const isLoading = summaryLoading || dailyLoading;

  // Aggregate daily chart data
  const dailyChartData = useMemo(() => {
    if (!dailyStats) return [];
    const byDate = new Map<string, { date: string; calls: number; errors: number; avgMs: number; count: number }>();
    for (const s of dailyStats) {
      const existing = byDate.get(s.stat_date) || { date: s.stat_date, calls: 0, errors: 0, avgMs: 0, count: 0 };
      existing.calls += s.total_calls;
      existing.errors += s.error_count;
      existing.avgMs += s.avg_duration_ms;
      existing.count += 1;
      byDate.set(s.stat_date, existing);
    }
    return [...byDate.values()].map(d => ({
      date: d.date.slice(5), // MM-DD
      calls: d.calls,
      errors: d.errors,
      avgMs: d.count > 0 ? Math.round(d.avgMs / d.count) : 0,
    }));
  }, [dailyStats]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Đang tải metrics...</span>
      </div>
    );
  }

  const hasData = summary && summary.totalCalls > 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard
          icon={<Server className="h-4 w-4" />}
          label="Tổng gọi (14 ngày)"
          value={summary?.totalCalls ?? 0}
          color="text-primary"
        />
        <StatCard
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Tỷ lệ lỗi"
          value={`${(summary?.errorRate ?? 0).toFixed(1)}%`}
          color={(summary?.errorRate ?? 0) > 5 ? "text-destructive" : "text-emerald-500"}
        />
        <StatCard
          icon={<Zap className="h-4 w-4" />}
          label="Cold Start"
          value={`${(summary?.coldStartRate ?? 0).toFixed(1)}%`}
          color={(summary?.coldStartRate ?? 0) > 30 ? "text-amber-500" : "text-emerald-500"}
        />
        <StatCard
          icon={<Clock className="h-4 w-4" />}
          label="Avg Duration"
          value={`${summary?.avgDuration ?? 0}ms`}
          color="text-primary"
        />
        <StatCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Active Functions"
          value={summary?.topFunctions.length ?? 0}
          color="text-primary"
        />
      </div>

      {!hasData && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Activity className="h-10 w-10 mb-3 opacity-40" />
            <p className="font-medium">Chưa có dữ liệu metrics</p>
            <p className="text-xs mt-1">Metrics sẽ được ghi tự động khi Edge Functions chạy với middleware withPerf()</p>
          </CardContent>
        </Card>
      )}

      {hasData && (
        <>
          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Số lượng gọi & Lỗi theo ngày
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={dailyChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="calls" name="Calls" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="errors" name="Errors" fill="hsl(var(--destructive))" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Avg Duration (ms) theo ngày
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={dailyChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line
                      type="monotone" dataKey="avgMs" name="Avg ms"
                      stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Top Functions Table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4" /> Top Functions theo lượng gọi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Function</TableHead>
                      <TableHead className="text-right">Calls</TableHead>
                      <TableHead className="text-right">Errors</TableHead>
                      <TableHead className="text-right">Error %</TableHead>
                      <TableHead className="text-right">Avg ms</TableHead>
                      <TableHead className="text-right">P95 ms</TableHead>
                      <TableHead className="text-right">Cold Starts</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.topFunctions.map(fn => {
                      const errPct = fn.calls > 0 ? (fn.errors / fn.calls * 100) : 0;
                      return (
                        <TableRow key={fn.name}>
                          <TableCell>
                            <code className="text-xs font-mono">{fn.name}</code>
                          </TableCell>
                          <TableCell className="text-right font-medium">{fn.calls}</TableCell>
                          <TableCell className="text-right">
                            {fn.errors > 0 ? (
                              <span className="text-destructive font-medium">{fn.errors}</span>
                            ) : (
                              <span className="text-muted-foreground">0</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                errPct > 10
                                  ? 'bg-destructive/10 text-destructive border-destructive/30'
                                  : errPct > 3
                                    ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                                    : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                              }`}
                            >
                              {errPct.toFixed(1)}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{fn.avgMs}</TableCell>
                          <TableCell className="text-right">{fn.p95Ms}</TableCell>
                          <TableCell className="text-right">{fn.coldStarts}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Recent Events */}
          {recentMetrics && recentMetrics.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Sự kiện gần đây
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Thời gian</TableHead>
                        <TableHead>Function</TableHead>
                        <TableHead className="text-right">Duration</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-center">Cold</TableHead>
                        <TableHead>Error</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentMetrics.map(m => (
                        <TableRow key={m.id} className={m.had_error ? 'bg-destructive/5' : ''}>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(m.created_at).toLocaleTimeString('vi-VN')}
                          </TableCell>
                          <TableCell>
                            <code className="text-xs font-mono">{m.function_name}</code>
                          </TableCell>
                          <TableCell className="text-right text-xs font-medium">
                            {m.duration_ms}ms
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                m.status_code < 400
                                  ? 'bg-emerald-500/10 text-emerald-600'
                                  : 'bg-destructive/10 text-destructive'
                              }`}
                            >
                              {m.status_code}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {m.is_cold_start && <Zap className="h-3 w-3 text-amber-500 mx-auto" />}
                          </TableCell>
                          <TableCell className="text-xs text-destructive max-w-[200px] truncate">
                            {m.error_message || '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value: string | number; color: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className={`flex items-center gap-1.5 text-xs ${color}`}>
          {icon}
          <span className="text-muted-foreground">{label}</span>
        </div>
        <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
