import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { TimeSeriesDataPoint } from '@/hooks/useAdCopyAnalytics';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';

interface PerformanceTrendChartProps {
  data: TimeSeriesDataPoint[];
  isLoading?: boolean;
}

const chartConfig = {
  spend: {
    label: 'Chi tiêu',
    color: 'hsl(var(--chart-1))',
  },
  revenue: {
    label: 'Doanh thu',
    color: 'hsl(var(--chart-2))',
  },
  conversions: {
    label: 'Chuyển đổi',
    color: 'hsl(var(--chart-3))',
  },
  clicks: {
    label: 'Clicks',
    color: 'hsl(var(--chart-4))',
  },
  ctr: {
    label: 'CTR (%)',
    color: 'hsl(var(--chart-5))',
  },
} satisfies ChartConfig;

export function PerformanceTrendChart({ data, isLoading }: PerformanceTrendChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Xu hướng hiệu suất</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] animate-pulse bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  const formattedData = data.map((d) => ({
    ...d,
    dateLabel: format(parseISO(d.date), 'dd/MM', { locale: vi }),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Xu hướng hiệu suất</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="spend">
          <TabsList className="mb-4">
            <TabsTrigger value="spend">Chi tiêu & Doanh thu</TabsTrigger>
            <TabsTrigger value="engagement">Tương tác</TabsTrigger>
            <TabsTrigger value="conversions">Chuyển đổi</TabsTrigger>
          </TabsList>

          <TabsContent value="spend">
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <AreaChart data={formattedData} margin={{ left: 12, right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="dateLabel"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) =>
                    value >= 1000000 ? `${(value / 1000000).toFixed(0)}M` : `${(value / 1000).toFixed(0)}K`
                  }
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  dataKey="spend"
                  type="monotone"
                  fill="var(--color-spend)"
                  fillOpacity={0.4}
                  stroke="var(--color-spend)"
                  strokeWidth={2}
                />
                <Area
                  dataKey="revenue"
                  type="monotone"
                  fill="var(--color-revenue)"
                  fillOpacity={0.4}
                  stroke="var(--color-revenue)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </TabsContent>

          <TabsContent value="engagement">
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <AreaChart data={formattedData} margin={{ left: 12, right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="dateLabel"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  dataKey="clicks"
                  type="monotone"
                  fill="var(--color-clicks)"
                  fillOpacity={0.4}
                  stroke="var(--color-clicks)"
                  strokeWidth={2}
                />
                <Area
                  dataKey="ctr"
                  type="monotone"
                  fill="var(--color-ctr)"
                  fillOpacity={0.4}
                  stroke="var(--color-ctr)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </TabsContent>

          <TabsContent value="conversions">
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <AreaChart data={formattedData} margin={{ left: 12, right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="dateLabel"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  dataKey="conversions"
                  type="monotone"
                  fill="var(--color-conversions)"
                  fillOpacity={0.4}
                  stroke="var(--color-conversions)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
