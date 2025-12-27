import { useState, useEffect, useMemo } from 'react';
import { 
  Flame, TrendingUp, Brain, ChevronLeft, ChevronRight,
  RefreshCw, Zap, ArrowRight, Sparkles, Lightbulb,
  CalendarDays, Target, Star, AlertCircle
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
import { useCuratedEvents } from '@/hooks/useCuratedEvents';
import { CuratedEvent, EVENT_TYPE_CONFIG, SOURCE_CONFIG, TrendingSource } from '@/types/curatedData';
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
    isEnhancing,
    source: suggestionsSource,
    refresh: refreshSuggestions,
  } = useEnhancedTopicSuggestions({
    brandTemplateId,
    contentGoal,
    enabled: !!brandTemplateId && !isCollapsed,
  });

  const {
    events: curatedEvents,
    isLoading: eventsLoading,
    getUpcomingEvents,
  } = useCuratedEvents();

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

  const handleSeasonalClick = (event: CuratedEvent) => {
    const topics = event.suggested_topics?.join(', ') || '';
    const angles = event.suggested_angles?.join(', ') || '';
    onInjectPrompt(`Gợi ý content cho sự kiện "${event.name}"${topics ? `. Chủ đề gợi ý: ${topics}` : ''}${angles ? `. Góc tiếp cận: ${angles}` : ''}`);
  };

  const sortedTopics = [...topics].sort((a, b) => b.velocity_score - a.velocity_score);
  const hotTopics = sortedTopics.filter(t => t.velocity_score >= 60).slice(0, 5);

  // Get top 5 quick suggestions
  const topQuickSuggestions = useMemo(() => 
    quickSuggestions.slice(0, 5), [quickSuggestions]);

  // Get upcoming events from database (within 60 days)
  const upcomingEvents = useMemo(() => {
    return getUpcomingEvents(60).slice(0, 5);
  }, [getUpcomingEvents]);

  const getLevelLabel = (level: number) => {
    if (level >= 80) return { label: 'Rất cao', color: 'text-emerald-500' };
    if (level >= 60) return { label: 'Cao', color: 'text-blue-500' };
    if (level >= 40) return { label: 'Trung bình', color: 'text-amber-500' };
    if (level >= 20) return { label: 'Đang học', color: 'text-orange-500' };
    return { label: 'Mới bắt đầu', color: 'text-muted-foreground' };
  };

  const levelInfo = getLevelLabel(aiLearningStats.personalizationLevel);
  const isLoading = trendingLoading || nextBestLoading || suggestionsLoading || eventsLoading;

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
    <div className="h-full flex flex-col bg-card/50 border-l border-border/50 overflow-hidden">
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
      <ScrollArea className="flex-1 overflow-auto">
        <div className="space-y-3 p-3">
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
                    const sourceConfig = topic.source ? SOURCE_CONFIG[topic.source as TrendingSource] : null;
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
                              {sourceConfig && (
                                <Badge variant="outline" className={cn("h-3.5 px-1 text-[8px] border", sourceConfig.color)}>
                                  {sourceConfig.icon} {sourceConfig.label}
                                </Badge>
                              )}
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
                
                {/* Loading indicator khi AI đang tạo */}
                {isEnhancing && (
                  <Badge variant="outline" className="h-4 px-1.5 text-[8px] bg-violet-500/10 border-violet-500/30 text-violet-600 animate-pulse">
                    <Sparkles className="w-2.5 h-2.5 mr-0.5 animate-spin" />
                    AI đang tạo...
                  </Badge>
                )}
                
                {/* Source indicator khi không loading */}
                {!isEnhancing && !suggestionsLoading && suggestionsSource === 'ai' && (
                  <Badge variant="outline" className="h-4 px-1.5 text-[8px] bg-emerald-500/10 border-emerald-500/30 text-emerald-600">
                    ✨ AI
                  </Badge>
                )}
                {!isEnhancing && !suggestionsLoading && suggestionsSource === 'cache' && (
                  <Badge variant="outline" className="h-4 px-1.5 text-[8px] bg-blue-500/10 border-blue-500/30 text-blue-600">
                    💾 Cache
                  </Badge>
                )}
                {!isEnhancing && !suggestionsLoading && suggestionsSource === 'fallback' && (
                  <Badge variant="outline" className="h-4 px-1.5 text-[8px] text-muted-foreground">
                    📋 Mẫu
                  </Badge>
                )}
              </div>
              <Badge variant="secondary" className="h-4 px-1 text-[9px]">{topQuickSuggestions.length}</Badge>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="relative">
                {/* Overlay khi đang tải AI suggestions */}
                {isEnhancing && quickSuggestions.length > 0 && (
                  <div className="absolute inset-0 bg-background/50 rounded-lg flex items-center justify-center z-10">
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <Sparkles className="w-3 h-3 animate-spin text-primary" />
                      <span>Đang cá nhân hóa...</span>
                    </div>
                  </div>
                )}
                
                {suggestionsLoading && quickSuggestions.length === 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-6 w-20 rounded-full" />
                    ))}
                  </div>
                ) : topQuickSuggestions.length > 0 ? (
                  <div className={cn("flex flex-wrap gap-1", isEnhancing && "opacity-60")}>
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
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Seasonal/Upcoming Events Section */}
          <Collapsible open={sectionsOpen.seasonal} onOpenChange={() => toggleSection('seasonal')}>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-1 hover:bg-muted/50 rounded px-1 -mx-1">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs font-medium">Sự kiện sắp đến</span>
                {eventsLoading && <Skeleton className="h-3 w-3 rounded-full" />}
              </div>
              <Badge variant="secondary" className="h-4 px-1 text-[9px]">{upcomingEvents.length}</Badge>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              {eventsLoading && curatedEvents.length === 0 ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-lg" />
                  ))}
                </div>
              ) : upcomingEvents.length > 0 ? (
                <div className="space-y-1.5">
                  {upcomingEvents.map((event) => {
                    const daysUntil = Math.ceil(
                      (new Date(event.event_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                    );
                    const isUrgent = daysUntil <= 7;
                    const eventConfig = EVENT_TYPE_CONFIG[event.event_type as keyof typeof EVENT_TYPE_CONFIG] 
                      || EVENT_TYPE_CONFIG.holiday;
                    const eventEmoji = event.event_type === 'holiday' ? '🎊' 
                      : event.event_type === 'campaign' ? '🎯' 
                      : event.event_type === 'industry_event' ? '💼'
                      : '📅';
                    
                    return (
                      <button
                        key={event.id}
                        className={cn(
                          "w-full text-left p-2 rounded-lg transition-colors group border",
                          isUrgent 
                            ? "bg-red-500/5 border-red-500/20 hover:bg-red-500/10 hover:border-red-500/30" 
                            : "border-transparent hover:bg-amber-500/10 hover:border-amber-500/20"
                        )}
                        onClick={() => handleSeasonalClick(event)}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-base">{eventEmoji}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className={cn(
                                "text-xs font-medium line-clamp-1 transition-colors",
                                isUrgent ? "group-hover:text-red-600" : "group-hover:text-amber-600"
                              )}>
                                {event.name}
                              </p>
                              {isUrgent && (
                                <span className="flex items-center gap-0.5 text-[9px] text-red-500 font-medium">
                                  <AlertCircle className="w-2.5 h-2.5" />
                                  Gấp
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className={cn(
                                "text-[9px]",
                                isUrgent ? "text-red-500 font-medium" : "text-muted-foreground"
                              )}>
                                Còn {daysUntil} ngày
                              </p>
                              <Badge variant="outline" className={cn("h-3.5 px-1 text-[8px] border", eventConfig.color)}>
                                {eventConfig.label}
                              </Badge>
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
