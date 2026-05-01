import { useState, useMemo } from 'react';
import { 
  TrendingUp, Sparkles, Calendar, ChevronLeft, Flame, Zap, Gift, AlertCircle,
  Search, X, Filter, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useTrendingTopics } from '@/hooks/useTrendingTopics';
import { useTopicRecommendations } from '@/hooks/useTopicRecommendations';
import { useEnhancedTopicSuggestions } from '@/hooks/useEnhancedTopicSuggestions';
import { useCuratedEvents } from '@/hooks/useCuratedEvents';
import { CuratedEvent, EVENT_TYPE_CONFIG, SOURCE_CONFIG, TrendingSource } from '@/types/curatedData';
import { ContentGoal } from '@/types/multichannel';
import { cn } from '@/lib/utils';
import { TopicFormatSelector } from './TopicFormatSelector';

// Filter options
const FILTER_OPTIONS = [
  { key: 'hot', label: '🔥 Hot', description: 'Điểm ≥70' },
  { key: 'rising', label: '📈 Đang lên', description: 'Xu hướng tăng' },
  { key: 'low_comp', label: '💎 Ít cạnh tranh', description: 'Cạnh tranh thấp' },
  { key: 'urgent', label: '⚡ Gấp', description: 'Sự kiện trong 7 ngày' },
] as const;

type FilterKey = typeof FILTER_OPTIONS[number]['key'];

interface MobileDiscoverySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandTemplateId?: string;
  contentGoal?: ContentGoal;
  onInjectPrompt: (prompt: string) => void;
  onNavigate?: (path: string, state?: any) => void;
}

