import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Sparkles,
  ChevronRight,
  X,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { AdjustmentSuggestion } from '@/hooks/useKPIAdjustmentSuggestions';
import { cn } from '@/lib/utils';

interface KPIAdjustmentAlertProps {
  suggestions: AdjustmentSuggestion[];
  overallAssessment: string;
  isLoading: boolean;
  onViewDetails: () => void;
  onApplyAll: () => void;
  onDismissAll: () => void;
  onCheckNow: () => void;
  lastChecked: Date | null;
}

const triggerConfig = {
  overperforming: {
    icon: TrendingUp,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    label: 'Vượt mục tiêu',
  },
  underperforming: {
    icon: TrendingDown,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    label: 'Thiếu hụt',
  },
  anomaly: {
    icon: AlertTriangle,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    label: 'Bất thường',
  },
  on_track: {
    icon: TrendingUp,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    label: 'Đúng tiến độ',
  },
};

const priorityColors = {
  urgent: 'bg-red-100 text-red-700 border-red-200',
  recommended: 'bg-amber-100 text-amber-700 border-amber-200',
  optional: 'bg-blue-100 text-blue-700 border-blue-200',
};

export function KPIAdjustmentAlert({
  suggestions,
  overallAssessment,
  isLoading,
  onViewDetails,
  onApplyAll,
  onDismissAll,
  onCheckNow,
  lastChecked,
}: KPIAdjustmentAlertProps) {
  if (suggestions.length === 0 && !isLoading) {
    return null;
  }

  const urgentCount = suggestions.filter((s) => s.priority === 'urgent').length;
  const hasUrgent = urgentCount > 0;

  // Group by trigger type
  const groupedSuggestions = suggestions.reduce((acc, s) => {
    acc[s.trigger] = acc[s.trigger] || [];
    acc[s.trigger].push(s);
    return acc;
  }, {} as Record<string, AdjustmentSuggestion[]>);

  return (
    <Alert 
      className={cn(
        "mb-6 border-2",
        hasUrgent ? "border-red-300 bg-red-50/50" : "border-primary/20 bg-primary/5"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "p-2 rounded-lg",
          hasUrgent ? "bg-red-100" : "bg-primary/10"
        )}>
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          ) : (
            <Sparkles className={cn("h-5 w-5", hasUrgent ? "text-red-600" : "text-primary")} />
          )}
        </div>

        <div className="flex-1 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <AlertTitle className="text-base font-semibold flex items-center gap-2">
                AI đề xuất điều chỉnh KPI
                {hasUrgent && (
                  <Badge variant="destructive" className="text-xs">
                    {urgentCount} cần xử lý gấp
                  </Badge>
                )}
              </AlertTitle>
              <AlertDescription className="mt-1 text-sm text-muted-foreground">
                {isLoading ? 'Đang phân tích KPI performance...' : overallAssessment}
              </AlertDescription>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={onCheckNow}
                disabled={isLoading}
                className="h-8 px-2"
              >
                <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismissAll}
                className="h-8 px-2"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {!isLoading && suggestions.length > 0 && (
            <>
              {/* Suggestion preview cards */}
              <div className="flex flex-wrap gap-2">
                {suggestions.slice(0, 4).map((suggestion) => {
                  const config = triggerConfig[suggestion.trigger];
                  const TriggerIcon = config.icon;
                  
                  return (
                    <div
                      key={suggestion.metric}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg border",
                        config.bgColor,
                        config.borderColor
                      )}
                    >
                      <TriggerIcon className={cn("h-4 w-4", config.color)} />
                      <div className="text-sm">
                        <span className="font-medium">{suggestion.metric}</span>
                        <span className="text-muted-foreground mx-1">→</span>
                        <span className={cn(
                          "font-semibold",
                          suggestion.changePercent > 0 ? "text-green-600" : "text-red-600"
                        )}>
                          {suggestion.changePercent > 0 ? '+' : ''}{suggestion.changePercent}%
                        </span>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={cn("text-xs", priorityColors[suggestion.priority])}
                      >
                        {suggestion.priority === 'urgent' ? 'Gấp' : 
                         suggestion.priority === 'recommended' ? 'Nên' : 'Tuỳ'}
                      </Badge>
                    </div>
                  );
                })}
                {suggestions.length > 4 && (
                  <div className="flex items-center px-3 py-2 text-sm text-muted-foreground">
                    +{suggestions.length - 4} khác
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 pt-1">
                <Button onClick={onViewDetails} size="sm" className="gap-1">
                  Xem phân tích chi tiết
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button onClick={onApplyAll} variant="outline" size="sm">
                  Áp dụng tất cả
                </Button>
                {lastChecked && (
                  <span className="text-xs text-muted-foreground ml-auto">
                    Kiểm tra lúc {lastChecked.toLocaleTimeString('vi-VN')}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </Alert>
  );
}
