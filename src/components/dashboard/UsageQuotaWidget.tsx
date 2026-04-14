import { useState } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { FileText, Images, Layers, Wand2, Palette, ArrowUpRight, AlertTriangle, Calendar, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getPlanBadge } from '@/lib/plan-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { UpgradePlanDialog } from '@/components/UpgradePlanDialog';

interface QuotaItem {
  key: string;
  label: string;
  icon: React.ElementType;
  used: number;
  limit: number;
}

function getQuotaBarClass(percentage: number) {
  if (percentage >= 90) return 'bg-destructive';
  if (percentage >= 70) return 'bg-amber-500';
  return 'bg-primary';
}

function getQuotaTextClass(percentage: number) {
  if (percentage >= 90) return 'text-destructive';
  if (percentage >= 70) return 'text-amber-500';
  return 'text-muted-foreground';
}

export function UsageQuotaWidget() {
  const navigate = useNavigate();
  const { subscription, currentPlanLimits, usage, isLoading, currentPeriod } = useSubscription();
  const planBadge = getPlanBadge(subscription?.plan_type);

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-8" />)}
        </CardContent>
      </Card>
    );
  }

  if (!currentPlanLimits || !usage) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Hạn mức sử dụng</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-6 text-center space-y-3">
          <AlertTriangle className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Chưa có gói đăng ký</p>
          <Button size="sm" className="text-xs" onClick={() => navigate('/pricing')}>
            Chọn gói
          </Button>
        </CardContent>
      </Card>
    );
  }

  const now = new Date();
  const periodStart = new Date(currentPeriod.start);
  const periodEnd = new Date(currentPeriod.end);
  const totalDays = Math.max(1, Math.ceil((periodEnd.getTime() - periodStart.getTime()) / 86400000));
  const daysElapsed = Math.ceil((now.getTime() - periodStart.getTime()) / 86400000);
  const daysRemaining = Math.max(0, Math.ceil((periodEnd.getTime() - now.getTime()) / 86400000));
  const periodPct = Math.min(100, Math.round((daysElapsed / totalDays) * 100));

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
            {(() => {
              const upgradedAt = (subscription?.metadata as any)?.upgraded_at;
              if (!upgradedAt) return null;
              const daysSinceUpgrade = (Date.now() - new Date(upgradedAt).getTime()) / 86400000;
              if (daysSinceUpgrade > 7) return null;
              return (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0 gap-0.5">
                        <Sparkles className="h-2.5 w-2.5" />
                        Đã nâng cấp
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Gói đã được nâng cấp. Hạn mức mới áp dụng ngay, chu kỳ thanh toán giữ nguyên.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })()}
          </CardTitle>
          {hasWarning && (
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          )}
        </div>
        {/* Cycle period info */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {format(periodStart, 'dd/MM', { locale: vi })} – {format(periodEnd, 'dd/MM/yyyy', { locale: vi })}
            </span>
            <span className={cn(
              'font-medium tabular-nums',
              daysRemaining <= 5 ? 'text-destructive' : 'text-muted-foreground'
            )}>
              Còn {daysRemaining} ngày
            </span>
          </div>
          <div className="h-1 w-full rounded-full bg-secondary overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                daysRemaining <= 5 ? 'bg-destructive' : daysRemaining <= 10 ? 'bg-amber-500' : 'bg-muted-foreground/30'
              )}
              style={{ width: `${periodPct}%` }}
            />
          </div>
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
                <span className={cn('font-medium tabular-nums', !isUnlimited && getQuotaTextClass(percentage))}>
                  {item.used}{isUnlimited ? ' / ∞' : ` / ${item.limit}`}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', getQuotaBarClass(percentage))}
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