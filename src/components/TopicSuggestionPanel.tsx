import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Lightbulb, RefreshCw, ChevronDown, Sparkles, Database } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TopicSuggestionPanelProps {
  suggestions: string[];
  source: 'ai' | 'cache' | 'fallback';
  isLoading: boolean;
  onSelect: (suggestion: string) => void;
  onRefresh: () => void;
  disabled?: boolean;
}

export function TopicSuggestionPanel({
  suggestions,
  source,
  isLoading,
  onSelect,
  onRefresh,
  disabled = false,
}: TopicSuggestionPanelProps) {
  const [isOpen, setIsOpen] = useState(true);

  const sourceConfig = {
    ai: { icon: Sparkles, label: 'AI', className: 'bg-primary/10 text-primary border-primary/30' },
    cache: { icon: Database, label: 'Cached', className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30' },
    fallback: { icon: Lightbulb, label: 'Mặc định', className: 'bg-muted text-muted-foreground border-border' },
  };

  const currentSource = sourceConfig[source];
  const SourceIcon = currentSource.icon;

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
          <div className="flex flex-wrap gap-1 xs:gap-1.5">
            {suggestions.map((suggestion, idx) => (
              <Badge
                key={idx}
                variant="outline"
                className={cn(
                  "cursor-pointer transition-all text-[10px] xs:text-xs px-1.5 xs:px-2 py-0.5 max-w-full",
                  "hover:bg-primary/10 hover:border-primary/50 hover:scale-[1.02]",
                  "active:scale-95",
                  disabled && "opacity-50 cursor-not-allowed hover:bg-transparent hover:border-border hover:scale-100"
                )}
                onClick={() => !disabled && onSelect(suggestion)}
              >
                <span className="truncate" title={suggestion}>
                  {suggestion.length > 35 ? suggestion.slice(0, 35) + '...' : suggestion}
                </span>
              </Badge>
            ))}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
