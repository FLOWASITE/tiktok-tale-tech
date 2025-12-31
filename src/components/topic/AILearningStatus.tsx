import { Brain, ThumbsUp, ThumbsDown, TrendingUp, Sparkles, Info, BarChart3, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface AILearningStatusProps {
  totalFeedback: number;
  positiveFeedback: number;
  negativeFeedback: number;
  topPatterns?: string[];
  personalizationLevel: number; // 0-100
  isLearning?: boolean;
  isLoading?: boolean;
  // Enhanced performance data
  publishedCount?: number;
  averagePerformance?: number;
  totalEngagement?: {
    likes: number;
    comments: number;
    shares: number;
    views: number;
  };
}

export function AILearningStatus({
  totalFeedback,
  positiveFeedback,
  negativeFeedback,
  topPatterns = [],
  personalizationLevel,
  isLearning,
  isLoading,
  publishedCount = 0,
  averagePerformance = 0,
  totalEngagement,
}: AILearningStatusProps) {
  const positiveRate = totalFeedback > 0 
    ? Math.round((positiveFeedback / totalFeedback) * 100) 
    : 0;

  const hasPerformanceData = publishedCount > 0 && averagePerformance > 0;

  const getLevelLabel = (level: number) => {
    if (level >= 80) return { label: 'Rất cao', color: 'text-emerald-500' };
    if (level >= 60) return { label: 'Cao', color: 'text-blue-500' };
    if (level >= 40) return { label: 'Trung bình', color: 'text-amber-500' };
    if (level >= 20) return { label: 'Đang học', color: 'text-orange-500' };
    return { label: 'Mới bắt đầu', color: 'text-muted-foreground' };
  };

  const levelInfo = getLevelLabel(personalizationLevel);

  // Loading state
  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-4 rounded-full" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
          <div className="p-3 rounded-lg bg-muted/50 space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-8" />
            </div>
            <div className="flex items-center gap-4">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-12" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Brain className={cn('w-4 h-4 text-violet-500', isLearning && 'animate-pulse')} />
            AI Learning
            {isLearning && (
              <Badge variant="secondary" className="text-xs animate-pulse">
                Đang học...
              </Badge>
            )}
          </CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-3.5 h-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-[200px]">
                <p className="text-xs">
                  AI học từ feedback và lịch sử sử dụng của bạn để cá nhân hóa gợi ý tốt hơn.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Personalization Level */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Mức cá nhân hóa</span>
            <span className={cn('font-medium', levelInfo.color)}>
              {levelInfo.label}
            </span>
          </div>
          <Progress value={personalizationLevel} className="h-2" />
          <p className="text-[10px] text-muted-foreground">
            {personalizationLevel < 40 
              ? 'Tiếp tục sử dụng và feedback để AI hiểu bạn hơn'
              : personalizationLevel < 70
              ? 'AI đang học pattern của bạn khá tốt'
              : 'AI đã hiểu rõ sở thích của bạn'}
          </p>
        </div>

        {/* Performance Data - NEW */}
        {hasPerformanceData && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              <BarChart3 className="w-3.5 h-3.5" />
              Dữ liệu thực tế
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Đã publish:</span>
                <span className="font-medium ml-1">{publishedCount}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Score TB:</span>
                <span className={cn('font-medium ml-1', averagePerformance >= 70 ? 'text-emerald-500' : averagePerformance >= 50 ? 'text-amber-500' : 'text-red-500')}>
                  {averagePerformance}
                </span>
              </div>
            </div>
            {totalEngagement && (totalEngagement.views > 0 || totalEngagement.likes > 0) && (
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-1 border-t border-emerald-500/10">
                <div className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {totalEngagement.views.toLocaleString()}
                </div>
                <div className="flex items-center gap-1">
                  <ThumbsUp className="w-3 h-3" />
                  {totalEngagement.likes.toLocaleString()}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Feedback Summary */}
        {totalFeedback > 0 && (
          <div className="p-3 rounded-lg bg-muted/50 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Feedback đã gửi</span>
              <span className="font-medium">{totalFeedback}</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-xs">
                <ThumbsUp className="w-3.5 h-3.5 text-emerald-500" />
                <span className="font-medium text-emerald-500">{positiveFeedback}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <ThumbsDown className="w-3.5 h-3.5 text-red-500" />
                <span className="font-medium text-red-500">{negativeFeedback}</span>
              </div>
              <div className="ml-auto text-xs text-muted-foreground">
                {positiveRate}% hữu ích
              </div>
            </div>
          </div>
        )}

        {/* Top Patterns */}
        {topPatterns.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <TrendingUp className="w-3 h-3" />
              AI đã nhận ra bạn thích:
            </div>
            <div className="flex flex-wrap gap-1">
              {topPatterns.slice(0, 4).map((pattern, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {pattern}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {totalFeedback === 0 && !hasPerformanceData && (
          <div className="text-center py-4">
            <Sparkles className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">
              Bắt đầu feedback để AI học sở thích của bạn
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
