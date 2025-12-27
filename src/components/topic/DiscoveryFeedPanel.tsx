import { useState, useEffect } from 'react';
import { 
  Flame, TrendingUp, Brain, ChevronLeft, ChevronRight,
  RefreshCw, Zap, Target, ArrowRight, Sparkles, Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { useTrendingTopics, TrendingTopic } from '@/hooks/useTrendingTopics';
import { cn } from '@/lib/utils';

interface AILearningStats {
  totalFeedback: number;
  positiveFeedback: number;
  negativeFeedback: number;
  personalizationLevel: number;
  topPatterns: string[];
}

interface DiscoveryFeedPanelProps {
  brandTemplateId?: string;
  aiLearningStats: AILearningStats;
  onInjectPrompt: (prompt: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const peakStatusConfig: Record<string, { label: string; color: string }> = {
  'rising': { label: '📈', color: 'text-emerald-500' },
  'peaking': { label: '🔥', color: 'text-orange-500' },
  'declining': { label: '📉', color: 'text-muted-foreground' },
};

export function DiscoveryFeedPanel({
  brandTemplateId,
  aiLearningStats,
  onInjectPrompt,
  isCollapsed = false,
  onToggleCollapse,
}: DiscoveryFeedPanelProps) {
  const { 
    topics, 
    isLoading, 
    fetchTrendingTopics, 
    refresh 
  } = useTrendingTopics({ brandTemplateId });

  useEffect(() => {
    if (!isCollapsed) {
      fetchTrendingTopics();
    }
  }, [fetchTrendingTopics, isCollapsed]);

  const handleTrendClick = (topic: TrendingTopic) => {
    const angles = topic.suggested_angles?.join(', ') || '';
    onInjectPrompt(`Gợi ý góc tiếp cận cho trend: "${topic.topic}"${angles ? `. Các góc gợi ý: ${angles}` : ''}`);
  };

  const sortedTopics = [...topics].sort((a, b) => b.velocity_score - a.velocity_score);
  const hotTopics = sortedTopics.filter(t => t.velocity_score >= 60).slice(0, 5);

  const getLevelLabel = (level: number) => {
    if (level >= 80) return { label: 'Rất cao', color: 'text-emerald-500' };
    if (level >= 60) return { label: 'Cao', color: 'text-blue-500' };
    if (level >= 40) return { label: 'Trung bình', color: 'text-amber-500' };
    if (level >= 20) return { label: 'Đang học', color: 'text-orange-500' };
    return { label: 'Mới bắt đầu', color: 'text-muted-foreground' };
  };

  const levelInfo = getLevelLabel(aiLearningStats.personalizationLevel);

  // Collapsed state
  if (isCollapsed) {
    return (
      <TooltipProvider>
        <div className="flex flex-col items-center py-4 space-y-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onToggleCollapse}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Mở Discovery Feed</TooltipContent>
          </Tooltip>
          
          {hotTopics.length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-1.5 rounded-lg bg-orange-500/10 animate-pulse">
                  <Flame className="w-4 h-4 text-orange-500" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="left">{hotTopics.length} trending hot</TooltipContent>
            </Tooltip>
          )}
          
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="p-1.5 rounded-lg bg-violet-500/10">
                <Brain className="w-4 h-4 text-violet-500" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="left">AI: {levelInfo.label}</TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    );
  }

  return (
    <div className="h-full flex flex-col bg-card/50 border-l border-border/50">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-orange-500" />
          <span className="text-sm font-medium">Discovery</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => refresh()}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onToggleCollapse}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 p-3">
        {/* Hot Trends Section */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Flame className="w-3.5 h-3.5 text-orange-500" />
            <span className="text-xs font-medium">Trending Hot</span>
            {isLoading && <Skeleton className="h-3 w-3 rounded-full" />}
          </div>
          
          {isLoading && topics.length === 0 ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : hotTopics.length > 0 ? (
            <div className="space-y-1.5">
              {hotTopics.map((topic) => {
                const peakStatus = peakStatusConfig[topic.peak_status] || peakStatusConfig['rising'];
                return (
                  <button
                    key={topic.id}
                    className="w-full text-left p-2 rounded-lg hover:bg-muted/80 transition-colors group border border-transparent hover:border-orange-500/20"
                    onClick={() => handleTrendClick(topic)}
                  >
                    <div className="flex items-start gap-2">
                      <span className={cn("text-sm", peakStatus.color)}>{peakStatus.label}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium line-clamp-2 group-hover:text-primary transition-colors">
                          {topic.topic}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex items-center gap-1">
                            <div className="w-8 h-1 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full"
                                style={{ width: `${topic.velocity_score}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-muted-foreground">{topic.velocity_score}</span>
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-4">
              <Sparkles className="w-6 h-6 mx-auto mb-2 text-muted-foreground/30" />
              <p className="text-[10px] text-muted-foreground">
                Click refresh để khám phá xu hướng
              </p>
            </div>
          )}
        </div>

        {/* AI Learning Status */}
        <div className="pt-3 border-t border-border/50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Brain className="w-3.5 h-3.5 text-violet-500" />
              <span className="text-xs font-medium">AI Learning</span>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-3 h-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-[180px]">
                  <p className="text-[10px]">
                    AI học từ feedback để cá nhân hóa gợi ý
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Personalization Level */}
          <div className="space-y-1.5 mb-3">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-muted-foreground">Mức cá nhân hóa</span>
              <span className={cn('font-medium', levelInfo.color)}>
                {levelInfo.label}
              </span>
            </div>
            <Progress value={aiLearningStats.personalizationLevel} className="h-1.5" />
          </div>

          {/* Feedback Stats */}
          {aiLearningStats.totalFeedback > 0 && (
            <div className="p-2 rounded-lg bg-muted/50 mb-3">
              <div className="flex items-center justify-between text-[10px] mb-1">
                <span className="text-muted-foreground">Feedback</span>
                <span className="font-medium">{aiLearningStats.totalFeedback}</span>
              </div>
              <div className="flex items-center gap-3 text-[10px]">
                <span className="text-emerald-500">👍 {aiLearningStats.positiveFeedback}</span>
                <span className="text-red-500">👎 {aiLearningStats.negativeFeedback}</span>
              </div>
            </div>
          )}

          {/* Top Patterns */}
          {aiLearningStats.topPatterns.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Bạn thích:
              </p>
              <div className="flex flex-wrap gap-1">
                {aiLearningStats.topPatterns.slice(0, 3).map((pattern, idx) => (
                  <Badge key={idx} variant="outline" className="text-[9px] px-1.5 py-0">
                    {pattern}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
