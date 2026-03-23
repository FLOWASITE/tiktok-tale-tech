import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { GEOMonitoringResult } from '@/hooks/useGEOMonitors';

interface SOVChartProps {
  results: GEOMonitoringResult[];
  brandName: string;
  competitors: string[];
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--muted-foreground))',
  'hsl(var(--accent-foreground))',
  'hsl(var(--destructive))',
  'hsl(210, 60%, 50%)',
];

export function SOVChart({ results, brandName, competitors }: SOVChartProps) {
  // Calculate mention share
  const brandMentions = results.filter(r => r.brand_mentioned).length;
  const competitorData = competitors.map(comp => {
    const mentions = results.reduce((count, r) => {
      const cm = r.competitor_mentions as Record<string, any>;
      return count + (cm?.[comp] ? 1 : 0);
    }, 0);
    return { name: comp, value: mentions };
  });

  const chartData = [
    { name: brandName, value: brandMentions },
    ...competitorData.filter(d => d.value > 0),
  ];

  const total = chartData.reduce((s, d) => s + d.value, 0);

  if (total === 0) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Share of Voice</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
          Chưa có dữ liệu. Chạy scan để bắt đầu.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="text-base">Share of Voice</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
