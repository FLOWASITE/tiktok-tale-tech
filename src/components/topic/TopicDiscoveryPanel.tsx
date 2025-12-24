import React, { useState, useMemo } from 'react';
import {
  Sparkles, TrendingUp, Leaf, Columns, History, RefreshCw,
  Filter, Search, ChevronDown, Lightbulb, X, ArrowUpDown, Trophy
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
import { TopicIdeaCard } from './TopicIdeaCard';
import { TopicHistoryTab } from './TopicHistoryTab';

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
            <div className="text-left">
              <span className="font-medium text-sm">Khám phá chủ đề</span>
              {source !== 'fallback' && (
                <Badge variant="secondary" className="ml-2 text-[10px] px-1.5 py-0">
                  {source === 'ai' ? 'AI' : 'Cache'}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
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
              onClick={refresh}
              disabled={isLoading || disabled}
            >
              <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
            </Button>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="space-y-3 p-3 rounded-lg bg-muted/30 animate-fade-in">
              {/* Sort and Score Filter Row */}
              <div className="flex gap-2 items-center">
                <div className="flex items-center gap-2 flex-1">
                  <ArrowUpDown className="w-4 h-4 text-muted-foreground shrink-0" />
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Sắp xếp" />
                    </SelectTrigger>
                    <SelectContent>
                      {SORT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value} className="text-xs">
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2 flex-1">
                  <Trophy className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <Slider
                      value={[minScore]}
                      onValueChange={([v]) => setMinScore(v)}
                      min={0}
                      max={100}
                      step={10}
                      className="w-full"
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-8">{minScore}+</span>
                </div>
              </div>

              {/* Other Filters Row */}
              <div className="flex gap-2">
                <Select value={selectedPillar} onValueChange={setSelectedPillar}>
                  <SelectTrigger className="h-8 text-xs flex-1">
                    <SelectValue placeholder="Pillar" />
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
                  <SelectTrigger className="h-8 text-xs flex-1">
                    <SelectValue placeholder="Tương tác" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">
                      Tất cả
                    </SelectItem>
                    {ENGAGEMENT_LEVELS.map((level) => (
                      <SelectItem key={level.value} value={level.value} className="text-xs">
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" className="h-8 px-2" onClick={clearFilters}>
                    <X className="w-3 h-3 mr-1" />
                    Xóa
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-5 h-9">
            <TabsTrigger value="ai" className="text-xs gap-1">
              <Sparkles className="w-3 h-3" />
              <span className="hidden sm:inline">Gợi ý AI</span>
            </TabsTrigger>
            <TabsTrigger value="trending" className="text-xs gap-1">
              <TrendingUp className="w-3 h-3" />
              <span className="hidden sm:inline">Trending</span>
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

        {/* Error display */}
        {error && (
          <div className="mt-2 p-2 rounded bg-destructive/10 text-destructive text-xs">
            {error}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
