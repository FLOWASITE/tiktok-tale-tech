import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Sparkles, 
  RefreshCw, 
  ChevronDown, 
  Lightbulb,
  Search,
  SlidersHorizontal,
  Library,
  FileEdit,
  ExternalLink,
  Database,
  Wand2
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
import { TopicIdeaCard } from '@/components/topic/TopicIdeaCard';
import { TopicEducationBadge } from './TopicEducationBadge';
import { useTopicHistory } from '@/hooks/useTopicHistory';
import { useEnhancedTopicSuggestions } from '@/hooks/useEnhancedTopicSuggestions';
import { 
  EnhancedTopicSuggestion, 
  TopicCategory,
  TopicFormat,
  SORT_OPTIONS, 
  SortOption,
  calculateOverallScore 
} from '@/types/topicDiscovery';

interface ScriptTopicDiscoveryPanelProps {
  onSelect: (topic: EnhancedTopicSuggestion) => void;
  disabled?: boolean;
  brandTemplateId?: string;
  contentGoal?: 'education' | 'awareness' | 'engagement' | 'expertise' | 'conversion';
}

const CATEGORY_FILTERS: { value: TopicCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'evergreen', label: 'Evergreen' },
  { value: 'trending', label: 'Trending' },
  { value: 'seasonal', label: 'Seasonal' },
  { value: 'reactive', label: 'Reactive' },
];

export function ScriptTopicDiscoveryPanel({
  onSelect,
  disabled = false,
  brandTemplateId,
  contentGoal = 'education',
}: ScriptTopicDiscoveryPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<TopicCategory | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('overall');
  const [minScore, setMinScore] = useState(0);

  // AI Suggestions - unified engine
  const {
    suggestions: aiSuggestions,
    source: aiSource,
    isEnhancing: aiLoading,
    refresh: refreshAI,
  } = useEnhancedTopicSuggestions({
    brandTemplateId,
    contentGoal,
    format: 'script',
    enabled: isOpen,
  });

  // Read topics from Topic Bank
  const { 
    history: bankTopics, 
    isLoading: bankLoading, 
    refresh: refreshBank,
    confirmDraft 
  } = useTopicHistory({
    brandTemplateId,
    excludeDrafts: false,
    enabled: isOpen,
  });

  // Convert bank topics to EnhancedTopicSuggestion format - preserve original format
  const bankSuggestions = useMemo((): (EnhancedTopicSuggestion & { _historyId?: string; _usageStatus?: string; _originalFormat?: string; _source: 'bank' })[] => {
    // Defensive check: ensure bankTopics is an array
    if (!Array.isArray(bankTopics)) return [];
    
    return bankTopics.map(item => ({
      topic: item.topic,
      category: item.category,
      pillar: item.pillar,
      scores: item.scores,
      relatedKeywords: item.relatedKeywords || [],
      reasoning: item.reasoning || '',
      formats: [item.format] as TopicFormat[],
      estimatedEngagement: (item.scores?.engagement && item.scores.engagement >= 70 ? 'high' : 
        item.scores?.engagement && item.scores.engagement >= 40 ? 'medium' : 'low') as 'high' | 'medium' | 'low',
      _historyId: item.id,
      _usageStatus: item.usageStatus,
      _originalFormat: item.format,
      _source: 'bank' as const,
    }));
  }, [bankTopics]);

  // Merge AI and Bank suggestions, deduplicate by topic
  const allSuggestions = useMemo(() => {
    const merged: (EnhancedTopicSuggestion & { _historyId?: string; _usageStatus?: string; _originalFormat?: string; _source: 'ai' | 'bank' })[] = [];
    const seenTopics = new Set<string>();

    // Defensive check: ensure aiSuggestions is an array
    const safeAiSuggestions = Array.isArray(aiSuggestions) ? aiSuggestions : [];
    
    // Add AI suggestions first (marked as AI source)
    safeAiSuggestions.forEach(s => {
      const key = s.topic.toLowerCase().trim();
      if (!seenTopics.has(key)) {
        seenTopics.add(key);
        merged.push({ ...s, _source: 'ai' });
      }
    });

    // Defensive check: ensure bankSuggestions is an array
    const safeBankSuggestions = Array.isArray(bankSuggestions) ? bankSuggestions : [];
    
    // Add bank suggestions (marked as bank source)
    safeBankSuggestions.forEach(s => {
      const key = s.topic.toLowerCase().trim();
      if (!seenTopics.has(key)) {
        seenTopics.add(key);
        merged.push(s);
      }
    });

    return merged;
  }, [aiSuggestions, bankSuggestions]);

  // Filter and sort suggestions - use merged allSuggestions
  const filteredSuggestions = useMemo(() => {
    let result = [...allSuggestions];

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
  }, [allSuggestions, searchQuery, categoryFilter, minScore, sortBy]);

  const hasActiveFilters = searchQuery.trim() || categoryFilter !== 'all' || minScore > 0;

  const clearFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setMinScore(0);
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
            <Library className="w-4 h-4 text-primary" />
            <span>Chủ đề từ Kho Ý tưởng</span>
            <ChevronDown className={cn(
              "w-4 h-4 transition-transform duration-200",
              isOpen && "rotate-180"
            )} />
          </button>
        </CollapsibleTrigger>

        <div className="flex items-center gap-2">
          {/* Source badge */}
          {aiSource === 'ai' && (
            <Badge variant="outline" className="text-[9px] px-1.5 h-4 gap-0.5 bg-primary/10 text-primary border-primary/30">
              <Sparkles className="w-2 h-2" />
              AI
            </Badge>
          )}
          
          {/* Topic count badge */}
          {allSuggestions.length > 0 && (
            <Badge variant="secondary" className="text-[10px] px-2 h-5">
              {allSuggestions.length} chủ đề
            </Badge>
          )}

          <TopicEducationBadge />

          {/* Refresh Button */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={refreshBank}
            disabled={bankLoading || disabled}
            className="h-6 w-6 p-0"
          >
            <RefreshCw className={cn(
              "w-3 h-3",
              bankLoading && "animate-spin"
            )} />
          </Button>
        </div>
      </div>

      <CollapsibleContent className="space-y-3">
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
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
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
                onValueChange={([v]) => setMinScore(v)}
                min={0}
                max={80}
                step={10}
                className="w-full"
              />
            </div>
          </div>
        )}

        {/* Topic Grid */}
        {bankLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-[200px] rounded-lg" />
            ))}
          </div>
        ) : filteredSuggestions.length === 0 ? (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
              <Library className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              {hasActiveFilters 
                ? 'Không tìm thấy chủ đề phù hợp với bộ lọc' 
                : 'Chưa có ý tưởng nào trong Kho'}
            </p>
            {hasActiveFilters ? (
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={clearFilters}
              >
                Xóa bộ lọc
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                asChild
                className="gap-1.5"
              >
                <Link to="/topics">
                  <Sparkles className="w-3.5 h-3.5" />
                  Khám phá Kho Ý tưởng
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredSuggestions.map((topic, idx) => {
              const isDraft = topic._usageStatus === 'draft';
              
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
                    onSave={isDraft && confirmDraft && topic._historyId ? () => {
                      confirmDraft(topic._historyId!);
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
        {!bankLoading && filteredSuggestions.length > 0 && (
          <p className="text-xs text-muted-foreground text-center">
            Hiển thị {filteredSuggestions.length}/{allSuggestions.length} chủ đề
          </p>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
