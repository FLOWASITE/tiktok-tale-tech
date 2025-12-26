import React from 'react';
import { X, BarChart3, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EnhancedTopicSuggestion } from '@/types/topicDiscovery';
import { cn } from '@/lib/utils';

interface TopicComparisonBarProps {
  selectedTopics: EnhancedTopicSuggestion[];
  onRemoveTopic: (topic: EnhancedTopicSuggestion) => void;
  onCompare: () => void;
  onClearAll: () => void;
  maxTopics?: number;
}

export function TopicComparisonBar({
  selectedTopics,
  onRemoveTopic,
  onCompare,
  onClearAll,
  maxTopics = 3,
}: TopicComparisonBarProps) {
  if (selectedTopics.length < 2) return null;

  return (
    <div
      className={cn(
        'fixed bottom-20 left-1/2 -translate-x-1/2 z-40',
        'bg-background/95 backdrop-blur-sm border rounded-xl shadow-lg',
        'p-3 flex items-center gap-3 animate-in slide-in-from-bottom-4'
      )}
    >
      <div className="flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">So sánh:</span>
      </div>

      <div className="flex items-center gap-2">
        {selectedTopics.map((topic, idx) => (
          <Badge
            key={topic.topic}
            variant="secondary"
            className="max-w-[150px] truncate pr-1 gap-1"
          >
            <span className="truncate text-xs">{topic.topic.slice(0, 25)}{topic.topic.length > 25 ? '...' : ''}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemoveTopic(topic);
              }}
              className="p-0.5 hover:bg-muted rounded"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
      </div>

      {selectedTopics.length < maxTopics && (
        <span className="text-xs text-muted-foreground">
          +{maxTopics - selectedTopics.length} nữa
        </span>
      )}

      <div className="flex items-center gap-2 ml-2">
        <Button size="sm" onClick={onCompare} className="gap-1.5">
          <BarChart3 className="w-4 h-4" />
          So sánh
          <ArrowRight className="w-3 h-3" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onClearAll}>
          Hủy
        </Button>
      </div>
    </div>
  );
}
