import { useState, useCallback, useEffect, useMemo, createElement } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Search, BarChart3, FolderOpen, Star, Trash2, RotateCcw, X, Pin, List, LayoutGrid, ArrowUpDown, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTopicHistory } from '@/hooks/useTopicHistory';
import { useCurrentBrand } from '@/contexts/BrandContext';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Lightbulb, 
  RefreshCw, 
  ChevronDown, 
  Sparkles, 
  Database, 
  BookOpen, 
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  Bookmark,
  Leaf,
  TrendingUp,
  Calendar,
  Zap,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { 
  EnhancedTopicSuggestion, 
  calculateOverallScore, 
  TopicCategory,
  TOPIC_CATEGORIES 
} from '@/types/topicDiscovery';
import { toast } from 'sonner';
import { QuickStartSection } from '@/components/QuickStartSection';
import { TopicPerformancePreview } from '@/components/TopicPerformancePreview';
import { SimilarTopicsSuggestion } from '@/components/SimilarTopicsSuggestion';
import { QuickStartTemplate, ContentGoal } from '@/types/quickStartTemplates';
import { CONTENT_GOALS } from '@/types/multichannel';

interface TopicSuggestionPanelProps {
  suggestions: string[] | EnhancedTopicSuggestion[];
  source: 'ai' | 'cache' | 'fallback';
  isLoading: boolean;
  onSelect: (suggestion: string, topicHistoryId?: string) => void;
  onRefresh: () => void;
  onSave?: (suggestion: EnhancedTopicSuggestion) => void;
  onFeedback?: (suggestion: EnhancedTopicSuggestion, feedback: 'positive' | 'negative') => void;
  disabled?: boolean;
  showNavigateToTopics?: boolean;
  showEnhancedInfo?: boolean;
  showQuickStart?: boolean;
  contentGoal?: ContentGoal;
  onSelectQuickStart?: (template: QuickStartTemplate) => void;
  brandTemplateId?: string;
}

const LOADING_PHASES = [
  { icon: Search, label: '🔍 Đang phân tích thương hiệu...', delay: 0 },
  { icon: BarChart3, label: '📊 Đang tìm xu hướng ngành...', delay: 2000 },
  { icon: Sparkles, label: '✨ Đang tạo ý tưởng...', delay: 5000 },
];

function LoadingPhases() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timer1 = setTimeout(() => setPhase(1), 2000);
    const timer2 = setTimeout(() => setPhase(2), 5000);
    return () => { clearTimeout(timer1); clearTimeout(timer2); };
  }, []);

  return (
    <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-muted/30 border border-border/50 animate-fade-in">
      <Loader2 className="w-3.5 h-3.5 animate-spin text-primary shrink-0" />
      <span className="text-xs text-muted-foreground">
        {LOADING_PHASES[phase].label}
      </span>
      <div className="flex gap-1 ml-auto">
        {LOADING_PHASES.map((_, i) => (
          <div
            key={i}
            className={cn(
              "w-1.5 h-1.5 rounded-full transition-colors duration-300",
              i <= phase ? "bg-primary" : "bg-border"
            )}
          />
        ))}
      </div>
    </div>
  );
}

const categoryIcons: Record<TopicCategory, React.ReactNode> = {
  evergreen: <Leaf className="w-2.5 h-2.5" />,
  trending: <TrendingUp className="w-2.5 h-2.5" />,
  seasonal: <Calendar className="w-2.5 h-2.5" />,
  reactive: <Zap className="w-2.5 h-2.5" />,
};

const categoryColors: Record<TopicCategory, string> = {
  evergreen: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  trending: 'bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/30',
  seasonal: 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30',
  reactive: 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30',
};