export function MobileDiscoverySheet({
  open,
  onOpenChange,
  brandTemplateId,
  contentGoal,
  onInjectPrompt,
  onNavigate,
}: MobileDiscoverySheetProps) {
  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<FilterKey[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  
  // Format selector states
  const [formatSelectorOpen, setFormatSelectorOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState('');

  const { 
    topics: trends, 
    isLoading: trendsLoading,
    refresh: refreshTrends 
  } = useTrendingTopics({ brandTemplateId });
  
  const { nextBest, isLoading: recommendLoading, getNextBestTopic } = useTopicRecommendations({
    brandTemplateId,
    contentGoal,
  });
  
  const { 
    suggestions, 
    isLoading: suggestionsLoading,
    isEnhancing,
    source: suggestionsSource,
    refresh: refreshSuggestions 
  } = useEnhancedTopicSuggestions({
    brandTemplateId,
    contentGoal,
    enabled: open && !!brandTemplateId,
  });

  const { 
    isLoading: eventsLoading,
    getUpcomingEvents,
  } = useCuratedEvents();

  const upcomingEvents = getUpcomingEvents(60).slice(0, 5);

  // Filter trends
  const filteredTrends = useMemo(() => {
    let filtered = [...trends];
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.topic.toLowerCase().includes(query) ||
        t.suggested_angles?.some(a => a.toLowerCase().includes(query))
      );
    }
    
    if (activeFilters.includes('hot')) {
      filtered = filtered.filter(t => t.velocity_score >= 70);
    }
    if (activeFilters.includes('rising')) {
      filtered = filtered.filter(t => t.peak_status === 'rising');
    }
    if (activeFilters.includes('low_comp')) {
      filtered = filtered.filter(t => t.competition_level === 'low');
    }
    
    return filtered.slice(0, 5);
  }, [trends, searchQuery, activeFilters]);

  // Filter suggestions
  const filteredSuggestions = useMemo(() => {
    let filtered = [...suggestions];
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s => 
        s.topic.toLowerCase().includes(query) ||
        s.category?.toLowerCase().includes(query)
      );
    }
    
    return filtered.slice(0, 5);
  }, [suggestions, searchQuery]);

  // Filter events
  const filteredEvents = useMemo(() => {
    let filtered = [...upcomingEvents];
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(e => 
        e.name.toLowerCase().includes(query) ||
        e.suggested_topics?.some(t => t.toLowerCase().includes(query))
      );
    }
    
    if (activeFilters.includes('urgent')) {
      filtered = filtered.filter(e => {
        const daysUntil = Math.ceil(
          (new Date(e.event_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        return daysUntil <= 7;
      });
    }
    
    return filtered;
  }, [upcomingEvents, searchQuery, activeFilters]);

  // Toggle filter
  const toggleFilter = (filterKey: FilterKey) => {
    setActiveFilters(prev => 
      prev.includes(filterKey) 
        ? prev.filter(f => f !== filterKey)
        : [...prev, filterKey]
    );
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setActiveFilters([]);
  };

  const hasActiveFilters = searchQuery.trim() || activeFilters.length > 0;

  // Haptic feedback helper
  const triggerHaptic = (style: 'light' | 'medium' | 'heavy' = 'light') => {
    if ('vibrate' in navigator) {
      const duration = style === 'light' ? 10 : style === 'medium' ? 20 : 30;
      navigator.vibrate(duration);
    }
  };

  // Open format selector with topic
  const handleTopicClick = (topic: string) => {
    triggerHaptic('medium');
    
    if (onNavigate) {
      setSelectedTopic(topic);
      setFormatSelectorOpen(true);
    } else {
      // Fallback to inject prompt if no navigate function
      onInjectPrompt(`Gợi ý content về: "${topic}"`);
      onOpenChange(false);
    }
  };

  // Handle format selection and navigate
  const handleFormatSelect = (format: 'multichannel' | 'script' | 'carousel') => {
    if (!onNavigate) return;
    
    const state = { 
      prefillTopic: selectedTopic, 
      prefillGoal: contentGoal, 
      fromTopics: true 
    };
    
    switch (format) {
      case 'multichannel':
        onNavigate('/multichannel', state);
        break;
      case 'script':
        onNavigate('/videos', { ...state, tab: 'scripts', prefillTopic: selectedTopic, action: 'new' });
        break;
      case 'carousel':
        onNavigate('/carousel', { ...state, prefillTopic: selectedTopic });
        break;
    }
    
    setFormatSelectorOpen(false);
    onOpenChange(false);
  };

  const handleEventClick = (event: CuratedEvent) => {
    const topic = event.suggested_topics?.[0] || event.name;
    handleTopicClick(topic);
  };

  const getEventEmoji = (type: string) => {
    switch (type) {
      case 'holiday': return '🎉';
      case 'campaign': return '📢';
      case 'industry_event': return '💼';
      case 'awareness_day': return '📅';
      default: return '📅';
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] p-0 rounded-t-2xl flex flex-col overflow-hidden">
        {/* Header with Search & Filter */}
        <SheetHeader className="sticky top-0 z-10 bg-background border-b px-4 py-3 space-y-2">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onOpenChange(false)}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <SheetTitle className="text-base font-semibold flex items-center gap-2 flex-1">
              <Sparkles className="h-4 w-4 text-primary" />
              Khám phá
              {hasActiveFilters && (
                <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                  {activeFilters.length + (searchQuery ? 1 : 0)} lọc
                </Badge>
              )}
            </SheetTitle>
            <Button
              variant={showFilters ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className={cn("h-4 w-4", hasActiveFilters && "text-primary")} />
            </Button>
          </div>
          
          {/* Search & Filter Panel */}
          {showFilters && (
            <div className="space-y-2 pt-1">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm chủ đề..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 pl-9 pr-9 text-sm"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setSearchQuery('')}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              
              {/* Filter Chips */}
              <div className="flex flex-wrap gap-1.5">
                {FILTER_OPTIONS.map((filter) => (
                  <button
                    key={filter.key}
                    onClick={() => toggleFilter(filter.key)}
                    className={cn(
                      "px-2.5 py-1 text-xs rounded-full border transition-colors",
                      activeFilters.includes(filter.key)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background hover:bg-muted border-border"
                    )}
                  >
                    {filter.label}
                  </button>
                ))}
                
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="px-2.5 py-1 text-xs rounded-full text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Xóa lọc
                  </button>
                )}
              </div>
            </div>
          )}
        </SheetHeader>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y pb-safe">
          {/* Next Best Topic */}
          {brandTemplateId && (
            <Card className="mx-4 mt-4 border-primary/20 bg-gradient-to-br from-primary/5 to-violet-500/5">
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  Topic tốt nhất
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
              {recommendLoading ? (
                  <Skeleton className="h-12 w-full" />
                ) : nextBest ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full h-auto p-3 justify-start text-left transition-all duration-150 active:scale-[0.98] active:bg-primary/10"
                    onClick={() => handleTopicClick(nextBest.topic)}
                  >
                    <div>
                      <p className="font-medium text-sm line-clamp-2">{nextBest.topic}</p>
                      {nextBest.confidence && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Độ tin cậy: {Math.round(nextBest.confidence * 100)}%
                        </p>
                      )}
                    </div>
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground">Chưa có đủ dữ liệu</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Quick Suggestions */}
          {brandTemplateId && (suggestions.length > 0 || isEnhancing) && (
            <Card className="mx-4 mt-3">
              <CardHeader className="pb-2 pt-3 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-violet-500" />
                    Gợi ý nhanh
                    {isEnhancing && (
                      <Badge className="h-4 px-1.5 text-[8px] bg-violet-500/10 text-violet-600 animate-pulse">
                        🔄 AI đang tạo...
                      </Badge>
                    )}
                    {!isEnhancing && suggestionsSource === 'ai' && (
                      <Badge className="h-4 px-1.5 text-[8px] bg-emerald-500/10 text-emerald-600">
                        ✨ AI
                      </Badge>
                    )}
                    {!isEnhancing && suggestionsSource === 'fallback' && (
                      <Badge variant="outline" className="h-4 px-1.5 text-[8px] text-muted-foreground">
                        📋 Mẫu
                      </Badge>
                    )}
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6"
                    onClick={() => refreshSuggestions()}
                    disabled={suggestionsLoading || isEnhancing}
                  >
                    <RefreshCw className={cn("h-3 w-3", (suggestionsLoading || isEnhancing) && "animate-spin")} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                {suggestionsLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {filteredSuggestions.map((suggestion, idx) => (
                      <Button
                        key={idx}
                        type="button"
                        variant="ghost"
                        className="w-full h-auto p-2 justify-start text-left hover:bg-muted/50 transition-all duration-150 active:scale-[0.98] active:bg-violet-500/10"
                        onClick={() => handleTopicClick(suggestion.topic)}
                      >
                        <div className="flex items-center gap-2 w-full">
                          <Badge variant="secondary" className="shrink-0 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                            {idx + 1}
                          </Badge>
                          <span className="text-sm line-clamp-2 flex-1">{suggestion.topic}</span>
                          {suggestion.category && (
                            <Badge variant="outline" className="shrink-0 h-4 px-1.5 text-[9px] text-muted-foreground">
                              {suggestion.category}
                            </Badge>
                          )}
                        </div>
                      </Button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Trending Topics */}
          <Card className="mx-4 mt-3">
            <CardHeader className="pb-2 pt-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Flame className="h-4 w-4 text-orange-500" />
                  Đang hot
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6"
                  onClick={() => refreshTrends()}
                  disabled={trendsLoading}
                >
                  <RefreshCw className={cn("h-3 w-3", trendsLoading && "animate-spin")} />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              {trendsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : filteredTrends.length > 0 ? (
                <div className="space-y-2">
                  {filteredTrends.map((trend, idx) => {
                    const sourceConfig = trend.source ? SOURCE_CONFIG[trend.source as TrendingSource] : null;
                    return (
                      <Button
                        key={idx}
                        type="button"
                        variant="ghost"
                        className="w-full h-auto p-2 justify-start text-left transition-all duration-150 active:scale-[0.98] active:bg-orange-500/10"
                        onClick={() => handleTopicClick(trend.topic)}
                      >
                        <div className="flex items-center gap-2 w-full">
                          <Badge 
                            variant="secondary" 
                            className={cn(
                              'shrink-0 h-5 w-5 p-0 flex items-center justify-center text-[10px]',
                              idx === 0 && 'bg-orange-500 text-white',
                              idx === 1 && 'bg-orange-400 text-white',
                              idx === 2 && 'bg-orange-300 text-orange-900'
                            )}
                          >
                            {idx + 1}
                          </Badge>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm line-clamp-1 block">{trend.topic}</span>
                            <div className="flex items-center gap-2 mt-0.5">
                              {sourceConfig && (
                                <Badge variant="outline" className={cn("h-3.5 px-1 text-[8px] border", sourceConfig.color)}>
                                  {sourceConfig.icon} {sourceConfig.label}
                                </Badge>
                              )}
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-muted-foreground">
                                  {Math.round(trend.velocity_score)}%
                                </span>
                                <Progress value={trend.velocity_score} className="h-1 w-10" />
                              </div>
                            </div>
                          </div>
                          <TrendingUp className={cn(
                            'h-3.5 w-3.5 shrink-0',
                            trend.peak_status === 'rising' && 'text-emerald-500',
                            trend.peak_status === 'peaking' && 'text-amber-500',
                            trend.peak_status === 'declining' && 'text-red-500'
                          )} />
                        </div>
                      </Button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {hasActiveFilters ? 'Không có kết quả phù hợp' : 'Chưa có dữ liệu trending'}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Seasonal Events */}
          <Card className="mx-4 mt-3 mb-4">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Gift className="h-4 w-4 text-pink-500" />
                Sự kiện sắp tới
                {eventsLoading && <Skeleton className="h-3 w-3 rounded-full" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              {eventsLoading && upcomingEvents.length === 0 ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : filteredEvents.length > 0 ? (
                <div className="space-y-2">
                  {filteredEvents.map((event) => {
                    const daysUntil = Math.ceil(
                      (new Date(event.event_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                    );
                    const isUrgent = daysUntil <= 7;
                    const eventConfig = EVENT_TYPE_CONFIG[event.event_type as keyof typeof EVENT_TYPE_CONFIG] 
                      || EVENT_TYPE_CONFIG.holiday;
                    
                    return (
                      <Button
                        key={event.id}
                        type="button"
                        variant="ghost"
                        className={cn(
                          "w-full h-auto p-2 justify-start text-left transition-all duration-150 active:scale-[0.98]",
                          isUrgent ? "bg-red-500/5 hover:bg-red-500/10 active:bg-red-500/15" : "active:bg-primary/10"
                        )}
                        onClick={() => handleEventClick(event)}
                      >
                        <div className="flex items-center gap-2 w-full">
                          <span className="text-lg">{getEventEmoji(event.event_type)}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-medium line-clamp-1">{event.name}</p>
                              {isUrgent && (
                                <span className="flex items-center gap-0.5 text-[9px] text-red-500 font-medium">
                                  <AlertCircle className="w-2.5 h-2.5" />
                                  Gấp
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className={cn(
                                "text-[10px]",
                                isUrgent ? "text-red-500 font-medium" : "text-muted-foreground"
                              )}>
                                Còn {daysUntil} ngày
                              </p>
                              <Badge variant="outline" className={cn("h-3.5 px-1 text-[8px] border", eventConfig.color)}>
                                {eventConfig.label}
                              </Badge>
                            </div>
                          </div>
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        </div>
                      </Button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {hasActiveFilters ? 'Không có kết quả phù hợp' : 'Không có sự kiện sắp tới'}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </SheetContent>

      {/* Format Selector Dialog */}
      <TopicFormatSelector
        open={formatSelectorOpen}
        onOpenChange={setFormatSelectorOpen}
        topic={selectedTopic}
        contentGoal={contentGoal}
        onSelectFormat={handleFormatSelect}
      />
    </Sheet>
  );
}
