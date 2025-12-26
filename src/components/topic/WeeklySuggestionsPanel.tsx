import { useState } from 'react';
import { 
  CalendarDays, RefreshCw, Sparkles, ArrowRight,
  Target, FileText, Star, ChevronDown, ChevronUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useTopicRecommendations, WeeklyPlanItem } from '@/hooks/useTopicRecommendations';
import { TopicCreditsAlert } from './TopicCreditsAlert';
import { ContentGoal } from '@/types/multichannel';
import { cn } from '@/lib/utils';

interface WeeklySuggestionsPanelProps {
  brandTemplateId?: string;
  contentGoal?: ContentGoal;
  onSelectTopic: (topic: string) => void;
  onScheduleTopic?: (topic: string, day: string) => void;
}

const dayColors: Record<string, string> = {
  'Thứ 2': 'bg-blue-500',
  'Thứ 3': 'bg-emerald-500',
  'Thứ 4': 'bg-amber-500',
  'Thứ 5': 'bg-violet-500',
  'Thứ 6': 'bg-rose-500',
  'Thứ 7': 'bg-cyan-500',
  'Chủ nhật': 'bg-orange-500',
  'Monday': 'bg-blue-500',
  'Tuesday': 'bg-emerald-500',
  'Wednesday': 'bg-amber-500',
  'Thursday': 'bg-violet-500',
  'Friday': 'bg-rose-500',
  'Saturday': 'bg-cyan-500',
  'Sunday': 'bg-orange-500',
};

const formatLabels: Record<string, string> = {
  post: 'Bài viết',
  video: 'Video',
  carousel: 'Carousel',
  story: 'Story',
  reel: 'Reel',
  article: 'Bài dài',
  infographic: 'Infographic',
};

export function WeeklySuggestionsPanel({
  brandTemplateId,
  contentGoal,
  onSelectTopic,
  onScheduleTopic,
}: WeeklySuggestionsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const { 
    weeklyPlan, 
    getWeeklyPlan, 
    isLoading,
    error,
    errorCode,
  } = useTopicRecommendations({ brandTemplateId, contentGoal });

  const handleGenerate = async () => {
    await getWeeklyPlan();
  };

  const getPriorityBadge = (priority: number) => {
    if (priority >= 8) return { label: 'Ưu tiên cao', variant: 'destructive' as const };
    if (priority >= 5) return { label: 'Trung bình', variant: 'secondary' as const };
    return { label: 'Thấp', variant: 'outline' as const };
  };

  const showCreditsError = errorCode === 'CREDITS_EXHAUSTED' || errorCode === 'RATE_LIMIT';

  return (
    <Card className="gradient-card border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600">
              <CalendarDays className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base">Kế hoạch tuần</CardTitle>
              <CardDescription className="text-xs">
                5-7 topics được AI đề xuất cho tuần này
              </CardDescription>
            </div>
          </div>
          <Button
            onClick={handleGenerate}
            disabled={isLoading}
            size="sm"
            className="gap-2"
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {weeklyPlan ? 'Tạo lại' : 'Tạo kế hoạch'}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : showCreditsError ? (
          <TopicCreditsAlert 
            errorCode={errorCode || undefined} 
            errorMessage={error || undefined}
            onRetry={errorCode === 'RATE_LIMIT' ? handleGenerate : undefined}
          />
        ) : !weeklyPlan ? (
          <div className="text-center py-8">
            <CalendarDays className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground mb-1">
              Chưa có kế hoạch tuần
            </p>
            <p className="text-xs text-muted-foreground">
              AI sẽ tạo 5-7 topics cho từng ngày trong tuần
            </p>
          </div>
        ) : (
          <>
            {/* Week Theme */}
            {weeklyPlan.weekTheme && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-2 mb-1">
                  <Star className="w-4 h-4 text-primary" />
                  <span className="text-xs font-medium text-primary">Chủ đề tuần</span>
                </div>
                <p className="text-sm">{weeklyPlan.weekTheme}</p>
              </div>
            )}

            {/* Daily Topics */}
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between h-auto py-2">
                  <span className="text-sm font-medium">
                    {weeklyPlan.weeklyPlan.length} topics trong tuần
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
              </CollapsibleTrigger>

              <CollapsibleContent className="space-y-2 mt-2">
                {weeklyPlan.weeklyPlan.map((item, index) => {
                  const dayColor = dayColors[item.day] || 'bg-muted';
                  const priorityBadge = getPriorityBadge(item.priority);

                  return (
                    <div
                      key={index}
                      className="p-3 rounded-lg border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all cursor-pointer group"
                      onClick={() => onSelectTopic(item.topic)}
                    >
                      <div className="flex items-start gap-3">
                        {/* Day indicator */}
                        <div className={cn(
                          'w-12 h-12 rounded-lg flex flex-col items-center justify-center shrink-0',
                          dayColor
                        )}>
                          <span className="text-[10px] text-white/80 font-medium">
                            {item.day.slice(0, 3)}
                          </span>
                          <span className="text-lg font-bold text-white">
                            {index + 1}
                          </span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium text-sm group-hover:text-primary transition-colors">
                              {item.topic}
                            </p>
                            <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                          </div>

                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                            {item.reason}
                          </p>

                          <div className="flex flex-wrap gap-1.5 mt-2">
                            <Badge variant="outline" className="text-[10px] h-5">
                              <Target className="w-2.5 h-2.5 mr-1" />
                              {item.pillar}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] h-5">
                              <FileText className="w-2.5 h-2.5 mr-1" />
                              {formatLabels[item.format] || item.format}
                            </Badge>
                            <Badge variant={priorityBadge.variant} className="text-[10px] h-5">
                              {priorityBadge.label}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CollapsibleContent>
            </Collapsible>

            {/* Insights */}
            {weeklyPlan.insights && (
              <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                <p className="text-xs font-medium text-muted-foreground mb-1">💡 Insights</p>
                <p className="text-sm">{weeklyPlan.insights}</p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
