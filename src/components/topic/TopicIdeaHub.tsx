import { useState, useEffect, memo } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TopicSuggestionPanel } from '@/components/TopicSuggestionPanel';
import { Lightbulb, ChevronDown, Flame, TrendingUp, Gift, Zap, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EnhancedTopicSuggestion } from '@/types/topicDiscovery';
import type { ContentGoal } from '@/types/multichannel';

const QUICK_ACTIONS = [
  { icon: Flame, label: 'Viral tuần này' },
  { icon: TrendingUp, label: 'Theo trend' },
  { icon: Gift, label: 'Mùa lễ hội' },
  { icon: Zap, label: 'So sánh A vs B' },
];

/** Memoized wrapper to prevent TopicSuggestionPanel from re-rendering on category toggle */
const MemoizedSuggestionPanel = memo(TopicSuggestionPanel);

interface TopicIdeaHubProps {
  suggestions: string[] | EnhancedTopicSuggestion[];
  source: 'ai' | 'cache' | 'fallback';
  isLoading: boolean;
  onSelect: (topic: string, topicHistoryId?: string, fullSuggestion?: EnhancedTopicSuggestion) => void;
  onQuickActionSelect?: (topic: string) => void;
  onRefresh: () => void;
  onCategoryRefresh?: (category: string) => void;
  onBrainstorm?: () => void;
  onSave?: (suggestion: EnhancedTopicSuggestion) => void;
  onFeedback?: (suggestion: EnhancedTopicSuggestion, feedback: 'positive' | 'negative') => void;
  brandTemplateId?: string;
  contentGoal?: ContentGoal;
  disabled?: boolean;
  showEnhancedInfo?: boolean;
  showNavigateToTopics?: boolean;
}

export function TopicIdeaHub({
  suggestions,
  source,
  isLoading,
  onSelect,
  onRefresh,
  onCategoryRefresh,
  onBrainstorm,
  onSave,
  onFeedback,
  brandTemplateId,
  contentGoal,
  disabled = false,
  showEnhancedInfo = true,
  showNavigateToTopics = false,
}: TopicIdeaHubProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [loadingCategory, setLoadingCategory] = useState<string | null>(null);

  // Reset loading state when suggestions finish loading
  useEffect(() => {
    if (!isLoading && loadingCategory) {
      setLoadingCategory(null);
    }
  }, [isLoading, loadingCategory]);

  const handleCategoryClick = (label: string) => {
    if (loadingCategory) return; // Prevent double-click
    setLoadingCategory(label);
    if (onCategoryRefresh) {
      onCategoryRefresh(label);
    } else {
      onRefresh();
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-lg border border-border/60 bg-muted/20 overflow-hidden">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 text-sm font-medium",
              "hover:bg-muted/40 transition-colors",
              "text-foreground"
            )}
          >
            <div className="flex items-center gap-2">
              <Lightbulb className="w-3.5 h-3.5 text-primary" />
              <span>Ý tưởng chủ đề</span>
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                Gợi ý
              </Badge>
            </div>
            <ChevronDown className={cn(
              "w-3.5 h-3.5 text-muted-foreground transition-transform duration-200",
              isOpen && "rotate-180"
            )} />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-3 pb-3">
            {/* Quick action chips + Brainstorm AI badge */}
            <div className="flex gap-1.5 flex-wrap items-center mb-2">
              {QUICK_ACTIONS.map((action) => {
                const isActive = loadingCategory === action.label;
                const Icon = action.icon;
                return (
                  <Button
                    key={action.label}
                    type="button"
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    disabled={disabled || (!!loadingCategory && !isActive)}
                    onClick={() => handleCategoryClick(action.label)}
                    className={cn(
                      "h-6 text-[10px] whitespace-nowrap gap-1 rounded-full px-2.5 border-border/60 transition-colors",
                      !isActive && "hover:bg-primary hover:text-primary-foreground"
                    )}
                  >
                    {isActive ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Icon className="w-3 h-3" />
                    )}
                    {action.label}
                  </Button>
                );
              })}

              {/* Brainstorm AI badge */}
              {onBrainstorm && (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={onBrainstorm}
                  className={cn(
                    "inline-flex items-center gap-1 h-6 px-2.5 rounded-full text-[10px] font-semibold",
                    "bg-gradient-to-r from-primary to-accent text-primary-foreground",
                    "shadow-sm hover:shadow-md hover:brightness-110 transition-all duration-200",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  <Sparkles className="w-3 h-3 animate-pulse" />
                  Brainstorm AI
                </button>
              )}
            </div>

            <MemoizedSuggestionPanel
              suggestions={suggestions}
              source={source}
              isLoading={isLoading}
              onSelect={onSelect}
              onRefresh={onRefresh}
              onSave={onSave}
              onFeedback={onFeedback}
              disabled={disabled}
              showEnhancedInfo={showEnhancedInfo}
              showNavigateToTopics={showNavigateToTopics}
              contentGoal={contentGoal}
              brandTemplateId={brandTemplateId}
            />
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