export function TopicSuggestionPanel({
  suggestions,
  source,
  isLoading,
  onSelect,
  onRefresh,
  onSave,
  onFeedback,
  disabled = false,
  showNavigateToTopics = true,
  showEnhancedInfo = true,
  showQuickStart = false,
  contentGoal,
  onSelectQuickStart,
  brandTemplateId,
}: TopicSuggestionPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [feedbackGiven, setFeedbackGiven] = useState<Set<string>>(new Set());
  const [savedTopics, setSavedTopics] = useState<Set<string>>(new Set());
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'unused' | 'favorites' | 'used'>('all');
  const [historyGoalFilter, setHistoryGoalFilter] = useState<ContentGoal | 'all'>('all');
  const [historySearch, setHistorySearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [historySortBy, setHistorySortBy] = useState<'newest' | 'oldest' | 'score' | 'az'>('newest');
  const [historyViewMode, setHistoryViewMode] = useState<'list' | 'grid'>('list');
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<Set<string>>(new Set());
  const [historyPage, setHistoryPage] = useState(1);
  const navigate = useNavigate();
  const { currentBrand } = useCurrentBrand();
  const effectiveBrandId = brandTemplateId || currentBrand?.id;

  const { history: topicHistory, isLoading: historyLoading, markAsSelected, ensureSelectedTopic, toggleFavorite, deleteTopic, pinTopic, bulkDelete, bulkToggleFavorite } = useTopicHistory({
    enabled: true,
    brandTemplateId: effectiveBrandId,
  });

  const historyItems = useMemo(() => topicHistory.slice(0, 30), [topicHistory]);

  const filteredHistory = useMemo(() => {
    let items = historyItems;
    
    // Apply tab filter
    switch (historyFilter) {
      case 'unused':
        items = items.filter(item => !['created', 'published'].includes(item.usageStatus));
        break;
      case 'favorites':
        items = items.filter(item => item.isFavorite);
        break;
      case 'used':
        items = items.filter(item => ['created', 'published'].includes(item.usageStatus));
        break;
    }

    // Apply content goal filter
    if (historyGoalFilter !== 'all') {
      items = items.filter(item => item.contentGoal === historyGoalFilter);
    }

    // Apply search
    if (historySearch.trim()) {
      const q = historySearch.toLowerCase();
      items = items.filter(item => item.topic.toLowerCase().includes(q));
    }

    // Apply sort
    items = [...items].sort((a, b) => {
      // Pinned items always first
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      switch (historySortBy) {
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'score':
          return (b.performanceScore || 0) - (a.performanceScore || 0);
        case 'az':
          return a.topic.localeCompare(b.topic, 'vi');
        default: // newest
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return items;
  }, [historyItems, historyFilter, historySearch, historySortBy, historyGoalFilter]);

  const ITEMS_PER_PAGE = 20;
  const totalHistoryPages = Math.ceil(filteredHistory.length / ITEMS_PER_PAGE);
  const paginatedHistory = useMemo(() => 
    filteredHistory.slice((historyPage - 1) * ITEMS_PER_PAGE, historyPage * ITEMS_PER_PAGE),
    [filteredHistory, historyPage]
  );

  // Reset page when filters change
  useEffect(() => {
    setHistoryPage(1);
  }, [historyFilter, historySearch, historySortBy, historyGoalFilter]);

  const allCount = historyItems.length;
  const unusedCount = useMemo(() => historyItems.filter(item => !['created', 'published'].includes(item.usageStatus)).length, [historyItems]);
  const favCount = useMemo(() => historyItems.filter(item => item.isFavorite).length, [historyItems]);
  const usedCount = useMemo(() => historyItems.filter(item => ['created', 'published'].includes(item.usageStatus)).length, [historyItems]);
  const usagePercent = allCount > 0 ? Math.round((usedCount / allCount) * 100) : 0;

  // Goal counts for filter badges
  const goalCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const goal of CONTENT_GOALS) {
      counts[goal.value] = historyItems.filter(item => item.contentGoal === goal.value).length;
    }
    return counts;
  }, [historyItems]);

  const toggleSelectItem = useCallback((id: string) => {
    setSelectedHistoryIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleBulkDelete = useCallback(async () => {
    await bulkDelete(Array.from(selectedHistoryIds));
    setSelectedHistoryIds(new Set());
  }, [bulkDelete, selectedHistoryIds]);

  const handleBulkFavorite = useCallback(async () => {
    await bulkToggleFavorite(Array.from(selectedHistoryIds), true);
    setSelectedHistoryIds(new Set());
  }, [bulkToggleFavorite, selectedHistoryIds]);

  const handleExportCSV = useCallback(() => {
    const csv = ['Chủ đề,Danh mục,Trạng thái,Ngày tạo,Yêu thích,Điểm'];
    filteredHistory.forEach(item => {
      csv.push([
        `"${item.topic}"`,
        item.category,
        item.usageStatus,
        new Date(item.createdAt).toLocaleDateString('vi-VN'),
        item.isFavorite ? 'Có' : 'Không',
        item.performanceScore ?? '',
      ].join(','));
    });
    const blob = new Blob([csv.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kho-chu-de.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Đã xuất CSV');
  }, [filteredHistory]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return { label: 'Đã đăng', className: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' };
      case 'created':
        return { label: 'Đã tạo', className: 'bg-purple-500/20 text-purple-600 dark:text-purple-400' };
      case 'selected':
        return { label: 'Đã chọn', className: 'bg-blue-500/20 text-blue-600 dark:text-blue-400' };
      default:
        return { label: 'Ý tưởng', className: 'bg-muted text-muted-foreground' };
    }
  };

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'trending': return <TrendingUp className="w-3 h-3 text-orange-500" />;
      case 'seasonal': return <Calendar className="w-3 h-3 text-purple-500" />;
      case 'reactive': return <Zap className="w-3 h-3 text-red-500" />;
      default: return <Leaf className="w-3 h-3 text-emerald-500" />;
    }
  };

  const sourceConfig = {
    ai: { icon: Sparkles, label: 'AI', className: 'bg-primary/10 text-primary border-primary/30' },
    cache: { icon: Database, label: 'Cached', className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30' },
    fallback: { icon: Lightbulb, label: 'Mặc định', className: 'bg-muted text-muted-foreground border-border' },
  };

  const currentSource = sourceConfig[source];
  const SourceIcon = currentSource.icon;

  // Normalize suggestions to handle both string[] and EnhancedTopicSuggestion[]
  const normalizedSuggestions: EnhancedTopicSuggestion[] = suggestions.map(s => {
    if (typeof s === 'string') {
      return { 
        topic: s, 
        category: 'evergreen' as TopicCategory,
        formats: ['multichannel'],
        estimatedEngagement: 'medium' as const,
        reasoning: '',
        relatedKeywords: [],
      };
    }
    return s;
  });

  const handleSave = useCallback((suggestion: EnhancedTopicSuggestion, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSave) {
      onSave(suggestion);
      setSavedTopics(prev => new Set([...prev, suggestion.topic]));
      toast.success('Đã lưu vào Kho ý tưởng');
    }
  }, [onSave]);

  const handleFeedback = useCallback((
    suggestion: EnhancedTopicSuggestion, 
    feedback: 'positive' | 'negative',
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    if (onFeedback) {
      onFeedback(suggestion, feedback);
      setFeedbackGiven(prev => new Set([...prev, suggestion.topic]));
      toast.success(feedback === 'positive' ? 'Cảm ơn! AI sẽ gợi ý tốt hơn' : 'Đã ghi nhận');
    }
  }, [onFeedback]);

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400';
    if (score >= 50) return 'bg-amber-500/20 text-amber-600 dark:text-amber-400';
    return 'bg-muted text-muted-foreground';
  };

  const getEngagementBadge = (level: 'high' | 'medium' | 'low') => {
    const config = {
      high: { label: 'Hot', className: 'bg-red-500/20 text-red-600' },
      medium: { label: 'OK', className: 'bg-amber-500/20 text-amber-600' },
      low: { label: '—', className: 'bg-muted text-muted-foreground' },
    };
    return config[level];
  };

  return (
    <TooltipProvider>
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-1.5 xs:space-y-2">
        <div className="flex items-center justify-between">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-1 xs:gap-1.5 text-[10px] xs:text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Lightbulb className="w-2.5 h-2.5 xs:w-3 xs:h-3" />
              <span>Gợi ý chủ đề</span>
              <ChevronDown className={cn(
                "w-2.5 h-2.5 xs:w-3 xs:h-3 transition-transform duration-200",
                isOpen && "rotate-180"
              )} />
            </button>
          </CollapsibleTrigger>

          <div className="flex items-center gap-1.5 xs:gap-2">
            {/* Topic History Button */}
            <Popover open={historyOpen} onOpenChange={setHistoryOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-5 xs:h-6 text-[10px] xs:text-[11px] px-2 xs:px-2.5 gap-1 rounded-full bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 hover:border-primary/50 transition-all"
                >
                  <FolderOpen className="w-2.5 h-2.5 xs:w-3 xs:h-3" />
                  Kho chủ đề {allCount > 0 && `(${allCount})`}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[40rem] p-0">
                {/* Header with search, sort, view toggle */}
                <div className="p-2.5 border-b border-border/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold">Kho chủ đề của bạn</p>
                    <div className="flex items-center gap-1.5">
                      {/* View mode toggle */}
                      <div className="flex items-center border rounded-md overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setHistoryViewMode('list')}
                          className={cn("p-1 transition-colors", historyViewMode === 'list' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground')}
                        >
                          <List className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setHistoryViewMode('grid')}
                          className={cn("p-1 transition-colors", historyViewMode === 'grid' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground')}
                        >
                          <LayoutGrid className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{allCount} chủ đề</span>
                    </div>
                  </div>

                  {/* Usage progress bar */}
                  {allCount > 0 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="space-y-0.5">
                          <Progress value={usagePercent} className="h-1.5" />
                          <p className="text-[9px] text-muted-foreground text-right">{usagePercent}% đã sử dụng</p>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-xs">
                        <p>{usedCount} đã dùng / {unusedCount} chưa dùng / {favCount} yêu thích</p>
                      </TooltipContent>
                    </Tooltip>
                  )}

                  {/* Search + Sort */}
                  <div className="flex gap-1.5">
                    <div className="relative flex-1">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                      <Input
                        placeholder="Tìm chủ đề..."
                        value={historySearch}
                        onChange={(e) => setHistorySearch(e.target.value)}
                        className="h-7 text-[11px] pl-7 pr-7 bg-muted/30 border-border/40"
                      />
                      {historySearch && (
                        <button
                          type="button"
                          onClick={() => setHistorySearch('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <Select value={historySortBy} onValueChange={(v) => setHistorySortBy(v as any)}>
                      <SelectTrigger className="h-7 w-28 text-[10px] border-border/40">
                        <ArrowUpDown className="w-3 h-3 mr-1" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newest" className="text-xs">Mới nhất</SelectItem>
                        <SelectItem value="oldest" className="text-xs">Cũ nhất</SelectItem>
                        <SelectItem value="score" className="text-xs">Điểm cao</SelectItem>
                        <SelectItem value="az" className="text-xs">A-Z</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Filter tabs */}
                  <div className="flex gap-1 flex-wrap">
                    {([
                      { key: 'all' as const, label: 'Tất cả', count: allCount },
                      { key: 'unused' as const, label: 'Chưa dùng', count: unusedCount },
                      { key: 'favorites' as const, label: '⭐ Yêu thích', count: favCount },
                      { key: 'used' as const, label: '✅ Đã tạo', count: usedCount },
                    ]).map(tab => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setHistoryFilter(tab.key)}
                        className={cn(
                          "h-5.5 px-2 rounded-full text-[10px] font-medium transition-colors inline-flex items-center gap-1",
                          historyFilter === tab.key
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        )}
                      >
                        {tab.label}
                        <span className="text-[9px] opacity-80">({tab.count})</span>
                      </button>
                    ))}
                  </div>

                  {/* Content Goal filter */}
                  <div className="flex gap-1 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setHistoryGoalFilter('all')}
                      className={cn(
                        "h-5 px-1.5 rounded-full text-[10px] font-medium transition-colors inline-flex items-center gap-0.5",
                        historyGoalFilter === 'all'
                          ? "bg-primary/15 text-primary border border-primary/30"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted/80 border border-transparent"
                      )}
                    >
                      Tất cả
                    </button>
                    {CONTENT_GOALS.map(goal => (
                      <button
                        key={goal.value}
                        type="button"
                        onClick={() => setHistoryGoalFilter(goal.value)}
                        className={cn(
                          "h-5 px-1.5 rounded-full text-[10px] font-medium transition-colors inline-flex items-center gap-0.5",
                          historyGoalFilter === goal.value
                            ? "bg-primary/15 text-primary border border-primary/30"
                            : "bg-muted/50 text-muted-foreground hover:bg-muted/80 border border-transparent"
                        )}
                      >
                        {createElement(goal.icon, { className: "w-3 h-3" })}
                        {goal.label}
                        {goalCounts[goal.value] > 0 && (
                          <span className="text-[9px] opacity-70">({goalCounts[goal.value]})</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* List / Grid */}
                <div className="max-h-72 overflow-y-auto scrollbar-thin">
                  {historyLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredHistory.length === 0 ? (
                    <div className="text-center py-8 px-4">
                      {historyFilter === 'favorites' ? (
                        <>
                          <Star className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                          <p className="text-xs text-muted-foreground">Chưa có chủ đề yêu thích</p>
                          <p className="text-[10px] text-muted-foreground/60 mt-1">Bấm ⭐ trên chủ đề để lưu</p>
                        </>
                      ) : historyFilter === 'used' ? (
                        <>
                          <BarChart3 className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                          <p className="text-xs text-muted-foreground">Chưa có nội dung nào được tạo</p>
                          <p className="text-[10px] text-muted-foreground/60 mt-1">Chọn gợi ý bên dưới để bắt đầu</p>
                        </>
                      ) : historySearch ? (
                        <>
                          <Search className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                          <p className="text-xs text-muted-foreground">Không tìm thấy "{historySearch}"</p>
                        </>
                      ) : (
                        <>
                          <FolderOpen className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                          <p className="text-xs text-muted-foreground">Chưa có chủ đề nào</p>
                          <p className="text-[10px] text-muted-foreground/60 mt-1">Chọn gợi ý bên dưới để bắt đầu</p>
                        </>
                      )}
                    </div>
                  ) : historyViewMode === 'grid' ? (
                    /* Grid view */
                    <div className="grid grid-cols-2 gap-1.5 p-2">
                      {paginatedHistory.map((item) => (
                        <HoverCard key={item.id} openDelay={800}>
                          <HoverCardTrigger asChild>
                            <button
                              type="button"
                              onClick={() => {
                                onSelect(item.topic, item.id);
                                if (item.usageStatus === 'draft' || item.usageStatus === 'suggested') {
                                  markAsSelected(item.id);
                                }
                                setHistoryOpen(false);
                              }}
                              className={cn(
                                "group relative text-left p-2 rounded-md border border-border/40 hover:border-primary/30 hover:bg-muted/50 transition-all",
                                item.isPinned && "border-primary/20 bg-primary/5"
                              )}
                            >
                              <div className="flex items-start gap-1.5">
                                {getCategoryIcon(item.category)}
                                <p className="text-[10px] font-medium line-clamp-2 flex-1">{item.topic}</p>
                              </div>
                              <div className="flex items-center justify-between mt-1.5">
                                {item.isPinned && <Pin className="w-2.5 h-2.5 text-primary" />}
                                {item.isFavorite && <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />}
                                {!item.isPinned && !item.isFavorite && <span />}
                                <Checkbox
                                  checked={selectedHistoryIds.has(item.id)}
                                  onCheckedChange={() => toggleSelectItem(item.id)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity"
                                />
                              </div>
                            </button>
                          </HoverCardTrigger>
                          <HoverCardContent side="left" className="w-64 text-xs space-y-2">
                            <p className="font-semibold">{item.topic}</p>
                            {item.reasoning && <p className="text-muted-foreground text-[10px]">{item.reasoning}</p>}
                            {item.relatedKeywords && item.relatedKeywords.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {item.relatedKeywords.map((kw, i) => (
                                  <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-muted">{kw}</span>
                                ))}
                              </div>
                            )}
                            {item.scores && (
                              <div className="grid grid-cols-2 gap-1 text-[10px]">
                                {Object.entries(item.scores).map(([k, v]) => (
                                  <div key={k} className="flex justify-between">
                                    <span className="text-muted-foreground capitalize">{k}</span>
                                    <span className="font-medium">{typeof v === 'number' ? v : '-'}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            <TopicPerformancePreview topicHistoryId={item.id} />
                            <SimilarTopicsSuggestion
                              currentItem={item}
                              allItems={historyItems}
                              onSelect={(topic, id) => {
                                onSelect(topic, id);
                                setHistoryOpen(false);
                              }}
                            />
                          </HoverCardContent>
                        </HoverCard>
                      ))}
                    </div>
                  ) : (
                    /* List view */
                    <div className="py-0.5">
                      {paginatedHistory.map((item) => {
                        const statusBadge = getStatusBadge(item.usageStatus);
                        const score = item.performanceScore;
                        const isDeleting = deletingId === item.id;
                        return (
                          <HoverCard key={item.id} openDelay={800}>
                            <HoverCardTrigger asChild>
                              <div
                                className={cn(
                                  "group relative w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors flex items-start gap-2",
                                  item.isPinned && "bg-primary/5"
                                )}
                              >
                                {/* Checkbox on hover */}
                                <Checkbox
                                  checked={selectedHistoryIds.has(item.id)}
                                  onCheckedChange={() => toggleSelectItem(item.id)}
                                  className={cn(
                                    "h-3.5 w-3.5 mt-0.5 shrink-0 transition-opacity",
                                    selectedHistoryIds.size > 0 ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                  )}
                                />

                                {/* Main clickable area */}
                                <button
                                  type="button"
                                  className="flex items-start gap-2 flex-1 min-w-0 text-left"
                                  onClick={() => {
                                    onSelect(item.topic, item.id);
                                    if (item.usageStatus === 'draft' || item.usageStatus === 'suggested') {
                                      markAsSelected(item.id);
                                    }
                                    setHistoryOpen(false);
                                  }}
                                >
                                  <span className="mt-0.5 shrink-0">
                                    {getCategoryIcon(item.category)}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1">
                                      {item.isPinned && <Pin className="w-2.5 h-2.5 text-primary shrink-0" />}
                                      <p className="text-xs truncate font-medium">{item.topic}</p>
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                      <span className="text-[10px] text-muted-foreground">
                                        {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                                      </span>
                                      <Badge variant="secondary" className={cn("text-[8px] h-3.5 px-1 border-0", statusBadge.className)}>
                                        {statusBadge.label}
                                      </Badge>
                                      {score != null && score > 0 && (
                                        <span className={cn(
                                          "text-[9px] font-semibold px-1.5 py-0.5 rounded-full",
                                          score >= 75 ? 'bg-emerald-500/20 text-emerald-600' :
                                          score >= 50 ? 'bg-amber-500/20 text-amber-600' :
                                          'bg-muted text-muted-foreground'
                                        )}>
                                          {score}
                                        </span>
                                      )}
                                      {item.relatedKeywords && item.relatedKeywords.length > 0 && (
                                        <div className="hidden group-hover:flex items-center gap-0.5">
                                          {item.relatedKeywords.slice(0, 2).map((kw, i) => (
                                            <span key={i} className="text-[8px] px-1 py-0 rounded bg-muted text-muted-foreground">
                                              {kw}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </button>

                                {/* Hover actions */}
                                <div className="hidden group-hover:flex items-center gap-0.5 shrink-0 mt-0.5">
                                  {/* Pin toggle */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      pinTopic(item.id);
                                    }}
                                    className={cn("p-1 rounded transition-colors", item.isPinned ? "text-primary bg-primary/10" : "hover:bg-muted text-muted-foreground")}
                                    title={item.isPinned ? 'Bỏ ghim' : 'Ghim lên đầu'}
                                  >
                                    <Pin className="w-3 h-3" />
                                  </button>

                                  {/* Favorite toggle */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleFavorite(item.id);
                                    }}
                                    className="p-1 rounded hover:bg-amber-500/10 transition-colors"
                                    title={item.isFavorite ? 'Bỏ yêu thích' : 'Yêu thích'}
                                  >
                                    <Star className={cn(
                                      "w-3 h-3",
                                      item.isFavorite ? "text-amber-500 fill-amber-500" : "text-muted-foreground"
                                    )} />
                                  </button>

                                  {/* Reuse */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onSelect(item.topic, item.id);
                                      if (item.usageStatus === 'draft' || item.usageStatus === 'suggested') {
                                        markAsSelected(item.id);
                                      }
                                      setHistoryOpen(false);
                                    }}
                                    className="p-1 rounded hover:bg-primary/10 transition-colors"
                                    title="Dùng lại"
                                  >
                                    <RotateCcw className="w-3 h-3 text-primary" />
                                  </button>

                                  {/* Delete */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (isDeleting) {
                                        deleteTopic(item.id);
                                        setDeletingId(null);
                                      } else {
                                        setDeletingId(item.id);
                                        setTimeout(() => setDeletingId(null), 3000);
                                      }
                                    }}
                                    className={cn(
                                      "p-1 rounded transition-colors",
                                      isDeleting ? "bg-destructive/10 text-destructive" : "hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                                    )}
                                    title={isDeleting ? 'Click lần nữa để xóa' : 'Xóa'}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>

                                {/* Favorite indicator (visible when not hovering) */}
                                {item.isFavorite && (
                                  <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0 mt-1 group-hover:hidden" />
                                )}
                              </div>
                            </HoverCardTrigger>
                            <HoverCardContent side="left" className="w-64 text-xs space-y-2">
                              <p className="font-semibold">{item.topic}</p>
                              {item.reasoning && <p className="text-muted-foreground text-[10px]">{item.reasoning}</p>}
                              {item.relatedKeywords && item.relatedKeywords.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {item.relatedKeywords.map((kw, i) => (
                                    <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-muted">{kw}</span>
                                  ))}
                                </div>
                              )}
                              {item.scores && (
                                <div className="grid grid-cols-2 gap-1 text-[10px]">
                                  {Object.entries(item.scores).map(([k, v]) => (
                                    <div key={k} className="flex justify-between">
                                      <span className="text-muted-foreground capitalize">{k}</span>
                                      <span className="font-medium">{typeof v === 'number' ? v : '-'}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              <TopicPerformancePreview topicHistoryId={item.id} />
                              <SimilarTopicsSuggestion
                                currentItem={item}
                                allItems={historyItems}
                                onSelect={(topic, id) => {
                                  onSelect(topic, id);
                                  setHistoryOpen(false);
                                }}
                              />
                            </HoverCardContent>
                          </HoverCard>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Footer with bulk actions or navigation */}
                {/* Pagination */}
                {totalHistoryPages > 1 && (
                  <div className="border-t border-border/60 px-2 py-1.5 flex items-center justify-between">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      disabled={historyPage === 1}
                      onClick={() => setHistoryPage(p => p - 1)}
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </Button>
                    <span className="text-[10px] text-muted-foreground">
                      Trang {historyPage}/{totalHistoryPages}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      disabled={historyPage === totalHistoryPages}
                      onClick={() => setHistoryPage(p => p + 1)}
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}

                {/* Footer with bulk actions or navigation */}
                <div className="border-t border-border/60 p-2">
                  {selectedHistoryIds.size > 0 ? (
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">{selectedHistoryIds.size} đã chọn</span>
                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[10px] px-2 gap-1"
                          onClick={handleBulkFavorite}
                        >
                          <Star className="w-3 h-3" />
                          Yêu thích
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[10px] px-2 gap-1 text-destructive hover:text-destructive"
                          onClick={handleBulkDelete}
                        >
                          <Trash2 className="w-3 h-3" />
                          Xóa
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[10px] px-2"
                          onClick={() => setSelectedHistoryIds(new Set())}
                        >
                          Bỏ chọn
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={handleExportCSV}
                        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Download className="w-3 h-3" />
                        Xuất CSV
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setHistoryOpen(false);
                          navigate('/topics');
                        }}
                        className="flex items-center gap-1.5 text-[10px] font-medium text-primary hover:underline"
                      >
                        <BookOpen className="w-3 h-3" />
                        Xem tất cả trong Kho Ý Tưởng
                        <ExternalLink className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {/* Source Badge */}
            <Badge 
              variant="outline" 
              className={cn(
                "text-[9px] xs:text-[10px] px-1.5 xs:px-2 py-0 h-4 xs:h-5 gap-0.5 xs:gap-1 border",
                currentSource.className
              )}
            >
              <SourceIcon className="w-2 h-2 xs:w-2.5 xs:h-2.5" />
              {currentSource.label}
            </Badge>

            {/* Refresh Button */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onRefresh()}
              disabled={isLoading || disabled}
              className="h-5 xs:h-6 w-5 xs:w-6 p-0"
            >
              <RefreshCw className={cn(
                "w-2.5 h-2.5 xs:w-3 xs:h-3",
                isLoading && "animate-spin"
              )} />
            </Button>
          </div>
        </div>

        <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
          {isLoading ? (
            <LoadingPhases />
          ) : (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5 xs:gap-2">
                {normalizedSuggestions.map((suggestion, idx) => {
                  const score = suggestion.scores ? calculateOverallScore(suggestion.scores) : undefined;
                  const hasFeedback = feedbackGiven.has(suggestion.topic);
                  const isSaved = savedTopics.has(suggestion.topic);
                  const category = suggestion.category || 'evergreen';
                  const engagement = getEngagementBadge(suggestion.estimatedEngagement || 'medium');

                  return (
                    <Tooltip key={idx}>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            "group relative inline-flex items-center gap-1 px-2 xs:px-2.5 py-1 xs:py-1.5 rounded-full border cursor-pointer transition-all text-[10px] xs:text-xs",
                            "bg-background hover:bg-primary/5 hover:border-primary/50 hover:shadow-sm",
                            "active:scale-[0.98]",
                            disabled && "opacity-50 cursor-not-allowed hover:bg-background hover:border-border"
                          )}
                          onClick={async () => {
                            if (disabled) return;
                            const historyId = await ensureSelectedTopic(suggestion.topic);
                            onSelect(suggestion.topic, historyId || undefined);
                          }}
                        >
                          {/* Category Icon */}
                          {showEnhancedInfo && (
                            <span className={cn(
                              "inline-flex items-center justify-center w-4 h-4 rounded-full",
                              categoryColors[category]
                            )}>
                              {categoryIcons[category]}
                            </span>
                          )}

                          {/* Topic Text */}
                          <span className="truncate max-w-[140px] xs:max-w-[180px]" title={suggestion.topic}>
                            {suggestion.topic.length > 30 ? suggestion.topic.slice(0, 30) + '...' : suggestion.topic}
                          </span>

                          {/* Score Badge */}
                          {score !== undefined && showEnhancedInfo && (
                            <span className={cn(
                              "text-[8px] xs:text-[9px] font-semibold px-1.5 py-0.5 rounded-full",
                              getScoreColor(score)
                            )}>
                              {score}
                            </span>
                          )}

                          {/* Engagement Indicator */}
                          {suggestion.estimatedEngagement === 'high' && showEnhancedInfo && (
                            <span className={cn(
                              "text-[7px] xs:text-[8px] font-bold px-1 py-0.5 rounded uppercase",
                              engagement.className
                            )}>
                              🔥
                            </span>
                          )}

                          {/* Seasonal Event Badge */}
                          {suggestion.relatedEvent && showEnhancedInfo && (
                            <span className="text-[8px] px-1 py-0.5 rounded bg-purple-500/20 text-purple-600">
                              📅
                            </span>
                          )}

                          {/* Action Buttons - Show on Hover */}
                          {(onSave || onFeedback) && !disabled && (
                            <div className="hidden group-hover:flex items-center gap-0.5 ml-1">
                              {onSave && !isSaved && (
                                <button
                                  type="button"
                                  onClick={(e) => handleSave(suggestion, e)}
                                  className="p-0.5 hover:bg-primary/20 rounded transition-colors"
                                  title="Lưu vào Kho ý tưởng"
                                >
                                  <Bookmark className="w-3 h-3 text-primary" />
                                </button>
                              )}
                              {isSaved && (
                                <Bookmark className="w-3 h-3 text-primary fill-primary" />
                              )}
                              {onFeedback && !hasFeedback && (
                                <>
                                  <button
                                    type="button"
                                    onClick={(e) => handleFeedback(suggestion, 'positive', e)}
                                    className="p-0.5 hover:bg-emerald-500/20 rounded transition-colors"
                                    title="Gợi ý hay"
                                  >
                                    <ThumbsUp className="w-3 h-3 text-emerald-600" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => handleFeedback(suggestion, 'negative', e)}
                                    className="p-0.5 hover:bg-red-500/20 rounded transition-colors"
                                    title="Không phù hợp"
                                  >
                                    <ThumbsDown className="w-3 h-3 text-red-600" />
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs p-3 space-y-2">
                        <p className="font-medium text-sm">{suggestion.topic}</p>
                        
                        {suggestion.reasoning && (
                          <p className="text-xs text-muted-foreground">
                            <Info className="w-3 h-3 inline mr-1" />
                            {suggestion.reasoning}
                          </p>
                        )}

                        {suggestion.scores && (
                          <div className="grid grid-cols-2 gap-1 text-[10px]">
                            <span>Brand Fit: <strong>{suggestion.scores.brandFit}</strong></span>
                            <span>Trending: <strong>{suggestion.scores.trend}</strong></span>
                            <span>Competition: <strong>{suggestion.scores.competition}</strong></span>
                            <span>Engagement: <strong>{suggestion.scores.engagement}</strong></span>
                          </div>
                        )}

                        {suggestion.relatedEvent && (
                          <p className="text-xs text-purple-600">
                            📅 Sự kiện: {suggestion.relatedEvent}
                            {suggestion.eventDate && ` (${suggestion.eventDate})`}
                          </p>
                        )}

                        {suggestion.relatedKeywords?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {suggestion.relatedKeywords.slice(0, 4).map((kw, i) => (
                              <Badge key={i} variant="secondary" className="text-[9px] px-1 py-0">
                                {kw}
                              </Badge>
                            ))}
                          </div>
                        )}

                        <p className="text-[10px] text-muted-foreground italic">
                          Click để sử dụng topic này
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>

              {/* Quick Start Section */}
              {showQuickStart && contentGoal && onSelectQuickStart && (
                <QuickStartSection
                  contentGoal={contentGoal}
                  onSelectTemplate={onSelectQuickStart}
                  disabled={disabled}
                  className="mt-3 pt-3 border-t"
                />
              )}

              {/* Navigate to Topics page */}
              {showNavigateToTopics && (
                <button
                  type="button"
                  onClick={() => navigate('/topics')}
                  className="flex items-center gap-1.5 text-[10px] xs:text-xs text-primary hover:underline"
                >
                  <BookOpen className="w-3 h-3" />
                  Khám phá Kho ý tưởng
                  <ExternalLink className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </TooltipProvider>
  );
}
