import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Pie, PieChart, Cell, Label } from 'recharts';
import { Target } from 'lucide-react';
import { CampaignGoal } from '@/types/campaign';

interface GoalCompletionDonutProps {
  goals: CampaignGoal[];
}

export function GoalCompletionDonut({ goals }: GoalCompletionDonutProps) {
  const stats = useMemo(() => {
    const completed = goals.filter(g => g.current >= g.target && g.target > 0).length;
    const inProgress = goals.filter(g => g.current > 0 && g.current < g.target).length;
    const notStarted = goals.filter(g => g.current === 0 || g.target === 0).length;
    const total = goals.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { completed, inProgress, notStarted, total, percentage };
  }, [goals]);

  const chartData = [
    { name: 'Đã đạt', value: stats.completed, fill: 'hsl(var(--chart-2))' },
    { name: 'Đang tiến hành', value: stats.inProgress, fill: 'hsl(var(--chart-1))' },
    { name: 'Chưa bắt đầu', value: stats.notStarted, fill: 'hsl(var(--muted))' },
  ].filter(item => item.value > 0);

  const chartConfig = {
    completed: { label: 'Đã đạt', color: 'hsl(var(--chart-2))' },
    inProgress: { label: 'Đang tiến hành', color: 'hsl(var(--chart-1))' },
    notStarted: { label: 'Chưa bắt đầu', color: 'hsl(var(--muted))' },
  };

  if (goals.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4" />
            Hoàn thành mục tiêu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[160px] flex items-center justify-center text-muted-foreground text-sm">
            Chưa có mục tiêu
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="h-4 w-4" />
          Hoàn thành mục tiêu
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[160px] w-full">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent />} />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius={50}
              outerRadius={70}
              strokeWidth={2}
              stroke="hsl(var(--background))"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-2xl font-bold"
                        >
                          {stats.percentage}%
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 18}
                          className="fill-muted-foreground text-xs"
                        >
                          {stats.completed}/{stats.total}
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 justify-center mt-2">
          <div className="flex items-center gap-1.5 text-xs">
            <div className="w-2 h-2 rounded-full bg-[hsl(var(--chart-2))]" />
            <span className="text-muted-foreground">Đạt: {stats.completed}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <div className="w-2 h-2 rounded-full bg-[hsl(var(--chart-1))]" />
            <span className="text-muted-foreground">Đang: {stats.inProgress}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <div className="w-2 h-2 rounded-full bg-muted" />
            <span className="text-muted-foreground">Chưa: {stats.notStarted}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
