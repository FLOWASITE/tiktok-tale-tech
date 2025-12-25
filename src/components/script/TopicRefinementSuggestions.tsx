import React from 'react';
import { Sparkles, Loader2, RefreshCw, ChevronRight, PenLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { RefinedTopic } from '@/hooks/useTopicRefinement';

interface TopicRefinementSuggestionsProps {
  refinedTopics: RefinedTopic[];
  isLoading: boolean;
  isTyping?: boolean; // New: shows user is still typing
  onSelect: (topic: string) => void;
  onRefresh: () => void;
  disabled?: boolean;
}

export function TopicRefinementSuggestions({
  refinedTopics,
  isLoading,
  isTyping = false,
  onSelect,
  onRefresh,
  disabled = false,
}: TopicRefinementSuggestionsProps) {
  // Show typing indicator even before loading starts
  if (!isLoading && !isTyping && refinedTopics.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          {isTyping ? (
            <PenLine className="w-4 h-4 text-muted-foreground animate-pulse" />
          ) : (
            <Sparkles className="w-4 h-4 text-primary" />
          )}
          <span>
            {isTyping ? 'Đang chờ bạn nhập xong...' : 'Gợi ý cải thiện chủ đề'}
          </span>
        </div>
        {refinedTopics.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading || disabled}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={cn("w-3 h-3 mr-1", isLoading && "animate-spin")} />
            Làm mới
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {isTyping ? (
          <div className="p-3 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 text-center">
            <p className="text-xs text-muted-foreground">
              Tiếp tục nhập để AI gợi ý cải thiện...
            </p>
          </div>
        ) : isLoading ? (
          <>
            <RefinementSkeleton />
            <RefinementSkeleton />
            <RefinementSkeleton />
          </>
        ) : (
          refinedTopics.map((item, index) => (
            <button
              key={index}
              type="button"
              onClick={() => onSelect(item.topic)}
              disabled={disabled}
              className={cn(
                "w-full text-left p-3 rounded-lg border bg-muted/30 hover:bg-primary/5",
                "border-border hover:border-primary/50 transition-all duration-200",
                "group flex items-start justify-between gap-3",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground leading-relaxed line-clamp-2">
                  {item.topic}
                </p>
                {item.hook && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                    {item.hook}
                  </p>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-0.5" />
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function RefinementSkeleton() {
  return (
    <div className="p-3 rounded-lg border border-border bg-muted/30">
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  );
}
