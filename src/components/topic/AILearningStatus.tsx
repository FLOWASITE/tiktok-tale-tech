import { Brain, ThumbsUp, ThumbsDown, TrendingUp, Sparkles, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface AILearningStatusProps {
  totalFeedback: number;
  positiveFeedback: number;
  negativeFeedback: number;
  topPatterns?: string[];
  personalizationLevel: number; // 0-100
  isLearning?: boolean;
}

export function AILearningStatus({
  totalFeedback,
  positiveFeedback,
  negativeFeedback,
  topPatterns = [],
  personalizationLevel,
  isLearning,
}: AILearningStatusProps) {
  const positiveRate = totalFeedback > 0 
    ? Math.round((positiveFeedback / totalFeedback) * 100) 
    : 0;

  const getLevelLabel = (level: number) => {
    if (level >= 80) return { label: 'Rất cao', color: 'text-emerald-500' };
    if (level >= 60) return { label: 'Cao', color: 'text-blue-500' };
    if (level >= 40) return { label: 'Trung bình', color: 'text-amber-500' };
    if (level >= 20) return { label: 'Đang học', color: 'text-orange-500' };
    return { label: 'Mới bắt đầu', color: 'text-muted-foreground' };
  };

  const levelInfo = getLevelLabel(personalizationLevel);

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
        {totalFeedback === 0 && (
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
