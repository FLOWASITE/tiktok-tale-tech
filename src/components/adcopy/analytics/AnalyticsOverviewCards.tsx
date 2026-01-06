import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, DollarSign, Target, MousePointer, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnalyticsSummary } from '@/hooks/useAdCopyAnalytics';

interface AnalyticsOverviewCardsProps {
  summary: AnalyticsSummary;
  isLoading?: boolean;
}

interface MetricCardProps {
  title: string;
  value: string;
  change: number;
  icon: React.ReactNode;
  format?: 'currency' | 'percent' | 'number';
}

function MetricCard({ title, value, change, icon }: MetricCardProps) {
  const isPositive = change > 0;
  const isNeutral = Math.abs(change) < 1;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            {icon}
          </div>
        </div>
        <div className="mt-4 flex items-center gap-1">
          {isNeutral ? (
            <Minus className="h-4 w-4 text-muted-foreground" />
          ) : isPositive ? (
            <TrendingUp className="h-4 w-4 text-green-500" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-500" />
          )}
          <span
            className={cn(
              'text-sm font-medium',
              isNeutral ? 'text-muted-foreground' : isPositive ? 'text-green-500' : 'text-red-500'
            )}
          >
            {isNeutral ? '0%' : `${isPositive ? '+' : ''}${change.toFixed(1)}%`}
          </span>
          <span className="text-sm text-muted-foreground">vs kỳ trước</span>
        </div>
      </CardContent>
    </Card>
  );
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toLocaleString('vi-VN');
}

export function AnalyticsOverviewCards({ summary, isLoading }: AnalyticsOverviewCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="pt-6">
              <div className="h-20 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Tổng chi tiêu"
        value={`${formatCurrency(summary.totalSpend)} ₫`}
        change={summary.spendChange}
        icon={<DollarSign className="h-6 w-6 text-primary" />}
      />
      <MetricCard
        title="ROAS"
        value={`${summary.overallROAS.toFixed(2)}x`}
        change={summary.roasChange}
        icon={<Target className="h-6 w-6 text-primary" />}
      />
      <MetricCard
        title="CTR trung bình"
        value={`${summary.avgCTR.toFixed(2)}%`}
        change={summary.ctrChange}
        icon={<MousePointer className="h-6 w-6 text-primary" />}
      />
      <MetricCard
        title="Chuyển đổi"
        value={summary.totalConversions.toLocaleString('vi-VN')}
        change={summary.conversionsChange}
        icon={<Eye className="h-6 w-6 text-primary" />}
      />
    </div>
  );
}
