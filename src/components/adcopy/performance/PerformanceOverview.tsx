import { Eye, MousePointerClick, ShoppingCart, DollarSign, TrendingUp, Heart } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { PerformanceSummary, formatCurrency, formatNumber, formatPercent } from '@/types/adCopyPerformance';

interface PerformanceOverviewProps {
  summary: PerformanceSummary | null;
}

export function PerformanceOverview({ summary }: PerformanceOverviewProps) {
  if (!summary) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Chưa có dữ liệu performance
      </div>
    );
  }

  const metrics = [
    {
      label: 'Impressions',
      value: formatNumber(summary.total_impressions),
      subValue: `Reach: ${formatNumber(summary.total_reach)}`,
      icon: Eye,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Clicks',
      value: formatNumber(summary.total_clicks),
      subValue: `CTR: ${formatPercent(summary.avg_ctr)}`,
      icon: MousePointerClick,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
    },
    {
      label: 'Conversions',
      value: formatNumber(summary.total_conversions),
      subValue: `CR: ${formatPercent(summary.avg_conversion_rate)}`,
      icon: ShoppingCart,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      label: 'Chi phí',
      value: formatCurrency(summary.total_spend),
      subValue: `CPC: ${formatCurrency(summary.avg_cpc)}`,
      icon: DollarSign,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
    {
      label: 'Doanh thu',
      value: formatCurrency(summary.total_conversion_value),
      subValue: `ROAS: ${summary.overall_roas.toFixed(2)}x`,
      icon: TrendingUp,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Engagement',
      value: formatNumber(summary.total_engagement),
      subValue: `Rate: ${formatPercent(summary.avg_engagement_rate)}`,
      icon: Heart,
      color: 'text-pink-500',
      bgColor: 'bg-pink-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {metrics.map((metric) => (
        <Card key={metric.label} className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded-md ${metric.bgColor}`}>
                <metric.icon className={`h-4 w-4 ${metric.color}`} />
              </div>
              <span className="text-xs text-muted-foreground">{metric.label}</span>
            </div>
            <div className="text-lg font-semibold">{metric.value}</div>
            <div className="text-xs text-muted-foreground">{metric.subValue}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
