import { useIntentAnalytics } from '@/hooks/useIntentAnalytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Crosshair, TrendingUp, AlertTriangle, Target } from 'lucide-react';
import { format } from 'date-fns';

const COLORS = ['hsl(var(--primary))', '#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444', '#10b981', '#ec4899', '#6366f1'];

export function IntentAnalyticsDashboard() {
  const analytics = useIntentAnalytics();

  if (analytics.isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Crosshair className="h-4 w-4" />} label="Total Decisions" value={analytics.totalDecisions} />
        <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Hit Rate" value={`${analytics.hitRate.toFixed(1)}%`} sub={`${analytics.hitCount} hit / ${analytics.missCount} miss`} />
        <StatCard icon={<AlertTriangle className="h-4 w-4" />} label="Ambiguity Rate" value={`${analytics.ambiguityRate.toFixed(1)}%`} warn={analytics.ambiguityRate > 20} />
        <StatCard icon={<Target className="h-4 w-4" />} label="Avg Confidence" value={analytics.avgConfidence.toFixed(3)} />
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Intent Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.intentDistribution.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Chưa có dữ liệu</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={analytics.intentDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {analytics.intentDistribution.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
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
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={analytics.confidenceBuckets}>
                <XAxis dataKey="range" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

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
            <p className="text-sm text-muted-foreground py-4 text-center">Không có false positive candidate nào</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[140px]">Time</TableHead>
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
                        <TableCell className="text-right font-mono text-xs">{fp.confidence.toFixed(3)}</TableCell>
                        <TableCell className="text-xs">
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

function StatCard({ icon, label, value, sub, warn }: { icon: React.ReactNode; label: string; value: string | number; sub?: string; warn?: boolean }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          {icon}
          <span className="text-xs">{label}</span>
        </div>
        <p className={`text-2xl font-bold ${warn ? 'text-amber-500' : ''}`}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}
