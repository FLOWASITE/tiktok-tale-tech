import { useMemo } from 'react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { CampaignKPILog } from '@/types/campaign';
import { cn } from '@/lib/utils';

interface KPISparklineProps {
  kpiLogs: CampaignKPILog[];
  metric: string;
  className?: string;
}

export function KPISparkline({ kpiLogs, metric, className }: KPISparklineProps) {
  const chartData = useMemo(() => {
    // Sort by date ascending for proper chart display
    const sorted = [...kpiLogs].sort(
      (a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime()
    );
    
    return sorted.map(log => ({
      value: (log.metrics as Record<string, number>)?.[metric] ?? 0
    }));
  }, [kpiLogs, metric]);

  // Calculate trend
  const trend = useMemo(() => {
    if (chartData.length < 2) return 'stable';
    const first = chartData[0]?.value ?? 0;
    const last = chartData[chartData.length - 1]?.value ?? 0;
    if (last > first) return 'up';
    if (last < first) return 'down';
    return 'stable';
  }, [chartData]);

  // Calculate percentage change
  const percentChange = useMemo(() => {
    if (chartData.length < 2) return 0;
    const first = chartData[0]?.value ?? 0;
    const last = chartData[chartData.length - 1]?.value ?? 0;
    if (first === 0) return last > 0 ? 100 : 0;
    return Math.round(((last - first) / first) * 100);
  }, [chartData]);

  if (chartData.length === 0) {
    return (
      <div className={cn("h-8 flex items-center text-xs text-muted-foreground", className)}>
        Chưa có dữ liệu
      </div>
    );
  }

  const strokeColor = trend === 'up' ? 'hsl(var(--chart-2))' : trend === 'down' ? 'hsl(var(--destructive))' : 'hsl(var(--muted-foreground))';
  const fillColor = trend === 'up' ? 'hsl(var(--chart-2) / 0.2)' : trend === 'down' ? 'hsl(var(--destructive) / 0.2)' : 'hsl(var(--muted) / 0.5)';

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="w-20 h-8">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <Area
              type="monotone"
              dataKey="value"
              stroke={strokeColor}
              fill={fillColor}
              strokeWidth={1.5}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {percentChange !== 0 && (
        <span className={cn(
          "text-xs font-medium",
          trend === 'up' && "text-green-500",
          trend === 'down' && "text-red-500"
        )}>
          {trend === 'up' ? '+' : ''}{percentChange}%
        </span>
      )}
    </div>
  );
}
