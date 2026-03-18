import React, { useState, useMemo } from 'react';
import {
  Sparkles, TrendingUp, Leaf, Columns, History, RefreshCw,
  Filter, Search, ChevronDown, Lightbulb, X, ArrowUpDown, Trophy,
  Calendar, Zap, Target, BarChart3, Gift
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group';
import { ContentGoal } from '@/types/multichannel';
import {
  EnhancedTopicSuggestion,
  TopicFormat,
  TopicCategory,
  EngagementLevel,
  SortOption,
  TOPIC_CATEGORIES,
  ENGAGEMENT_LEVELS,
  SORT_OPTIONS,
} from '@/types/topicDiscovery';
import { useEnhancedTopicSuggestions } from '@/hooks/useEnhancedTopicSuggestions';
import { useTopicHistory } from '@/hooks/useTopicHistory';
import { useAdvancedPromptContext } from '@/hooks/useAdvancedPromptContext';
import { TopicIdeaCard } from './TopicIdeaCard';
import { TopicHistoryTab } from './TopicHistoryTab';
import { TopicSystemExplainer } from './TopicSystemExplainer';
import { PromptQualityIndicator } from '../PromptQualityIndicator';
import { TopicCreditsAlert } from './TopicCreditsAlert';

// Source badge tooltip content
const SOURCE_TOOLTIPS = {
  ai: {
    title: 'Tạo mới bởi AI',
    description: 'Vừa được AI tạo dựa trên Brand Template, Industry Pack và lịch sử của bạn',
    color: 'text-primary',
  },
  cache: {
    title: 'Từ bộ nhớ đệm',
    description: 'Đã được tạo trước đó cho cùng cấu hình, hiển thị ngay để tiết kiệm thời gian',
    color: 'text-amber-500',
  },
  fallback: {
    title: 'Gợi ý mặc định',
    description: 'Chưa có đủ context. Thêm Brand Template để nhận gợi ý AI tùy chỉnh',
    color: 'text-muted-foreground',
  },
} as const;

interface TopicDiscoveryPanelProps {
  brandTemplateId?: string;
  contentGoal: ContentGoal;
  format?: TopicFormat;
  onSelectTopic: (topic: EnhancedTopicSuggestion) => void;
  onSaveTopic?: (topic: EnhancedTopicSuggestion) => void;
  onScheduleTopic?: (topic: EnhancedTopicSuggestion) => void;
  className?: string;
  disabled?: boolean;
}

const CONTENT_PILLARS = [
  { value: 'all', label: 'Tất cả pillars' },
  { value: 'product', label: 'Sản phẩm' },
  { value: 'industry', label: 'Ngành nghề' },
  { value: 'customer', label: 'Khách hàng' },
  { value: 'behind-scenes', label: 'Hậu trường' },
  { value: 'promotional', label: 'Khuyến mãi' },
];

// Category filter chips with icons
const CATEGORY_FILTERS = [
  { value: 'all', label: 'Tất cả', icon: Sparkles },
  { value: 'evergreen', label: 'Evergreen', icon: Leaf },
  { value: 'trending', label: 'Trending', icon: TrendingUp },
  { value: 'seasonal', label: 'Seasonal', icon: Calendar },
  { value: 'reactive', label: 'Reactive', icon: Zap },
] as const;

// Score dimension quick filters
const SCORE_DIMENSIONS = [
  { key: 'overall', label: 'Tổng', icon: Trophy },
  { key: 'brandFit', label: 'Brand', icon: Target },
  { key: 'trend', label: 'Trend', icon: TrendingUp },
  { key: 'competition', label: 'Cạnh tranh', icon: BarChart3 },
] as const;

export function TopicDiscoveryPanel({
  brandTemplateId,
  contentGoal,
  format,
  onSelectTopic,
  onSaveTopic,
  onScheduleTopic,
  className,
  disabled,
}: TopicDiscoveryPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('ai');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPillar, setSelectedPillar] = useState('all');
  const [selectedEngagement, setSelectedEngagement] = useState<EngagementLevel | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<TopicCategory | 'all'>('all');

  const { 
    suggestions, 
    source, 
    isLoading, 
    error,
    errorCode,
    refresh,
    sortBy,
    setSortBy,
    minScore,
    setMinScore,
    stats,
  } = useEnhancedTopicSuggestions({
    brandTemplateId,
    contentGoal,
    format,
    enabled: isOpen && !disabled,
  });

  const { saveTopic } = useTopicHistory({
    brandTemplateId,
    contentGoal,
    enabled: isOpen && !disabled,
  });

  // Fetch advanced prompt context for quality indicator
  const { context: promptContext } = useAdvancedPromptContext({
    brandTemplateId,
    contentGoal,
    format,
    enabled: isOpen && !disabled && !!brandTemplateId,
  });

  // Handle topic selection with history tracking
  const handleSelectTopic = async (topic: EnhancedTopicSuggestion) => {
    // Save to history
    await saveTopic(topic, 'selected');
    // Call parent handler
    onSelectTopic(topic);
  };

  // Filter suggestions based on current filters
  const filteredSuggestions = useMemo(() => {
    return suggestions.filter((topic) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTopic = topic.topic.toLowerCase().includes(query);
        const matchesKeywords = topic.relatedKeywords?.some((k) =>
          k.toLowerCase().includes(query)
        );
        if (!matchesTopic && !matchesKeywords) return false;
      }

      // Pillar filter
      if (selectedPillar !== 'all' && topic.pillar !== selectedPillar) {
        return false;
      }

      // Engagement filter
      if (selectedEngagement !== 'all' && topic.estimatedEngagement !== selectedEngagement) {
        return false;
      }

      // Category filter (for specific tabs)
      if (selectedCategory !== 'all' && topic.category !== selectedCategory) {
        return false;
      }

      return true;
    });
  }, [suggestions, searchQuery, selectedPillar, selectedEngagement, selectedCategory]);

  const hasActiveFilters = searchQuery || selectedPillar !== 'all' || selectedEngagement !== 'all' || minScore > 0;

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedPillar('all');
    setSelectedEngagement('all');
    setSelectedCategory('all');
    setMinScore(0);
  };

  const renderTopicGrid = (topics: EnhancedTopicSuggestion[]) => {
    if (isLoading) {
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[220px] rounded-lg" />
          ))}
        </div>
      );
    }

    if (topics.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <Lightbulb className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Không tìm thấy chủ đề phù hợp</p>
          {hasActiveFilters && (
            <Button variant="link" size="sm" onClick={clearFilters}>
              Xóa bộ lọc
            </Button>
          )}
        </div>
      );
    }

    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {topics.map((topic, index) => (
          <div
            key={`${topic.topic}-${index}`}
            className="animate-fade-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <TopicIdeaCard
              topic={topic}
              onSelect={handleSelectTopic}
              onSave={onSaveTopic}
              onSchedule={onScheduleTopic}
              disabled={disabled}
            />
          </div>
        ))}
      </div>
    );
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between px-3 py-2 h-auto hover:bg-muted/50"
        >
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary/20 to-violet-500/20">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div className="text-left flex items-center gap-2">
              <span className="font-medium text-sm">Khám phá chủ đề</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge 
                      variant={source === 'fallback' ? 'outline' : 'secondary'} 
                      className={cn(
                        "text-[10px] px-1.5 py-0 cursor-help",
                        SOURCE_TOOLTIPS[source].color
                      )}
                    >
                      {source === 'ai' ? '✨ AI' : source === 'cache' ? '⚡ Cache' : '📋 Mặc định'}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[200px]">
                    <p className="font-medium text-xs">{SOURCE_TOOLTIPS[source].title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {SOURCE_TOOLTIPS[source].description}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Prompt Quality Indicator */}
            {promptContext && (
              <PromptQualityIndicator context={promptContext} variant="compact" />
            )}
            {stats && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="text-[10px] gap-1">
                      <Trophy className="w-3 h-3" />
                      {stats.averageScore}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Điểm trung bình: {stats.averageScore}</p>
                    <p className="text-xs text-muted-foreground">
                      {stats.topPerformersCount}/{stats.totalCount} topics xuất sắc
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <ChevronDown
              className={cn(
                'w-4 h-4 text-muted-foreground transition-transform',
                isOpen && 'rotate-180'
              )}
            />
          </div>
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="pt-3">
        {/* Topic System Explainer */}
        <TopicSystemExplainer className="mb-3" />

        {/* Search and Filter Bar */}
        <div className="space-y-2 mb-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm chủ đề..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
                disabled={disabled}
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
            <Button
              variant={showFilters ? 'secondary' : 'outline'}
              size="sm"
              className="h-9"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4 mr-1" />
              Lọc
              {hasActiveFilters && (
                <Badge className="ml-1 h-4 w-4 p-0 text-[10px] justify-center">
                  !
                </Badge>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => refresh()}
              disabled={isLoading || disabled}
            >
              <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
            </Button>
          </div>

          {/* Expanded Filters - Enhanced UI */}
          {showFilters && (
            <div className="space-y-4 p-4 rounded-xl bg-gradient-to-br from-muted/40 to-muted/20 border border-border/50 animate-fade-in">
              {/* Category Filter Chips */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Loại chủ đề
                </label>
                <ToggleGroup 
                  type="single" 
                  value={selectedCategory} 
                  onValueChange={(v) => v && setSelectedCategory(v as TopicCategory | 'all')}
                  className="justify-start flex-wrap gap-1.5"
                >
                  {CATEGORY_FILTERS.map(({ value, label, icon: Icon }) => (
                    <ToggleGroupItem
                      key={value}
                      value={value}
                      size="sm"
                      className={cn(
                        'h-7 px-2.5 text-xs gap-1.5 rounded-full border transition-all',
                        selectedCategory === value 
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm' 
                          : 'border-border/50 hover:border-primary/50 hover:bg-muted'
                      )}
                    >
                      <Icon className="w-3 h-3" />
                      {label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>

              {/* Score Dimension Quick Sort */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Sắp xếp theo điểm
                </label>
                <div className="flex gap-1.5 flex-wrap">
                  {SCORE_DIMENSIONS.map(({ key, label, icon: Icon }) => (
                    <Button
                      key={key}
                      variant={sortBy === key ? 'default' : 'outline'}
                      size="sm"
                      className={cn(
                        'h-7 px-2.5 text-xs gap-1 rounded-full transition-all',
                        sortBy === key && 'shadow-sm'
                      )}
                      onClick={() => setSortBy(key as SortOption)}
                    >
                      <Icon className="w-3 h-3" />
                      {label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Score Threshold with Visual Indicator */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                    Điểm tối thiểu
                  </label>
                  <Badge 
                    variant={minScore >= 80 ? 'default' : minScore >= 60 ? 'secondary' : 'outline'}
                    className={cn(
                      'text-[10px] px-2 font-bold',
                      minScore >= 80 && 'bg-emerald-500',
                      minScore >= 60 && minScore < 80 && 'bg-amber-500'
                    )}
                  >
                    {minScore}+
                  </Badge>
                </div>
                <div className="relative pt-1">
                  <Slider
                    value={[minScore]}
                    onValueChange={([v]) => setMinScore(v)}
                    min={0}
                    max={100}
                    step={10}
                    className="w-full"
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-[9px] text-muted-foreground">0</span>
                    <span className="text-[9px] text-amber-500">60</span>
                    <span className="text-[9px] text-emerald-500">80</span>
                    <span className="text-[9px] text-muted-foreground">100</span>
                  </div>
                </div>
              </div>

              {/* Additional Filters Row */}
              <div className="flex gap-2 pt-2 border-t border-border/30">
                <Select value={selectedPillar} onValueChange={setSelectedPillar}>
                  <SelectTrigger className="h-8 text-xs flex-1 rounded-full">
                    <SelectValue placeholder="Content Pillar" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTENT_PILLARS.map((pillar) => (
                      <SelectItem key={pillar.value} value={pillar.value} className="text-xs">
                        {pillar.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={selectedEngagement}
                  onValueChange={(v) => setSelectedEngagement(v as EngagementLevel | 'all')}
                >
                  <SelectTrigger className="h-8 text-xs flex-1 rounded-full">
                    <SelectValue placeholder="Engagement" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">
                      Tất cả engagement
                    </SelectItem>
                    {ENGAGEMENT_LEVELS.map((level) => (
                      <SelectItem key={level.value} value={level.value} className="text-xs">
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {hasActiveFilters && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 rounded-full hover:bg-destructive/10 hover:text-destructive" 
                          onClick={clearFilters}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Xóa tất cả bộ lọc</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Tabs - Enhanced with seasonal tab */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-6 h-9">
            <TabsTrigger value="ai" className="text-xs gap-1">
              <Sparkles className="w-3 h-3" />
              <span className="hidden sm:inline">AI</span>
            </TabsTrigger>
            <TabsTrigger value="trending" className="text-xs gap-1">
              <TrendingUp className="w-3 h-3" />
              <span className="hidden sm:inline">Trend</span>
            </TabsTrigger>
            <TabsTrigger value="seasonal" className="text-xs gap-1 relative">
              <Gift className="w-3 h-3" />
              <span className="hidden sm:inline">Sự kiện</span>
              {/* Pulsing dot for upcoming events */}
              {suggestions.some(t => t.relatedEvent) && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              )}
            </TabsTrigger>
            <TabsTrigger value="evergreen" className="text-xs gap-1">
              <Leaf className="w-3 h-3" />
              <span className="hidden sm:inline">Evergreen</span>
            </TabsTrigger>
            <TabsTrigger value="pillar" className="text-xs gap-1">
              <Columns className="w-3 h-3" />
              <span className="hidden sm:inline">Pillar</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs gap-1">
              <History className="w-3 h-3" />
              <span className="hidden sm:inline">Lịch sử</span>
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[450px] mt-3">
            <TabsContent value="ai" className="m-0">
              {renderTopicGrid(filteredSuggestions)}
            </TabsContent>

            <TabsContent value="trending" className="m-0">
              {renderTopicGrid(
                filteredSuggestions.filter((t) => t.category === 'trending' || t.category === 'reactive')
              )}
            </TabsContent>

            {/* Seasonal/Event Topics Tab */}
            <TabsContent value="seasonal" className="m-0">
              {(() => {
                const seasonalTopics = filteredSuggestions.filter(
                  (t) => t.category === 'seasonal' || t.relatedEvent
                );
                
                if (seasonalTopics.length === 0) {
                  return (
                    <div className="text-center py-8 text-muted-foreground">
                      <Gift className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Không có sự kiện nào trong 2 tuần tới</p>
                      <p className="text-xs mt-1">Các gợi ý theo mùa sẽ xuất hiện khi có sự kiện đặc biệt</p>
                    </div>
                  );
                }

                // Group by event
                const groupedByEvent = seasonalTopics.reduce((acc, topic) => {
                  const eventKey = topic.relatedEvent || 'Khác';
                  if (!acc[eventKey]) acc[eventKey] = [];
                  acc[eventKey].push(topic);
                  return acc;
                }, {} as Record<string, EnhancedTopicSuggestion[]>);

                return (
                  <div className="space-y-4">
                    {Object.entries(groupedByEvent).map(([event, topics]) => (
                      <div key={event}>
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                          <Gift className="w-4 h-4 text-amber-500" />
                          <span className="text-amber-600 dark:text-amber-400">{event}</span>
                          <Badge variant="outline" className="text-[10px] bg-amber-500/10 border-amber-500/30">
                            {topics.length} gợi ý
                          </Badge>
                          {topics[0]?.eventDate && (
                            <span className="text-[10px] text-muted-foreground ml-auto">
                              📅 {topics[0].eventDate}
                            </span>
                          )}
                        </h4>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {topics.map((topic, index) => (
                            <TopicIdeaCard
                              key={`${topic.topic}-${index}`}
                              topic={topic}
                              onSelect={handleSelectTopic}
                              onSave={onSaveTopic}
                              onSchedule={onScheduleTopic}
                              disabled={disabled}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </TabsContent>

            <TabsContent value="evergreen" className="m-0">
              {renderTopicGrid(filteredSuggestions.filter((t) => t.category === 'evergreen'))}
            </TabsContent>

            <TabsContent value="pillar" className="m-0">
              <div className="space-y-4">
                {CONTENT_PILLARS.filter((p) => p.value !== 'all').map((pillar) => {
                  const pillarTopics = filteredSuggestions.filter(
                    (t) => t.pillar === pillar.value
                  );
                  if (pillarTopics.length === 0) return null;

                  return (
                    <div key={pillar.value}>
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Columns className="w-4 h-4 text-muted-foreground" />
                        {pillar.label}
                        <Badge variant="secondary" className="text-[10px]">
                          {pillarTopics.length}
                        </Badge>
                      </h4>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {pillarTopics.map((topic, index) => (
                          <TopicIdeaCard
                            key={`${topic.topic}-${index}`}
                            topic={topic}
                            onSelect={handleSelectTopic}
                            onSave={onSaveTopic}
                            onSchedule={onScheduleTopic}
                            disabled={disabled}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
                {filteredSuggestions.every((t) => !t.pillar) && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Columns className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Chưa có Content Pillars được cấu hình</p>
                    <p className="text-xs mt-1">
                      Thêm pillars trong cài đặt Brand Template
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="history" className="m-0">
              <TopicHistoryTab
                brandTemplateId={brandTemplateId}
                contentGoal={contentGoal}
                onSelectTopic={(topic) => {
                  // When reusing from history, just set the topic text
                  onSelectTopic({
                    topic,
                    category: 'evergreen',
                    formats: ['multichannel'],
                    estimatedEngagement: 'medium',
                    reasoning: 'Sử dụng lại từ lịch sử',
                    relatedKeywords: [],
                  });
                }}
              />
            </TabsContent>
          </ScrollArea>
        </Tabs>

        {/* Credits/Rate limit alert */}
        {(errorCode === 'CREDITS_EXHAUSTED' || errorCode === 'RATE_LIMIT') && (
          <TopicCreditsAlert 
            errorCode={errorCode} 
            errorMessage={error || undefined}
            onRetry={errorCode === 'RATE_LIMIT' ? refresh : undefined}
            className="mt-2"
          />
        )}

        {/* Error display */}
        {error && errorCode !== 'CREDITS_EXHAUSTED' && errorCode !== 'RATE_LIMIT' && (
          <div className="mt-2 p-2 rounded bg-destructive/10 text-destructive text-xs">
            {error}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
