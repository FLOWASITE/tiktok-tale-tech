// ============================================
// TopicSuggestionsCard Component
// Displays topics discovered by Research Agent
// ============================================

import { useState } from 'react';
import { ChevronDown, Lightbulb, Sparkles, Star, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { RefinedVariant, SuggestedTopic } from './types';

interface TopicSuggestionsCardProps {
  topics: SuggestedTopic[];
  selectedTopic?: string;
  refinedVariants?: RefinedVariant[];
  onSelect?: (topic: string) => void;
  className?: string;
}

export function TopicSuggestionsCard({ topics, selectedTopic, refinedVariants, onSelect, className }: TopicSuggestionsCardProps) {
  const [variantsOpen, setVariantsOpen] = useState(false);

  if (!topics || topics.length === 0) return null;

  return (
    <div className={cn('rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2', className)}>
      {/* Selected Topic Banner */}
      {selectedTopic && (
        <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-primary/15 border border-primary/30">
          <Star className="w-4 h-4 text-primary fill-primary shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-primary/70 font-medium">Topic được chọn</p>
            <p className="text-sm font-semibold text-primary line-clamp-2">{selectedTopic}</p>
          </div>
        </div>
      )}

      {/* Refined Variants (collapsible) */}
      {refinedVariants && refinedVariants.length > 0 && (
        <Collapsible open={variantsOpen} onOpenChange={setVariantsOpen}>
          <CollapsibleTrigger className="flex items-center gap-1.5 w-full text-[10px] font-medium text-primary/70 hover:text-primary transition-colors py-0.5">
            <Sparkles className="w-3 h-3" />
            <span>{refinedVariants.length} biến thể refined</span>
            <ChevronDown className={cn('w-3 h-3 ml-auto transition-transform', variantsOpen && 'rotate-180')} />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1 mt-1">
            {refinedVariants.map((v, i) => (
              <div
                key={i}
                onClick={() => onSelect?.(v.topic)}
                className={cn(
                  'rounded-lg px-2.5 py-1.5 text-xs bg-primary/8 border border-primary/15',
                  onSelect && 'cursor-pointer hover:bg-primary/12 transition-colors'
                )}
              >
                <p className="font-medium text-primary line-clamp-1">{v.topic}</p>
                {v.angle && (
                  <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{v.angle}</p>
                )}
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Topic List Header */}
      <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
        <Lightbulb className="w-3.5 h-3.5" />
        <span>Topics được gợi ý</span>
        <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 ml-auto">
          {topics.length} topics
        </Badge>
      </div>

      <div className="space-y-1.5">
        {topics.map((t, i) => {
          const isSelected = selectedTopic && t.topic === selectedTopic;
          return (
            <div
              key={i}
              onClick={() => onSelect?.(t.topic)}
              className={cn(
                'flex items-start gap-2 rounded-lg px-2.5 py-1.5 text-xs transition-colors',
                onSelect && 'cursor-pointer hover:bg-accent/50',
                isSelected
                  ? 'bg-primary/15 border border-primary/30 ring-1 ring-primary/20'
                  : 'bg-background/60 border border-border/40'
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {isSelected && <Star className="w-3 h-3 text-primary fill-primary shrink-0" />}
                  <span className={cn('font-medium line-clamp-1', isSelected && 'text-primary')}>
                    {t.topic}
                  </span>
                </div>
                {t.reasoning && (
                  <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{t.reasoning}</p>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {t.category && (
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">
                    {t.category}
                  </Badge>
                )}
                {t.score != null && (
                  <span className={cn(
                    'flex items-center gap-0.5 text-[10px] font-semibold tabular-nums',
                    t.score >= 80 ? 'text-emerald-600 dark:text-emerald-400' :
                    t.score >= 60 ? 'text-amber-600 dark:text-amber-400' :
                    'text-muted-foreground'
                  )}>
                    <TrendingUp className="w-2.5 h-2.5" />
                    {t.score}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
