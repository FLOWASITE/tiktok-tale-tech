import { useState, useEffect, useMemo } from 'react';
import { 
  Flame, TrendingUp, Brain, ChevronLeft, ChevronRight,
  RefreshCw, Zap, ArrowRight, Sparkles, Info, Lightbulb,
  CalendarDays, Target, Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useTrendingTopics, TrendingTopic } from '@/hooks/useTrendingTopics';
import { useTopicRecommendations } from '@/hooks/useTopicRecommendations';
import { useEnhancedTopicSuggestions } from '@/hooks/useEnhancedTopicSuggestions';
import { SEASONAL_EVENTS } from '@/types/topicDiscovery';
import { ContentGoal } from '@/types/multichannel';
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
  contentGoal?: ContentGoal;
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
  contentGoal = 'engagement',
  aiLearningStats,
  onInjectPrompt,
  isCollapsed = false,
  onToggleCollapse,
}: DiscoveryFeedPanelProps) {
  const [sectionsOpen, setSectionsOpen] = useState({
    trending: true,
    nextBest: true,
    quickTopics: true,
    seasonal: true,
    aiLearning: false,
  });

  const { 
    topics, 
    isLoading: trendingLoading, 
    fetchTrendingTopics, 
    refresh 
  } = useTrendingTopics({ brandTemplateId });

  const {
    nextBest,
    isLoading: nextBestLoading,
    getNextBestTopic,
  } = useTopicRecommendations({ brandTemplateId, contentGoal });

  const {
    suggestions: quickSuggestions,
    isLoading: suggestionsLoading,
    refresh: refreshSuggestions,
  } = useEnhancedTopicSuggestions({
    brandTemplateId,
    contentGoal,
    enabled: !!brandTemplateId && !isCollapsed,
  });

  useEffect(() => {
    if (!isCollapsed && brandTemplateId) {
      fetchTrendingTopics();
    }
  }, [fetchTrendingTopics, isCollapsed, brandTemplateId]);

  const handleTrendClick = (topic: TrendingTopic) => {
    const angles = topic.suggested_angles?.join(', ') || '';
    onInjectPrompt(`Gợi ý góc tiếp cận cho trend: "${topic.topic}"${angles ? `. Các góc gợi ý: ${angles}` : ''}`);
  };

  const handleQuickTopicClick = (topic: string) => {
    onInjectPrompt(`Gợi ý content chi tiết về: "${topic}"`);
  };

  const handleSeasonalClick = (eventName: string) => {
    onInjectPrompt(`Gợi ý content cho sự kiện: ${eventName}`);
  };

  const sortedTopics = [...topics].sort((a, b) => b.velocity_score - a.velocity_score);
  const hotTopics = sortedTopics.filter(t => t.velocity_score >= 60).slice(0, 5);

  // Get top 5 quick suggestions
  const topQuickSuggestions = useMemo(() => 
    quickSuggestions.slice(0, 5), [quickSuggestions]);

  // Get upcoming seasonal events
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return SEASONAL_EVENTS.filter(e => e.date > now)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 3);
  }, []);

  const getLevelLabel = (level: number) => {
    if (level >= 80) return { label: 'Rất cao', color: 'text-emerald-500' };
    if (level >= 60) return { label: 'Cao', color: 'text-blue-500' };
    if (level >= 40) return { label: 'Trung bình', color: 'text-amber-500' };
    if (level >= 20) return { label: 'Đang học', color: 'text-orange-500' };
    return { label: 'Mới bắt đầu', color: 'text-muted-foreground' };
  };

  const levelInfo = getLevelLabel(aiLearningStats.personalizationLevel);
  const isLoading = trendingLoading || nextBestLoading || suggestionsLoading;

  const toggleSection = (section: keyof typeof sectionsOpen) => {
    setSectionsOpen(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleRefreshAll = () => {
    refresh();
    refreshSuggestions();
    if (brandTemplateId) {
      getNextBestTopic();
    }
  };

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

          {nextBest && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-1.5 rounded-lg bg-emerald-500/10">
                  <Zap className="w-4 h-4 text-emerald-500" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="left">Next Best Topic</TooltipContent>
            </Tooltip>
          )}

          {topQuickSuggestions.length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Lightbulb className="w-4 h-4 text-primary" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="left">{topQuickSuggestions.length} gợi ý</TooltipContent>
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
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Discovery</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleRefreshAll}
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
        <div className="space-y-3">
          {/* Hot Trends Section */}
          <Collapsible open={sectionsOpen.trending} onOpenChange={() => toggleSection('trending')}>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-1 hover:bg-muted/50 rounded px-1 -mx-1">
              <div className="flex items-center gap-2">
                <Flame className="w-3.5 h-3.5 text-orange-500" />
                <span className="text-xs font-medium">Trending Hot</span>
                {trendingLoading && <Skeleton className="h-3 w-3 rounded-full" />}
              </div>
              <Badge variant="secondary" className="h-4 px-1 text-[9px]">{hotTopics.length}</Badge>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              {trendingLoading && topics.length === 0 ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-lg" />
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
                <div className="text-center py-3">
                  <p className="text-[10px] text-muted-foreground">
                    Nhấn refresh để khám phá
                  </p>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Next Best Topic Section */}
          <Collapsible open={sectionsOpen.nextBest} onOpenChange={() => toggleSection('nextBest')}>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-1 hover:bg-muted/50 rounded px-1 -mx-1">
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-xs font-medium">Next Best</span>
                {nextBestLoading && <Skeleton className="h-3 w-3 rounded-full" />}
              </div>
              <Target className="w-3 h-3 text-muted-foreground" />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              {nextBestLoading ? (
                <Skeleton className="h-16 w-full rounded-lg" />
              ) : nextBest ? (
                <button
                  className="w-full text-left p-2.5 rounded-lg bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 hover:border-emerald-500/40 transition-colors group"
                  onClick={() => onInjectPrompt(`Gợi ý content chi tiết về: "${nextBest.topic}"`)}
                >
                  <div className="flex items-start gap-2">
                    <Star className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium line-clamp-2 group-hover:text-emerald-600 transition-colors">
                        {nextBest.topic}
                      </p>
                      {nextBest.confidence && (
                        <div className="flex items-center gap-1 mt-1.5">
                          <span className="text-[9px] text-muted-foreground">Độ tin cậy:</span>
                          <div className="w-12 h-1 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${nextBest.confidence}%` }}
                            />
                          </div>
                          <span className="text-[9px] text-emerald-600 font-medium">{nextBest.confidence}%</span>
                        </div>
                      )}
                      {nextBest.reason && (
                        <p className="text-[9px] text-muted-foreground mt-1 line-clamp-1">{nextBest.reason}</p>
                      )}
                    </div>
                    <ArrowRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
                  </div>
                </button>
              ) : (
                <button
                  className="w-full text-left p-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-center"
                  onClick={() => brandTemplateId && getNextBestTopic()}
                  disabled={!brandTemplateId}
                >
                  <p className="text-[10px] text-muted-foreground">
                    {brandTemplateId ? 'Nhấn để lấy gợi ý' : 'Chọn brand trước'}
                  </p>
                </button>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Quick Topics Section */}
          <Collapsible open={sectionsOpen.quickTopics} onOpenChange={() => toggleSection('quickTopics')}>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-1 hover:bg-muted/50 rounded px-1 -mx-1">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-medium">Gợi ý nhanh</span>
                {suggestionsLoading && <Skeleton className="h-3 w-3 rounded-full" />}
              </div>
              <Badge variant="secondary" className="h-4 px-1 text-[9px]">{topQuickSuggestions.length}</Badge>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              {suggestionsLoading && quickSuggestions.length === 0 ? (
                <div className="flex flex-wrap gap-1">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-6 w-20 rounded-full" />
                  ))}
                </div>
              ) : topQuickSuggestions.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {topQuickSuggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      className="px-2 py-1 text-[10px] rounded-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 hover:border-primary/40 transition-colors line-clamp-1 max-w-full"
                      onClick={() => handleQuickTopicClick(suggestion.topic)}
                      title={suggestion.topic}
                    >
                      <span className="truncate block max-w-[120px]">{suggestion.topic}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-2">
                  <p className="text-[10px] text-muted-foreground">
                    Chọn brand để xem gợi ý
                  </p>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Seasonal Topics Section */}
          <Collapsible open={sectionsOpen.seasonal} onOpenChange={() => toggleSection('seasonal')}>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-1 hover:bg-muted/50 rounded px-1 -mx-1">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs font-medium">Theo mùa</span>
              </div>
              <Badge variant="secondary" className="h-4 px-1 text-[9px]">{upcomingEvents.length}</Badge>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              {upcomingEvents.length > 0 ? (
                <div className="space-y-1.5">
                  {upcomingEvents.map((event) => {
                    const daysUntil = Math.ceil((event.date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    const eventEmoji = event.type === 'holiday' ? '🎊' : event.type === 'campaign' ? '🎯' : '🎉';
                    return (
                      <button
                        key={event.id}
                        className="w-full text-left p-2 rounded-lg hover:bg-amber-500/10 transition-colors group border border-transparent hover:border-amber-500/20"
                        onClick={() => handleSeasonalClick(event.name)}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-base">{eventEmoji}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium line-clamp-1 group-hover:text-amber-600 transition-colors">
                              {event.name}
                            </p>
                            <p className="text-[9px] text-muted-foreground mt-0.5">
                              Còn {daysUntil} ngày
                            </p>
                          </div>
                          <ArrowRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-2">
                  <p className="text-[10px] text-muted-foreground">
                    Không có sự kiện sắp tới
                  </p>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* AI Learning Status */}
          <Collapsible open={sectionsOpen.aiLearning} onOpenChange={() => toggleSection('aiLearning')}>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-1 hover:bg-muted/50 rounded px-1 -mx-1">
              <div className="flex items-center gap-2">
                <Brain className="w-3.5 h-3.5 text-violet-500" />
                <span className="text-xs font-medium">AI Learning</span>
              </div>
              <span className={cn('text-[9px] font-medium', levelInfo.color)}>{levelInfo.label}</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              {/* Personalization Level */}
              <div className="space-y-1.5 mb-3">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">Mức cá nhân hóa</span>
                  <span className={cn('font-medium', levelInfo.color)}>
                    {aiLearningStats.personalizationLevel}%
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
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>
    </div>
  );
}
