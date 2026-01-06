import { useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PerformanceByDate, formatNumber, formatCurrency, formatPercent } from '@/types/adCopyPerformance';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';

interface PerformanceChartProps {
  data: PerformanceByDate[];
}

type MetricKey = 'impressions' | 'clicks' | 'conversions' | 'spend' | 'ctr';

const METRICS: { value: MetricKey; label: string; color: string; format: (v: number) => string }[] = [
  { value: 'impressions', label: 'Impressions', color: 'hsl(var(--primary))', format: formatNumber },
  { value: 'clicks', label: 'Clicks', color: 'hsl(142, 76%, 36%)', format: formatNumber },
  { value: 'conversions', label: 'Conversions', color: 'hsl(262, 83%, 58%)', format: formatNumber },
  { value: 'spend', label: 'Chi phí', color: 'hsl(25, 95%, 53%)', format: formatCurrency },
  { value: 'ctr', label: 'CTR', color: 'hsl(199, 89%, 48%)', format: formatPercent },
];

export function PerformanceChart({ data }: PerformanceChartProps) {
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('impressions');
  
  const metric = METRICS.find(m => m.value === selectedMetric) || METRICS[0];

  const chartData = useMemo(() => {
    return data.map(d => ({
      ...d,
      dateLabel: format(parseISO(d.date), 'dd/MM', { locale: vi }),
    }));
  }, [data]);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Xu hướng Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            Chưa có dữ liệu để hiển thị
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Xu hướng Performance</CardTitle>
        <Select value={selectedMetric} onValueChange={(v) => setSelectedMetric(v as MetricKey)}>
          <SelectTrigger className="w-[140px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {METRICS.map(m => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={metric.color} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={metric.color} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis 
              dataKey="dateLabel" 
              tick={{ fontSize: 11 }} 
              className="text-muted-foreground"
            />
            <YAxis 
              tick={{ fontSize: 11 }} 
              tickFormatter={(v) => {
                if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
                if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
                return v;
              }}
              className="text-muted-foreground"
            />
            <Tooltip 
              formatter={(value: number) => [metric.format(value), metric.label]}
              labelFormatter={(label) => `Ngày ${label}`}
              contentStyle={{ 
                backgroundColor: 'hsl(var(--popover))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Area 
              type="monotone" 
              dataKey={selectedMetric} 
              stroke={metric.color} 
              fill="url(#colorMetric)" 
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
