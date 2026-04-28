import { Sparkles, RefreshCw, TrendingUp, AlertTriangle, Lightbulb, Award } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import type { ReportInsightCard, ReportInsightsResult } from '@/hooks/reports/useReportInsights';
import { InsightsError } from '@/hooks/reports/useReportInsights';

interface Props {
  data?: ReportInsightsResult;
  isLoading: boolean;
  isRefreshing: boolean;
  error?: unknown;
  onRefresh: () => void;
}

const TYPE_ICON: Record<ReportInsightCard['type'], React.ComponentType<{ className?: string }>> = {
  trend: TrendingUp,
  anomaly: AlertTriangle,
  recommendation: Lightbulb,
  highlight: Award,
};

const SEVERITY_STYLES: Record<ReportInsightCard['severity'], { ring: string; badge: 'default' | 'secondary' | 'destructive' | 'outline'; iconBg: string }> = {
  info: { ring: 'border-l-2 border-l-muted-foreground/30', badge: 'secondary', iconBg: 'bg-muted text-muted-foreground' },
  success: { ring: 'border-l-2 border-l-emerald-500', badge: 'default', iconBg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' },
  warning: { ring: 'border-l-2 border-l-amber-500', badge: 'outline', iconBg: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' },
  critical: { ring: 'border-l-2 border-l-rose-500', badge: 'destructive', iconBg: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400' },
};

export function AIInsightsPanel({ data, isLoading, isRefreshing, error, onRefresh }: Props) {
  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <div>
            <p className="text-sm font-medium">AI Insights</p>
            <p className="text-xs text-muted-foreground">
              {data?.generatedAt
                ? `Tạo ${formatDistanceToNow(new Date(data.generatedAt), { addSuffix: true, locale: vi })} · cache 1h`
                : 'Phân tích tự động dựa trên dữ liệu báo cáo'}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" disabled={isRefreshing || isLoading} onClick={onRefresh}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Tạo lại
        </Button>
      </Card>

      {error ? (
        (() => {
          const errMsg = error instanceof Error ? error.message : 'Lỗi không xác định';
          const code = error instanceof InsightsError ? error.errorCode : undefined;
          const isCredits = code === 'AI_CREDITS_EXHAUSTED';
          return (
            <Card className={`p-6 text-sm ${isCredits ? 'border-amber-300 bg-amber-50/40 text-amber-900 dark:bg-amber-950/20 dark:text-amber-200' : 'text-rose-600'}`}>
              <p className="font-medium">{isCredits ? 'Đã hết AI credits' : 'Không thể tạo insights'}</p>
              <p className="mt-1 text-xs opacity-80">{errMsg}</p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" onClick={onRefresh} disabled={isRefreshing}>
                  <RefreshCw className={`mr-2 h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Thử lại
                </Button>
                {isCredits && (
                  <Button size="sm" onClick={() => (window.location.href = '/settings/billing')}>
                    Nâng cấp gói
                  </Button>
                )}
              </div>
            </Card>
          );
        })()
      ) : isLoading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : !data ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          Chưa có insights. Bấm "Tạo lại" để bắt đầu phân tích.
        </Card>
      ) : (
        <>
          {data.summary && (
            <Card className="bg-gradient-to-br from-primary/5 to-transparent p-4">
              <p className="text-sm leading-relaxed">{data.summary}</p>
            </Card>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            {data.insights.map((insight, idx) => {
              const Icon = TYPE_ICON[insight.type] ?? Lightbulb;
              const styles = SEVERITY_STYLES[insight.severity] ?? SEVERITY_STYLES.info;
              return (
                <Card key={idx} className={`p-4 ${styles.ring}`}>
                  <div className="flex items-start gap-3">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${styles.iconBg}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-semibold leading-tight">{insight.title}</h4>
                        <Badge variant={styles.badge} className="shrink-0 text-[10px] uppercase tracking-wide">
                          {insight.type}
                        </Badge>
                      </div>
                      <p className="text-xs leading-relaxed text-muted-foreground">{insight.description}</p>
                      {insight.action && (
                        <div className="mt-2 rounded-md bg-muted/50 p-2 text-xs">
                          <span className="font-medium">Gợi ý: </span>
                          {insight.action}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
