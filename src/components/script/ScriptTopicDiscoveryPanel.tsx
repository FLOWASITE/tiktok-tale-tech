import React, { useState, useMemo } from 'react';
import { 
  Sparkles, 
  RefreshCw, 
  ChevronDown, 
  Database, 
  Lightbulb,
  Search,
  Filter,
  SlidersHorizontal,
  Info,
  Library,
  FileEdit
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TopicIdeaCard } from '@/components/topic/TopicIdeaCard';
import { TopicEducationBadge } from './TopicEducationBadge';
import { useTopicHistory, TopicHistoryItem } from '@/hooks/useTopicHistory';
import { 
  EnhancedTopicSuggestion, 
  TopicCategory,
  TopicFormat,
  SORT_OPTIONS, 
  SortOption,
  calculateOverallScore 
} from '@/types/topicDiscovery';

interface ScriptTopicDiscoveryPanelProps {
  suggestions: EnhancedTopicSuggestion[];
  source: 'ai' | 'cache' | 'fallback';
  isLoading: boolean;
  onSelect: (topic: EnhancedTopicSuggestion) => void;
  onRefresh: () => void;
  disabled?: boolean;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  minScore: number;
  onMinScoreChange: (score: number) => void;
  brandTemplateId?: string;
}

type TabValue = 'ai' | 'bank';

const SOURCE_CONFIG = {
  ai: { icon: Sparkles, label: 'AI', tooltip: 'Gợi ý được tạo bởi AI dựa trên Brand của bạn', className: 'bg-primary/10 text-primary border-primary/30' },
  cache: { icon: Database, label: 'Cached', tooltip: 'Gợi ý từ cache để phản hồi nhanh hơn', className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30' },
  fallback: { icon: Lightbulb, label: 'Mặc định', tooltip: 'Gợi ý mặc định khi chưa có đủ thông tin Brand', className: 'bg-muted text-muted-foreground border-border' },
};

const CATEGORY_FILTERS: { value: TopicCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'evergreen', label: 'Evergreen' },
  { value: 'trending', label: 'Trending' },
  { value: 'seasonal', label: 'Seasonal' },
  { value: 'reactive', label: 'Reactive' },
];

