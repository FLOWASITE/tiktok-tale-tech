import { useState, useCallback, useEffect, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Search, BarChart3, History, Star, Trash2, RotateCcw, X } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTopicHistory } from '@/hooks/useTopicHistory';
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
import { QuickStartTemplate, ContentGoal } from '@/types/quickStartTemplates';

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
  const [historyFilter, setHistoryFilter] = useState<'all' | 'unused'>('all');
  const navigate = useNavigate();

  const { history: topicHistory, isLoading: historyLoading, markAsSelected, ensureSelectedTopic } = useTopicHistory({
    enabled: true,
  });

  const filteredHistory = useMemo(() => {
    const sliced = topicHistory.slice(0, 15);
    if (historyFilter === 'unused') {
      return sliced.filter(item => !['created', 'published'].includes(item.usageStatus));
    }
    return sliced;
  }, [topicHistory, historyFilter]);

  const unusedCount = useMemo(() => {
    return topicHistory.slice(0, 15).filter(item => !['created', 'published'].includes(item.usageStatus)).length;
  }, [topicHistory]);

  const allCount = Math.min(topicHistory.length, 15);

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
                  className="h-4 xs:h-5 text-[9px] xs:text-[10px] px-1.5 xs:px-2 gap-0.5 xs:gap-1 rounded-full border-border/60"
                >
                  <History className="w-2 h-2 xs:w-2.5 xs:h-2.5" />
                  Đã tạo
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 p-0">
                <div className="p-2 border-b border-border/60 space-y-1.5">
                  <p className="text-xs font-medium">Chủ đề đã tạo trước đây</p>
                   <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setHistoryFilter('all')}
                      className={cn(
                        "h-6 px-2.5 rounded-full text-[10px] font-medium transition-colors inline-flex items-center gap-1",
                        historyFilter === 'all' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                    >
                      Tất cả
                      <span className="text-[9px] opacity-80">({allCount})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setHistoryFilter('unused')}
                      className={cn(
                        "h-6 px-2.5 rounded-full text-[10px] font-medium transition-colors inline-flex items-center gap-1",
                        historyFilter === 'unused' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                    >
                      Chưa tạo nội dung
                      <span className="text-[9px] opacity-80">({unusedCount})</span>
                    </button>
                  </div>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {historyLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredHistory.length === 0 ? (
                    <div className="text-center py-6 px-3">
                      <History className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                      <p className="text-xs text-muted-foreground">
                        {historyFilter === 'unused' ? 'Không có chủ đề chưa được tạo nội dung' : 'Chưa có chủ đề nào được tạo'}
                      </p>
                    </div>
                  ) : (
                    <div className="py-1">
                      {filteredHistory.map((item) => {
                        const statusBadge = getStatusBadge(item.usageStatus);
                        const score = item.performanceScore;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors flex items-start gap-2"
                            onClick={() => {
                              onSelect(item.topic, item.id);
                              // Auto-update status to 'selected' when picking from history
                              if (item.usageStatus === 'draft' || item.usageStatus === 'suggested') {
                                markAsSelected(item.id);
                              }
                              setHistoryOpen(false);
                            }}
                          >
                            {/* Category icon */}
                            <span className="mt-0.5 shrink-0">
                              {getCategoryIcon(item.category)}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1">
                                <p className="text-xs truncate font-medium flex-1">{item.topic}</p>
                                {item.isFavorite && (
                                  <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
                                )}
                                {score != null && score > 0 && (
                                  <span className={cn(
                                    "text-[9px] font-semibold px-1.5 py-0.5 rounded-full shrink-0",
                                    score >= 75 ? 'bg-emerald-500/20 text-emerald-600' :
                                    score >= 50 ? 'bg-amber-500/20 text-amber-600' :
                                    'bg-muted text-muted-foreground'
                                  )}>
                                    {score}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] text-muted-foreground">
                                  {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                                </span>
                                <Badge variant="secondary" className={cn("text-[8px] h-3.5 px-1 border-0", statusBadge.className)}>
                                  {statusBadge.label}
                                </Badge>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                {/* Footer: link to Kho Ý Tưởng */}
                <div className="border-t border-border/60 p-2">
                  <button
                    type="button"
                    onClick={() => {
                      setHistoryOpen(false);
                      navigate('/topics');
                    }}
                    className="w-full flex items-center justify-center gap-1.5 text-[10px] font-medium text-primary hover:underline py-1"
                  >
                    <BookOpen className="w-3 h-3" />
                    Xem tất cả trong Kho Ý Tưởng
                    <ExternalLink className="w-2.5 h-2.5" />
                  </button>
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
