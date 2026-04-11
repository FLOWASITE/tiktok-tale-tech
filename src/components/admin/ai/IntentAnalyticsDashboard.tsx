import { useIntentAnalytics } from '@/hooks/useIntentAnalytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend, LineChart, Line, CartesianGrid, Area, AreaChart,
} from 'recharts';
import { Crosshair, TrendingUp, AlertTriangle, Target, RefreshCw, Clock, Zap, Timer } from 'lucide-react';
import { format } from 'date-fns';

const COLORS = ['hsl(var(--primary))', '#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444', '#10b981', '#ec4899', '#6366f1'];
const DATE_OPTIONS = [
  { value: '24h', label: '24h' },
  { value: '7d', label: '7 ngày' },
  { value: '30d', label: '30 ngày' },
  { value: 'all', label: 'Tất cả' },
];

export function IntentAnalyticsDashboard() {
  const analytics = useIntentAnalytics();

  if (analytics.isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Fast-Path Intent Analytics</h2>
          <Badge variant="secondary" className="text-xs">
            {analytics.totalDecisions} decisions
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden">
            {DATE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => analytics.setDateRange(opt.value)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  analytics.dateRange === opt.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background text-muted-foreground hover:bg-muted'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => analytics.refetch()}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard icon={<Crosshair className="h-4 w-4" />} label="Total Decisions" value={analytics.totalDecisions} />
        <StatCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Hit Rate"
          value={`${analytics.hitRate.toFixed(1)}%`}
          sub={`${analytics.hitCount} hit / ${analytics.missCount} miss`}
          color={analytics.hitRate > 70 ? 'text-emerald-500' : analytics.hitRate > 40 ? 'text-amber-500' : 'text-destructive'}
        />
        <StatCard
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Ambiguity Rate"
          value={`${analytics.ambiguityRate.toFixed(1)}%`}
          warn={analytics.ambiguityRate > 20}
        />
        <StatCard icon={<Target className="h-4 w-4" />} label="Avg Confidence" value={analytics.avgConfidence.toFixed(3)} />
        <StatCard
          icon={<Timer className="h-4 w-4" />}
          label="Avg Latency"
          value={analytics.avgDurationMs > 0 ? `${analytics.avgDurationMs.toFixed(0)}ms` : '—'}
        />
      </div>

      {/* Hit/Miss progress bar */}
      {analytics.totalDecisions > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Hit vs Miss Ratio</span>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  Hit ({analytics.hitCount})
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                  Miss ({analytics.missCount})
                </span>
              </div>
            </div>
            <div className="h-3 rounded-full bg-red-400/20 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${analytics.hitRate}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trend chart */}
      {analytics.dailyTrend.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Daily Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={analytics.dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={v => v.slice(5)} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, fontSize: 12 }}
                  labelFormatter={v => `Ngày: ${v}`}
                />
                <Area type="monotone" dataKey="hit" stackId="1" fill="#10b981" fillOpacity={0.3} stroke="#10b981" name="Hit" />
                <Area type="monotone" dataKey="miss" stackId="1" fill="#ef4444" fillOpacity={0.2} stroke="#ef4444" name="Miss" />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Charts row */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Intent Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.intentDistribution.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Chưa có dữ liệu</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={analytics.intentDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={85}
                    innerRadius={40}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={{ strokeWidth: 1 }}
                  >
                    {analytics.intentDistribution.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Confidence Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={analytics.confidenceBuckets}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top intents table */}
      {analytics.topIntents.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Top Intents Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.topIntents.map(ti => (
                <div key={ti.intent} className="flex items-center gap-3">
                  <Badge variant="outline" className="min-w-[100px] justify-center text-xs font-mono">
                    {ti.intent}
                  </Badge>
                  <div className="flex-1">
                    <Progress value={ti.hitRate} className="h-2" />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground whitespace-nowrap">
                    <span>{ti.count} calls</span>
                    <span>conf: {ti.avgConf.toFixed(2)}</span>
                    <span className={ti.hitRate > 70 ? 'text-emerald-500' : 'text-amber-500'}>
                      {ti.hitRate.toFixed(0)}% hit
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* False positive table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            False Positive Candidates
            {analytics.falsePositives.length > 0 && (
              <Badge variant="secondary" className="bg-amber-500/10 text-amber-600">{analytics.falsePositives.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analytics.falsePositives.length === 0 ? (
            <div className="text-center py-8">
              <Target className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">Không có false positive candidate nào</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Hệ thống đang hoạt động tốt!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[130px]">Time</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Intent</TableHead>
                    <TableHead className="text-right">Confidence</TableHead>
                    <TableHead>Top Scores</TableHead>
                    <TableHead>Template</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.falsePositives.map(fp => {
                    const topScores = Object.entries(fp.allScores)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 2);
                    return (
                      <TableRow key={fp.id} className="bg-amber-500/5">
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(fp.createdAt), 'dd/MM HH:mm')}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-xs" title={fp.inputSummary || ''}>
                          {fp.inputSummary?.slice(0, 60) || '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{fp.intent}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          <span className={fp.confidence < 0.7 ? 'text-destructive' : 'text-amber-500'}>
                            {fp.confidence.toFixed(3)}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {topScores.map(([k, v]) => `${k}: ${v}`).join(', ') || '—'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{fp.templateChosen || '—'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon, label, value, sub, warn, color }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  warn?: boolean;
  color?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          {icon}
          <span className="text-xs">{label}</span>
        </div>
        <p className={`text-2xl font-bold ${warn ? 'text-amber-500' : color || ''}`}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}
