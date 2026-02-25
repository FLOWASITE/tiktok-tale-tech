// ============================================
// TopicSuggestionsCard Component
// Displays topics discovered by Research Agent
// ============================================

import { Lightbulb, Star, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { SuggestedTopic } from './types';

interface TopicSuggestionsCardProps {
  topics: SuggestedTopic[];
  selectedTopic?: string;
  className?: string;
}

export function TopicSuggestionsCard({ topics, selectedTopic, className }: TopicSuggestionsCardProps) {
  if (!topics || topics.length === 0) return null;

  return (
    <div className={cn('rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2', className)}>
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
              className={cn(
                'flex items-start gap-2 rounded-lg px-2.5 py-1.5 text-xs transition-colors',
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
