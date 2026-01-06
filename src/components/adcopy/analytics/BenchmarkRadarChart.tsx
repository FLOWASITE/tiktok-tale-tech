import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { BenchmarkComparison } from '@/hooks/useAdCopyBenchmarks';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BenchmarkRadarChartProps {
  comparisons: BenchmarkComparison[];
  isLoading?: boolean;
}

const chartConfig = {
  yours: {
    label: 'Của bạn',
    color: 'hsl(var(--chart-1))',
  },
  benchmark: {
    label: 'Benchmark',
    color: 'hsl(var(--chart-2))',
  },
} satisfies ChartConfig;

export function BenchmarkRadarChart({ comparisons, isLoading }: BenchmarkRadarChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>So sánh với Benchmark</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] animate-pulse bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!comparisons.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>So sánh với Benchmark</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Chưa có dữ liệu benchmark để so sánh
          </div>
        </CardContent>
      </Card>
    );
  }

  // Normalize values for radar chart (0-100 scale)
  const radarData = comparisons.map((c) => {
    const maxValue = Math.max(c.yourValue, c.benchmarkValue) * 1.2;
    return {
      metric: c.label,
      yours: (c.yourValue / maxValue) * 100,
      benchmark: (c.benchmarkValue / maxValue) * 100,
      actualYours: c.yourValue,
      actualBenchmark: c.benchmarkValue,
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>So sánh với Benchmark</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Radar Chart */}
          <ChartContainer config={chartConfig} className="h-[280px] w-full">
            <RadarChart data={radarData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
              <PolarGrid />
              <PolarAngleAxis
                dataKey="metric"
                tick={{ fontSize: 12 }}
              />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Radar
                name="Của bạn"
                dataKey="yours"
                stroke="var(--color-yours)"
                fill="var(--color-yours)"
                fillOpacity={0.3}
                strokeWidth={2}
              />
              <Radar
                name="Benchmark"
                dataKey="benchmark"
                stroke="var(--color-benchmark)"
                fill="var(--color-benchmark)"
                fillOpacity={0.2}
                strokeWidth={2}
                strokeDasharray="5 5"
              />
            </RadarChart>
          </ChartContainer>

          {/* Comparison Details */}
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground mb-4">Chi tiết so sánh</p>
            {comparisons.map((comparison) => (
              <div
                key={comparison.metric}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div>
                  <p className="font-medium text-sm">{comparison.label}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm">
                      {comparison.metric === 'cpc' || comparison.metric === 'cpm'
                        ? `${comparison.yourValue.toLocaleString('vi-VN')} ₫`
                        : comparison.metric === 'roas'
                        ? `${comparison.yourValue.toFixed(2)}x`
                        : `${comparison.yourValue.toFixed(2)}%`}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      vs {comparison.metric === 'cpc' || comparison.metric === 'cpm'
                        ? `${comparison.benchmarkValue.toLocaleString('vi-VN')} ₫`
                        : comparison.metric === 'roas'
                        ? `${comparison.benchmarkValue.toFixed(2)}x`
                        : `${comparison.benchmarkValue.toFixed(2)}%`}
                    </span>
                  </div>
                </div>
                <Badge
                  variant={
                    comparison.status === 'above'
                      ? 'default'
                      : comparison.status === 'below'
                      ? 'destructive'
                      : 'secondary'
                  }
                  className={cn(
                    'flex items-center gap-1',
                    comparison.status === 'above' && 'bg-green-500 hover:bg-green-600'
                  )}
                >
                  {comparison.status === 'above' ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : comparison.status === 'below' ? (
                    <TrendingDown className="h-3 w-3" />
                  ) : (
                    <Minus className="h-3 w-3" />
                  )}
                  {Math.abs(comparison.percentageDiff).toFixed(0)}%
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
