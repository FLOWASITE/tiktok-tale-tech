import React from 'react';
import { Sparkles, Loader2, RefreshCw, ChevronRight, PenLine, User, Package, Shield, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { RefinedTopic, RefineContextUsed } from '@/hooks/useTopicRefinement';

interface TopicRefinementSuggestionsProps {
  refinedTopics: RefinedTopic[];
  isLoading: boolean;
  isTyping?: boolean;
  onSelect: (topic: string) => void;
  onRefresh: () => void;
  disabled?: boolean;
  contextUsed?: RefineContextUsed | null;
}

export function TopicRefinementSuggestions({
  refinedTopics,
  isLoading,
  isTyping = false,
  onSelect,
  onRefresh,
  disabled = false,
  contextUsed,
}: TopicRefinementSuggestionsProps) {
  // Show typing indicator even before loading starts
  if (!isLoading && !isTyping && refinedTopics.length === 0) {
    return null;
  }

  // Count how many context sources were used
  const contextCount = contextUsed ? 
    [contextUsed.hasPersonas, contextUsed.hasProducts, contextUsed.hasIndustryMemory, contextUsed.hasLearningContext]
      .filter(Boolean).length : 0;

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
          {/* Context badges */}
          {contextUsed && contextCount > 0 && !isLoading && !isTyping && (
            <div className="flex items-center gap-1 ml-2">
              {contextUsed.hasPersonas && (
                <Badge variant="secondary" className="h-5 px-1.5 text-[10px] gap-0.5">
                  <User className="w-3 h-3" />
                </Badge>
              )}
              {contextUsed.hasProducts && (
                <Badge variant="secondary" className="h-5 px-1.5 text-[10px] gap-0.5">
                  <Package className="w-3 h-3" />
                </Badge>
              )}
              {contextUsed.hasIndustryMemory && (
                <Badge variant="secondary" className="h-5 px-1.5 text-[10px] gap-0.5">
                  <Shield className="w-3 h-3" />
                </Badge>
              )}
              {contextUsed.hasLearningContext && (
                <Badge variant="secondary" className="h-5 px-1.5 text-[10px] gap-0.5">
                  <Brain className="w-3 h-3" />
                </Badge>
              )}
            </div>
          )}
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
                {/* Show persona and product fit if available */}
                {(item.targetPersona || item.productFit) && (
                  <div className="flex items-center gap-2 mt-1.5">
                    {item.targetPersona && (
                      <Badge variant="outline" className="h-4 px-1.5 text-[10px] gap-0.5 text-muted-foreground">
                        <User className="w-2.5 h-2.5" />
                        {item.targetPersona}
                      </Badge>
                    )}
                    {item.productFit && (
                      <Badge variant="outline" className="h-4 px-1.5 text-[10px] gap-0.5 text-muted-foreground">
                        <Package className="w-2.5 h-2.5" />
                        {item.productFit}
                      </Badge>
                    )}
                  </div>
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
