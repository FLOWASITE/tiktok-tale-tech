import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAIMetrics } from '@/hooks/useAIMetrics';
import { Activity, Zap, Clock, AlertTriangle, Database, TrendingUp } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

interface AIDashboardProps {
  organizationId?: string;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export function AIDashboard({ organizationId }: AIDashboardProps) {
  const { summary, byFunction, daily, recent, isLoading } = useAIMetrics(organizationId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card><CardContent className="h-[300px]"><Skeleton className="h-full w-full" /></CardContent></Card>
          <Card><CardContent className="h-[300px]"><Skeleton className="h-full w-full" /></CardContent></Card>
        </div>
      </div>
    );
  }

  // Prepare pie chart data
  const pieData = byFunction?.slice(0, 6).map(f => ({
    name: f.functionName.replace('generate-', '').replace('-', ' '),
    value: f.callCount,
  })) || [];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tổng AI Calls
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.totalCalls.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Hôm nay: {summary?.totalCallsToday || 0} | Tuần: {summary?.totalCallsWeek || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Thời gian TB
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary?.averageDurationMs ? `${(summary.averageDurationMs / 1000).toFixed(1)}s` : '0s'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Latency trung bình mỗi request
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tokens ước tính
            </CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary?.totalTokensEstimated ? `${(summary.totalTokensEstimated / 1000).toFixed(0)}K` : '0'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              ~${((summary?.totalTokensEstimated || 0) * 0.00001).toFixed(2)} estimated
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Error Rate / Cache Hit
            </CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant={summary?.errorRate && summary.errorRate > 5 ? 'destructive' : 'secondary'}>
                <AlertTriangle className="h-3 w-3 mr-1" />
                {summary?.errorRate || 0}% lỗi
              </Badge>
              <Badge variant="outline">
                <TrendingUp className="h-3 w-3 mr-1" />
                {summary?.cacheHitRate || 0}% cache
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Usage Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">AI Calls (7 ngày)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={daily || []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => new Date(value).toLocaleDateString('vi-VN', { weekday: 'short' })}
                    className="text-xs"
                  />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    labelFormatter={(value) => new Date(value).toLocaleDateString('vi-VN')}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="callCount" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                    name="Số calls"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="errorCount" 
                    stroke="hsl(var(--destructive))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--destructive))' }}
                    name="Lỗi"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Function Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Phân bố theo Function</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] flex items-center">
              <ResponsiveContainer width="50%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {pieData.map((item, index) => (
                  <div key={item.name} className="flex items-center gap-2 text-sm">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="truncate flex-1">{item.name}</span>
                    <span className="font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Function Usage Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Calls by Function</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byFunction?.slice(0, 10) || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" className="text-xs" />
                <YAxis 
                  type="category" 
                  dataKey="functionName" 
                  width={150}
                  tickFormatter={(value) => value.replace('generate-', '')}
                  className="text-xs"
                />
                <Tooltip />
                <Bar dataKey="callCount" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Calls" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Hoạt động gần đây</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {recent?.length === 0 && (
              <p className="text-muted-foreground text-sm text-center py-4">
                Chưa có hoạt động AI nào
              </p>
            )}
            {recent?.map((call) => (
              <div 
                key={call.id} 
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${call.hadError ? 'bg-destructive' : 'bg-green-500'}`} />
                  <div>
                    <p className="text-sm font-medium">{call.functionName}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(call.createdAt), { addSuffix: true, locale: vi })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm">{(call.totalDurationMs / 1000).toFixed(1)}s</p>
                  {(call.inputTokens || call.outputTokens) && (
                    <p className="text-xs text-muted-foreground">
                      {(call.inputTokens || 0) + (call.outputTokens || 0)} tokens
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
