import { useState, useCallback, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Search, BarChart3 } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
  onSelect: (suggestion: string) => void;
  onRefresh: () => void;
  onSave?: (suggestion: EnhancedTopicSuggestion) => void;
  onFeedback?: (suggestion: EnhancedTopicSuggestion, feedback: 'positive' | 'negative') => void;
  disabled?: boolean;
  showNavigateToTopics?: boolean;
  showEnhancedInfo?: boolean;
  showQuickStart?: boolean;
  contentGoal?: ContentGoal;
  onSelectQuickStart?: (template: QuickStartTemplate) => void;
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
}: TopicSuggestionPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [feedbackGiven, setFeedbackGiven] = useState<Set<string>>(new Set());
  const [savedTopics, setSavedTopics] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

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
                          onClick={() => !disabled && onSelect(suggestion.topic)}
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
