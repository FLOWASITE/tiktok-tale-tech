import { useSubscription } from '@/hooks/useSubscription';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { FileText, Images, Layers, Wand2, Palette, ArrowUpRight, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getPlanBadge } from '@/lib/plan-badge';
import { Skeleton } from '@/components/ui/skeleton';

interface QuotaItem {
  key: string;
  label: string;
  icon: React.ElementType;
  used: number;
  limit: number;
}

function getQuotaColor(percentage: number) {
  if (percentage >= 90) return 'bg-destructive';
  if (percentage >= 70) return 'bg-amber-500';
  return 'bg-primary';
}

function getQuotaTextColor(percentage: number) {
  if (percentage >= 90) return 'text-destructive';
  if (percentage >= 70) return 'text-amber-500';
  return 'text-muted-foreground';
}

export function UsageQuotaWidget() {
  const navigate = useNavigate();
  const { subscription, currentPlanLimits, usage, isLoading } = useSubscription();
  const planBadge = getPlanBadge(subscription?.plan_type);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-8" />)}
        </CardContent>
      </Card>
    );
  }

  if (!currentPlanLimits || !usage) return null;

  const items: QuotaItem[] = [
    { key: 'scripts', label: 'Scripts', icon: FileText, used: usage.scripts, limit: currentPlanLimits.monthly_scripts },
    { key: 'carousels', label: 'Carousels', icon: Images, used: usage.carousels, limit: currentPlanLimits.monthly_carousels },
    { key: 'multichannel', label: 'Đa kênh', icon: Layers, used: usage.multichannel, limit: currentPlanLimits.monthly_multichannel },
    { key: 'images', label: 'Ảnh AI', icon: Wand2, used: usage.images, limit: currentPlanLimits.monthly_images },
    { key: 'brands', label: 'Brands', icon: Palette, used: usage.brands, limit: currentPlanLimits.monthly_brands },
  ];

  const hasWarning = items.some(item => {
    if (item.limit === -1) return false;
    return (item.used / item.limit) >= 0.8;
  });

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            Hạn mức sử dụng
            <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0 border', planBadge.className)}>
              {planBadge.label}
            </Badge>
          </CardTitle>
          {hasWarning && (
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map(item => {
          const isUnlimited = item.limit === -1;
          const percentage = isUnlimited ? 0 : Math.min(100, Math.round((item.used / item.limit) * 100));
          const Icon = item.icon;

          return (
            <div key={item.key} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Icon className="h-3 w-3" />
                  {item.label}
                </span>
                <span className={cn('font-medium tabular-nums', !isUnlimited && getQuotaTextColor(percentage))}>
                  {item.used}{isUnlimited ? ' / ∞' : ` / ${item.limit}`}
                </span>
              </div>
              <Progress
                value={isUnlimited ? 0 : percentage}
                className="h-1.5"
                style={{
                  // Override indicator color via CSS variable
                }}
              >
              </Progress>
              {/* Custom colored progress bar */}
              <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden -mt-1.5">
                <div
                  className={cn('h-full rounded-full transition-all', getQuotaColor(percentage))}
                  style={{ width: `${isUnlimited ? 0 : percentage}%` }}
                />
              </div>
            </div>
          );
        })}

        <div className="flex items-center gap-2 pt-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7 flex-1"
            onClick={() => navigate('/account')}
          >
            Xem chi tiết
            <ArrowUpRight className="h-3 w-3 ml-1" />
          </Button>
          {hasWarning && (
            <Button
              size="sm"
              className="text-xs h-7"
              onClick={() => navigate('/pricing')}
            >
              Nâng cấp
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
