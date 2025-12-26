import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Lightbulb, RefreshCw, ChevronDown, Sparkles, Database, BookOpen, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { EnhancedTopicSuggestion, calculateOverallScore } from '@/types/topicDiscovery';

interface TopicSuggestionPanelProps {
  suggestions: string[] | EnhancedTopicSuggestion[];
  source: 'ai' | 'cache' | 'fallback';
  isLoading: boolean;
  onSelect: (suggestion: string) => void;
  onRefresh: () => void;
  disabled?: boolean;
  showNavigateToTopics?: boolean;
}

export function TopicSuggestionPanel({
  suggestions,
  source,
  isLoading,
  onSelect,
  onRefresh,
  disabled = false,
  showNavigateToTopics = true,
}: TopicSuggestionPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const navigate = useNavigate();

  const sourceConfig = {
    ai: { icon: Sparkles, label: 'AI', className: 'bg-primary/10 text-primary border-primary/30' },
    cache: { icon: Database, label: 'Cached', className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30' },
    fallback: { icon: Lightbulb, label: 'Mặc định', className: 'bg-muted text-muted-foreground border-border' },
  };

  const currentSource = sourceConfig[source];
  const SourceIcon = currentSource.icon;

  // Normalize suggestions to handle both string[] and EnhancedTopicSuggestion[]
  const normalizedSuggestions = suggestions.map(s => {
    if (typeof s === 'string') {
      return { topic: s, score: undefined };
    }
    return { 
      topic: s.topic, 
      score: s.scores ? calculateOverallScore(s.scores) : undefined 
    };
  });

  return (
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
            onClick={onRefresh}
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
          <div className="flex flex-wrap gap-1 xs:gap-1.5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-5 xs:h-6 w-24 xs:w-32 rounded-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1 xs:gap-1.5">
              {normalizedSuggestions.map((suggestion, idx) => (
                <Badge
                  key={idx}
                  variant="outline"
                  className={cn(
                    "cursor-pointer transition-all text-[10px] xs:text-xs px-1.5 xs:px-2 py-0.5 max-w-full gap-1",
                    "hover:bg-primary/10 hover:border-primary/50 hover:scale-[1.02]",
                    "active:scale-95",
                    disabled && "opacity-50 cursor-not-allowed hover:bg-transparent hover:border-border hover:scale-100"
                  )}
                  onClick={() => !disabled && onSelect(suggestion.topic)}
                >
                  <span className="truncate" title={suggestion.topic}>
                    {suggestion.topic.length > 35 ? suggestion.topic.slice(0, 35) + '...' : suggestion.topic}
                  </span>
                  {suggestion.score !== undefined && (
                    <span className={cn(
                      "text-[8px] font-medium px-1 rounded",
                      suggestion.score >= 75 ? "bg-emerald-500/20 text-emerald-600" :
                      suggestion.score >= 50 ? "bg-amber-500/20 text-amber-600" :
                      "bg-muted text-muted-foreground"
                    )}>
                      {suggestion.score}
                    </span>
                  )}
                </Badge>
              ))}
            </div>

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
  );
}
