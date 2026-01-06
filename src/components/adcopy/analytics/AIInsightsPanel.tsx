import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Lightbulb,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Info,
  RefreshCw,
  X,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AIInsight } from '@/hooks/useAIInsights';

interface AIInsightsPanelProps {
  insights: AIInsight[];
  isLoading?: boolean;
  onDismiss?: (insightId: string) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

const INSIGHT_TYPE_CONFIG = {
  trend: {
    icon: TrendingUp,
    label: 'Xu hướng',
    color: 'text-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
  },
  anomaly: {
    icon: AlertTriangle,
    label: 'Bất thường',
    color: 'text-orange-500',
    bg: 'bg-orange-50 dark:bg-orange-950/30',
  },
  recommendation: {
    icon: Lightbulb,
    label: 'Đề xuất',
    color: 'text-purple-500',
    bg: 'bg-purple-50 dark:bg-purple-950/30',
  },
  forecast: {
    icon: Sparkles,
    label: 'Dự báo',
    color: 'text-cyan-500',
    bg: 'bg-cyan-50 dark:bg-cyan-950/30',
  },
};

const SEVERITY_CONFIG = {
  critical: {
    icon: AlertTriangle,
    color: 'text-red-500',
    borderColor: 'border-l-red-500',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-yellow-500',
    borderColor: 'border-l-yellow-500',
  },
  success: {
    icon: CheckCircle,
    color: 'text-green-500',
    borderColor: 'border-l-green-500',
  },
  info: {
    icon: Info,
    color: 'text-blue-500',
    borderColor: 'border-l-blue-500',
  },
};

function InsightCard({
  insight,
  onDismiss,
}: {
  insight: AIInsight;
  onDismiss?: (id: string) => void;
}) {
  const typeConfig = INSIGHT_TYPE_CONFIG[insight.insightType];
  const severityConfig = SEVERITY_CONFIG[insight.severity];
  const TypeIcon = typeConfig.icon;

  return (
    <div
      className={cn(
        'relative p-4 rounded-lg border-l-4 transition-colors',
        typeConfig.bg,
        severityConfig.borderColor
      )}
    >
      {onDismiss && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-6 w-6"
          onClick={() => onDismiss(insight.id)}
        >
          <X className="h-3 w-3" />
        </Button>
      )}

      <div className="flex items-start gap-3">
        <div className={cn('p-2 rounded-full', typeConfig.bg)}>
          <TypeIcon className={cn('h-4 w-4', typeConfig.color)} />
        </div>
        <div className="flex-1 min-w-0 pr-6">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-xs">
              {typeConfig.label}
            </Badge>
            {insight.actionImpactEstimate && (
              <Badge variant="secondary" className="text-xs">
                +{insight.actionImpactEstimate}% dự kiến
              </Badge>
            )}
          </div>
          <h4 className="font-medium text-sm mb-1">{insight.title}</h4>
          <p className="text-sm text-muted-foreground">{insight.description}</p>
          {insight.suggestedAction && (
            <p className="text-sm mt-2 font-medium text-primary">
              💡 {insight.suggestedAction}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function AIInsightsPanel({
  insights,
  isLoading,
  onDismiss,
  onRefresh,
  isRefreshing,
}: AIInsightsPanelProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 animate-pulse bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Insights
        </CardTitle>
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', isRefreshing && 'animate-spin')} />
            Làm mới
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {!insights.length ? (
          <div className="text-center py-8">
            <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Chưa có insights</p>
            <p className="text-sm text-muted-foreground mt-1">
              Nhấn "Làm mới" để tạo insights từ dữ liệu của bạn
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {insights.map((insight) => (
              <InsightCard
                key={insight.id}
                insight={insight}
                onDismiss={onDismiss}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
