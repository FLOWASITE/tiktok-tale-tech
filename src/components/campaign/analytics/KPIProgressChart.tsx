import { useMemo } from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { CampaignKPILog, CampaignGoal, getKPIMetricConfig } from '@/types/campaign';

interface KPIProgressChartProps {
  kpiLogs: CampaignKPILog[];
  goals: CampaignGoal[];
}

export function KPIProgressChart({ kpiLogs, goals }: KPIProgressChartProps) {
  // Transform data for chart
  const chartData = useMemo(() => {
    const sorted = [...kpiLogs].sort(
      (a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime()
    );
    
    return sorted.map(log => ({
      date: format(new Date(log.logged_at), 'dd/MM', { locale: vi }),
      fullDate: format(new Date(log.logged_at), 'dd/MM/yyyy', { locale: vi }),
      ...(log.metrics as Record<string, number>)
    }));
  }, [kpiLogs]);

  // Build chart config dynamically from goals
  const chartConfig = useMemo(() => {
    const colors = [
      'hsl(var(--chart-1))',
      'hsl(var(--chart-2))',
      'hsl(var(--chart-3))',
      'hsl(var(--chart-4))',
      'hsl(var(--chart-5))',
    ];
    
    return goals.reduce((acc, goal, index) => {
      acc[goal.metric] = {
        label: goal.label,
        color: colors[index % colors.length]
      };
      return acc;
    }, {} as Record<string, { label: string; color: string }>);
  }, [goals]);

  if (kpiLogs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Tiến độ KPI theo thời gian
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Chưa có dữ liệu KPI</p>
              <p className="text-sm">Hãy log KPI để xem biểu đồ tiến độ</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Tiến độ KPI theo thời gian
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis 
              dataKey="date" 
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis 
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}
            />
            <ChartTooltip 
              content={<ChartTooltipContent labelKey="fullDate" />}
            />
            {goals.map((goal, index) => {
              const config = chartConfig[goal.metric];
              return (
                <Area
                  key={goal.metric}
                  type="monotone"
                  dataKey={goal.metric}
                  stroke={config?.color}
                  fill={config?.color}
                  fillOpacity={0.1}
                  strokeWidth={2}
                  dot={false}
                />
              );
            })}
          </AreaChart>
        </ChartContainer>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-4 justify-center">
          {goals.map((goal, index) => {
            const config = chartConfig[goal.metric];
            const metricConfig = getKPIMetricConfig(goal.metric);
            return (
              <div key={goal.metric} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: config?.color }}
                />
                <span className="text-sm text-muted-foreground">
                  {metricConfig?.icon} {goal.label}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
