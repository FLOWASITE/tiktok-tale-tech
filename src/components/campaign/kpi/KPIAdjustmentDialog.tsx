import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Target,
  ArrowRight,
  Lightbulb,
  Clock,
  CheckCircle2,
  XCircle,
  Sparkles,
} from 'lucide-react';
import { AdjustmentSuggestion } from '@/hooks/useKPIAdjustmentSuggestions';
import { cn } from '@/lib/utils';

interface KPIAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestions: AdjustmentSuggestion[];
  overallAssessment: string;
  actionItems: string[];
  onApply: (selectedMetrics: string[]) => void;
  onDismiss: (metric: string) => void;
  campaignName: string;
  timeProgress: number;
}

const triggerConfig = {
  overperforming: {
    icon: TrendingUp,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    label: 'Vượt mục tiêu',
    description: 'Performance đang cao hơn kỳ vọng',
  },
  underperforming: {
    icon: TrendingDown,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    label: 'Thiếu hụt',
    description: 'Performance thấp hơn kỳ vọng',
  },
  anomaly: {
    icon: AlertTriangle,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    label: 'Bất thường',
    description: 'Có biến động đột ngột',
  },
  on_track: {
    icon: Target,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    label: 'Đúng tiến độ',
    description: 'Đang trong phạm vi mục tiêu',
  },
};

const confidenceConfig = {
  high: { label: 'Cao', color: 'bg-green-100 text-green-700' },
  medium: { label: 'Trung bình', color: 'bg-amber-100 text-amber-700' },
  low: { label: 'Thấp', color: 'bg-gray-100 text-gray-700' },
};

const priorityConfig = {
  urgent: { label: 'Cần xử lý gấp', color: 'bg-red-100 text-red-700' },
  recommended: { label: 'Khuyến nghị', color: 'bg-amber-100 text-amber-700' },
  optional: { label: 'Tuỳ chọn', color: 'bg-blue-100 text-blue-700' },
};

export function KPIAdjustmentDialog({
  open,
  onOpenChange,
  suggestions,
  overallAssessment,
  actionItems,
  onApply,
  onDismiss,
  campaignName,
  timeProgress,
}: KPIAdjustmentDialogProps) {
  const [selectedMetrics, setSelectedMetrics] = useState<Set<string>>(
    new Set(suggestions.map((s) => s.metric))
  );

  const toggleMetric = (metric: string) => {
    const newSelected = new Set(selectedMetrics);
    if (newSelected.has(metric)) {
      newSelected.delete(metric);
    } else {
      newSelected.add(metric);
    }
    setSelectedMetrics(newSelected);
  };

  const selectAll = () => {
    setSelectedMetrics(new Set(suggestions.map((s) => s.metric)));
  };

  const deselectAll = () => {
    setSelectedMetrics(new Set());
  };

  const handleApply = () => {
    onApply(Array.from(selectedMetrics));
    onOpenChange(false);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString('vi-VN');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Phân tích & Đề xuất điều chỉnh KPI
          </DialogTitle>
          <DialogDescription>{campaignName}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 py-4">
            {/* Campaign Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Tiến độ campaign
                </span>
                <span className="font-medium">{timeProgress.toFixed(0)}%</span>
              </div>
              <Progress value={timeProgress} className="h-2" />
            </div>

            {/* Overall Assessment */}
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Lightbulb className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium mb-1">Đánh giá tổng quan</h4>
                  <p className="text-sm text-muted-foreground">{overallAssessment}</p>
                </div>
              </div>
            </div>

            {/* Suggestions */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Đề xuất điều chỉnh ({suggestions.length})</h4>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={selectAll}>
                    Chọn tất cả
                  </Button>
                  <Button variant="ghost" size="sm" onClick={deselectAll}>
                    Bỏ chọn
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {suggestions.map((suggestion) => {
                  const config = triggerConfig[suggestion.trigger];
                  const TriggerIcon = config.icon;
                  const isSelected = selectedMetrics.has(suggestion.metric);

                  return (
                    <div
                      key={suggestion.metric}
                      className={cn(
                        "p-4 rounded-lg border-2 transition-colors",
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border bg-card hover:border-primary/50"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleMetric(suggestion.metric)}
                          className="mt-1"
                        />

                        <div className="flex-1 space-y-3">
                          {/* Header */}
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <div className={cn("p-1.5 rounded", config.bgColor)}>
                                <TriggerIcon className={cn("h-4 w-4", config.color)} />
                              </div>
                              <div>
                                <span className="font-medium">{suggestion.metric}</span>
                                <Badge
                                  variant="outline"
                                  className={cn("ml-2 text-xs", priorityConfig[suggestion.priority].color)}
                                >
                                  {priorityConfig[suggestion.priority].label}
                                </Badge>
                              </div>
                            </div>
                            <Badge
                              variant="outline"
                              className={cn("text-xs", confidenceConfig[suggestion.confidence].color)}
                            >
                              Độ tin cậy: {confidenceConfig[suggestion.confidence].label}
                            </Badge>
                          </div>

                          {/* Values comparison */}
                          <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-1">
                              <span className="text-xs text-muted-foreground">Hiện tại</span>
                              <div className="font-semibold">
                                {formatNumber(suggestion.currentValue)}
                              </div>
                              <Progress
                                value={Math.min(100, suggestion.achievementRate)}
                                className="h-1.5"
                              />
                              <span className="text-xs text-muted-foreground">
                                {suggestion.achievementRate.toFixed(0)}% mục tiêu
                              </span>
                            </div>

                            <div className="flex items-center justify-center">
                              <ArrowRight className="h-5 w-5 text-muted-foreground" />
                            </div>

                            <div className="space-y-1">
                              <span className="text-xs text-muted-foreground">Đề xuất</span>
                              <div className="flex items-baseline gap-2">
                                <span className="font-semibold">
                                  {formatNumber(suggestion.suggestedTarget)}
                                </span>
                                <span
                                  className={cn(
                                    "text-sm font-medium",
                                    suggestion.changePercent > 0 ? "text-green-600" : "text-red-600"
                                  )}
                                >
                                  ({suggestion.changePercent > 0 ? "+" : ""}
                                  {suggestion.changePercent}%)
                                </span>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                từ {formatNumber(suggestion.currentTarget)}
                              </span>
                            </div>
                          </div>

                          {/* Reason */}
                          <div className="text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">Lý do: </span>
                            {suggestion.reason}
                          </div>

                          {/* Risk note */}
                          {suggestion.riskNote && (
                            <div className="flex items-start gap-2 p-2 rounded bg-amber-50 text-amber-800 text-sm">
                              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                              {suggestion.riskNote}
                            </div>
                          )}

                          {/* Projected value */}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>
                              📊 Dự kiến cuối campaign: {formatNumber(suggestion.projectedEndValue)}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs"
                              onClick={() => onDismiss(suggestion.metric)}
                            >
                              Ẩn 24h
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Items */}
            {actionItems.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Hành động được đề xuất
                  </h4>
                  <ul className="space-y-2">
                    {actionItems.map((item, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <span className="text-muted-foreground">{index + 1}.</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
          <Button
            onClick={handleApply}
            disabled={selectedMetrics.size === 0}
            className="gap-2"
          >
            <Target className="h-4 w-4" />
            Áp dụng {selectedMetrics.size} điều chỉnh
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
