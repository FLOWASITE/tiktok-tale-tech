import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BarChart3 } from 'lucide-react';
import { CampaignGoal, getKPIMetricConfig, formatMetricValue } from '@/types/campaign';
import { cn } from '@/lib/utils';

interface KPIComparisonBarProps {
  goals: CampaignGoal[];
}

export function KPIComparisonBar({ goals }: KPIComparisonBarProps) {
  if (goals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            So sánh mục tiêu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            Chưa có mục tiêu KPI
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          So sánh mục tiêu
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {goals.map((goal) => {
          const config = getKPIMetricConfig(goal.metric);
          const progress = goal.target > 0 ? Math.min((goal.current / goal.target) * 100, 100) : 0;
          const isCompleted = goal.current >= goal.target && goal.target > 0;
          const isOverAchieved = goal.current > goal.target && goal.target > 0;
          
          return (
            <div key={goal.metric} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{config?.icon}</span>
                  <span className="font-medium">{goal.label}</span>
                </div>
                <span className={cn(
                  "text-sm font-medium",
                  isCompleted && "text-green-600"
                )}>
                  {formatMetricValue(goal.current, goal.unit)} / {formatMetricValue(goal.target, goal.unit)}
                </span>
              </div>
              
              <div className="relative">
                <Progress 
                  value={progress} 
                  className={cn(
                    "h-6",
                    isCompleted && "[&>div]:bg-green-500"
                  )}
                />
                <span className={cn(
                  "absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium",
                  progress > 15 ? "text-white" : "text-foreground"
                )}>
                  {Math.round(progress)}%
                </span>
                
                {/* Over-achieved indicator */}
                {isOverAchieved && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white font-medium">
                    +{Math.round(((goal.current - goal.target) / goal.target) * 100)}% 🎉
                  </span>
                )}
              </div>
              
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{config?.category}</span>
                {!isCompleted && goal.target > goal.current && (
                  <span>Còn thiếu: {formatMetricValue(goal.target - goal.current, goal.unit)}</span>
                )}
                {isCompleted && (
                  <span className="text-green-600">✓ Đã đạt mục tiêu</span>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
