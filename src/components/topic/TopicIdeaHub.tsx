import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { TopicSuggestionPanel } from '@/components/TopicSuggestionPanel';
import { Lightbulb, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EnhancedTopicSuggestion } from '@/types/topicDiscovery';
import type { ContentGoal } from '@/types/multichannel';

interface TopicIdeaHubProps {
  suggestions: string[] | EnhancedTopicSuggestion[];
  source: 'ai' | 'cache' | 'fallback';
  isLoading: boolean;
  onSelect: (topic: string) => void;
  onRefresh: () => void;
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
  onSave,
  onFeedback,
  contentGoal,
  disabled = false,
  showEnhancedInfo = true,
  showNavigateToTopics = false,
}: TopicIdeaHubProps) {
  const [isOpen, setIsOpen] = useState(true);

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
            <TopicSuggestionPanel
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
            />
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
