import React from 'react';
import { BarChart3, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TopicComparisonBarProps {
  selectedCount: number;
  onCompare: () => void;
  onClear: () => void;
}

export function TopicComparisonBar({
  selectedCount,
  onCompare,
  onClear,
}: TopicComparisonBarProps) {
  if (selectedCount < 2) return null;

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
        <span className="text-sm font-medium">So sánh: {selectedCount} topic</span>
      </div>

      <div className="flex items-center gap-2 ml-2">
        <Button size="sm" onClick={onCompare} className="gap-1.5">
          <BarChart3 className="w-4 h-4" />
          So sánh
          <ArrowRight className="w-3 h-3" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onClear}>
          Hủy
        </Button>
      </div>
    </div>
  );
}
