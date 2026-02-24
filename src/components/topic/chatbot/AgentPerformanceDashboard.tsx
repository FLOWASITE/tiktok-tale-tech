import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useAgentPerformance, type AgentStats } from '@/hooks/useAgentPerformance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Bot, Clock, Zap, CheckCircle2, Loader2 } from 'lucide-react';

const AGENT_COLORS: Record<string, string> = {
  'research-agent': 'hsl(var(--chart-1))',
  'strategy-agent': 'hsl(var(--chart-2))',
  'content-agent': 'hsl(var(--chart-3))',
  'reviewer-agent': 'hsl(var(--chart-4))',
};

const AGENT_LABELS: Record<string, string> = {
  'research-agent': 'Research',
  'strategy-agent': 'Strategy',
  'content-agent': 'Content',
  'reviewer-agent': 'Reviewer',
};

export function AgentPerformanceDashboard() {
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'all'>('month');
  const { performanceData, isLoading } = useAgentPerformance(dateRange);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const { stats, totalSessions } = performanceData;

  if (stats.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-10 text-muted-foreground">
          <Bot className="w-10 h-10 mb-2 opacity-40" />
          <p className="text-sm">Chưa có dữ liệu hiệu suất agent</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = stats.map(s => ({
    name: AGENT_LABELS[s.agentName] || s.agentName,
    agentName: s.agentName,
    runs: s.totalRuns,
    successRate: s.successRate,
    avgDuration: Math.round(s.avgDurationMs / 1000 * 10) / 10, // seconds
    avgTokens: s.avgTokenUsage,
  }));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Agent Performance</h3>
          <Badge variant="secondary" className="text-xs">
            {totalSessions} phiên
          </Badge>
        </div>
        <Select value={dateRange} onValueChange={(v) => setDateRange(v as any)}>
          <SelectTrigger className="w-[120px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">7 ngày</SelectItem>
            <SelectItem value="month">30 ngày</SelectItem>
            <SelectItem value="all">Tất cả</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s) => (
          <AgentStatCard key={s.agentName} stat={s} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Runs Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Số lần chạy</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="runs" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry) => (
                    <Cell key={entry.agentName} fill={AGENT_COLORS[entry.agentName] || 'hsl(var(--primary))'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Duration Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Thời gian TB (giây)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="avgDuration" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry) => (
                    <Cell key={entry.agentName} fill={AGENT_COLORS[entry.agentName] || 'hsl(var(--primary))'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AgentStatCard({ stat }: { stat: AgentStats }) {
  const label = AGENT_LABELS[stat.agentName] || stat.agentName;
  const color = AGENT_COLORS[stat.agentName] || 'hsl(var(--primary))';

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-primary" style={{ backgroundColor: color }} />
      <CardContent className="p-3 pl-4">
        <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-bold text-foreground">{stat.totalRuns}</span>
          <span className="text-xs text-muted-foreground">lần</span>
        </div>
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-0.5">
            <CheckCircle2 className="w-3 h-3 text-primary" />
            {stat.successRate}%
          </span>
          <span className="flex items-center gap-0.5">
            <Clock className="w-3 h-3" />
            {(stat.avgDurationMs / 1000).toFixed(1)}s
          </span>
          {stat.avgTokenUsage > 0 && (
            <span className="flex items-center gap-0.5">
              <Zap className="w-3 h-3" />
              {stat.avgTokenUsage}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