export function ScriptTopicDiscoveryPanel({
  suggestions,
  source,
  isLoading,
  onSelect,
  onRefresh,
  disabled = false,
  sortBy,
  onSortChange,
  minScore,
  onMinScoreChange,
  brandTemplateId,
}: ScriptTopicDiscoveryPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<TopicCategory | 'all'>('all');
  const [activeTab, setActiveTab] = useState<TabValue>('ai');

  // Fetch topics from bank that are suitable for scripts
  const { 
    history: bankTopics, 
    isLoading: bankLoading, 
    refresh: refreshBank,
    confirmDraft 
  } = useTopicHistory({
    brandTemplateId,
    formats: ['script'],
    excludeDrafts: false,
    enabled: activeTab === 'bank',
  });

  const currentSource = SOURCE_CONFIG[source];
  const SourceIcon = currentSource.icon;

  // Convert bank topics to EnhancedTopicSuggestion format with extended props
  const bankSuggestions = useMemo((): (EnhancedTopicSuggestion & { _historyId?: string; _usageStatus?: string })[] => {
    return bankTopics.map(item => ({
      topic: item.topic,
      category: item.category,
      pillar: item.pillar,
      scores: item.scores,
      relatedKeywords: item.relatedKeywords || [],
      reasoning: item.reasoning || '',
      formats: ['script'] as TopicFormat[],
      estimatedEngagement: (item.scores?.engagement && item.scores.engagement >= 70 ? 'high' : 
        item.scores?.engagement && item.scores.engagement >= 40 ? 'medium' : 'low') as 'high' | 'medium' | 'low',
      // Store original item id for tracking
      _historyId: item.id,
      _usageStatus: item.usageStatus,
    }));
  }, [bankTopics]);

  // Get current suggestions based on active tab
  const currentSuggestions = activeTab === 'ai' ? suggestions : bankSuggestions;
  const currentLoading = activeTab === 'ai' ? isLoading : bankLoading;

  // Filter and sort suggestions - now uses currentSuggestions based on active tab
  const filteredSuggestions = useMemo(() => {
    let result = [...currentSuggestions];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        s => s.topic.toLowerCase().includes(query) ||
             s.relatedKeywords?.some(k => k.toLowerCase().includes(query))
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      result = result.filter(s => s.category === categoryFilter);
    }

    // Min score filter
    if (minScore > 0) {
      result = result.filter(s => {
        if (!s.scores) return true;
        const overall = calculateOverallScore(s.scores);
        return overall >= minScore;
      });
    }

    // Sort
    result.sort((a, b) => {
      if (!a.scores || !b.scores) return 0;
      
      if (sortBy === 'overall') {
        return calculateOverallScore(b.scores) - calculateOverallScore(a.scores);
      }
      return (b.scores[sortBy] || 0) - (a.scores[sortBy] || 0);
    });

    return result;
  }, [currentSuggestions, searchQuery, categoryFilter, minScore, sortBy]);

  const hasActiveFilters = searchQuery.trim() || categoryFilter !== 'all' || minScore > 0;

  const clearFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    onMinScoreChange(0);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <Sparkles className="w-4 h-4 text-primary" />
            <span>Khám phá chủ đề</span>
            <ChevronDown className={cn(
              "w-4 h-4 transition-transform duration-200",
              isOpen && "rotate-180"
            )} />
          </button>
        </CollapsibleTrigger>

        <div className="flex items-center gap-2">
          {/* Source Badge - only show for AI tab */}
          {activeTab === 'ai' && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-[10px] px-2 py-0 h-5 gap-1 border cursor-help",
                      currentSource.className
                    )}
                  >
                    <SourceIcon className="w-2.5 h-2.5" />
                    {currentSource.label}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">{currentSource.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          <TopicEducationBadge />

          {/* Refresh Button */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={activeTab === 'ai' ? onRefresh : refreshBank}
            disabled={currentLoading || disabled}
            className="h-6 w-6 p-0"
          >
            <RefreshCw className={cn(
              "w-3 h-3",
              currentLoading && "animate-spin"
            )} />
          </Button>
        </div>
      </div>

      <CollapsibleContent className="space-y-3">
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} className="w-full">
          <TabsList className="grid grid-cols-2 h-8">
            <TabsTrigger value="ai" className="text-xs gap-1.5">
              <Sparkles className="w-3 h-3" />
              Gợi ý AI
              {suggestions.length > 0 && (
                <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                  {suggestions.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="bank" className="text-xs gap-1.5">
              <Library className="w-3 h-3" />
              Từ Kho ý tưởng
              {bankTopics.length > 0 && (
                <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                  {bankTopics.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        {/* Search & Filter Bar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm chủ đề..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-7 text-xs"
              disabled={disabled}
            />
          </div>
          
          <Button
            type="button"
            variant={showFilters ? "secondary" : "outline"}
            size="sm"
            className={cn("h-8 gap-1 text-xs", hasActiveFilters && "border-primary text-primary")}
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Lọc
            {hasActiveFilters && (
              <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
                !
              </span>
            )}
          </Button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="p-3 bg-muted/30 rounded-lg space-y-3 border border-border/50 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">Bộ lọc nâng cao</span>
              {hasActiveFilters && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-muted-foreground"
                  onClick={clearFilters}
                >
                  Xóa bộ lọc
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Sort */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Sắp xếp theo</Label>
                <Select value={sortBy} onValueChange={(v) => onSortChange(v as SortOption)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Loại chủ đề</Label>
                <Select 
                  value={categoryFilter} 
                  onValueChange={(v) => setCategoryFilter(v as TopicCategory | 'all')}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_FILTERS.map(cat => (
                      <SelectItem key={cat.value} value={cat.value} className="text-xs">
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Min Score Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Điểm tối thiểu</Label>
                <span className="text-xs font-medium">{minScore}</span>
              </div>
              <Slider
                value={[minScore]}
                onValueChange={([v]) => onMinScoreChange(v)}
                min={0}
                max={80}
                step={10}
                className="w-full"
              />
            </div>
          </div>
        )}

        {/* Topic Grid */}
        {currentLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-[200px] rounded-lg" />
            ))}
          </div>
        ) : filteredSuggestions.length === 0 ? (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
              {activeTab === 'bank' ? (
                <Library className="w-5 h-5 text-muted-foreground" />
              ) : (
                <Search className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {hasActiveFilters 
                ? 'Không tìm thấy chủ đề phù hợp với bộ lọc' 
                : activeTab === 'bank'
                  ? 'Chưa có ý tưởng nào cho định dạng Script trong Kho'
                  : 'Chưa có gợi ý chủ đề'}
            </p>
            {hasActiveFilters && (
              <Button
                type="button"
                variant="link"
                size="sm"
                className="mt-2"
                onClick={clearFilters}
              >
                Xóa bộ lọc
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredSuggestions.map((topic, idx) => {
              const extendedTopic = topic as EnhancedTopicSuggestion & { _historyId?: string; _usageStatus?: string };
              const isDraft = extendedTopic._usageStatus === 'draft';
              
              return (
                <div 
                  key={`${topic.topic}-${idx}`}
                  className={cn(
                    isDraft && "opacity-80 border-dashed"
                  )}
                >
                  <TopicIdeaCard
                    topic={topic}
                    onSelect={onSelect}
                    disabled={disabled}
                    isDraft={isDraft}
                    onSave={isDraft && confirmDraft && extendedTopic._historyId ? () => {
                      confirmDraft(extendedTopic._historyId!);
                    } : undefined}
                  />
                  {isDraft && (
                    <div className="mt-1 flex items-center gap-1 px-2">
                      <FileEdit className="w-3 h-3 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">Nháp - Nhấn "Giữ lại" để lưu</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Results count */}
        {!currentLoading && filteredSuggestions.length > 0 && (
          <p className="text-xs text-muted-foreground text-center">
            Hiển thị {filteredSuggestions.length}/{currentSuggestions.length} chủ đề
          </p>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
