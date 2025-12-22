import { useDroppable } from '@dnd-kit/core';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ReactNode } from 'react';

interface KanbanColumnProps {
  id: string;
  label: string;
  color: string;
  count: number;
  children: ReactNode;
}

export function KanbanColumn({ id, label, color, count, children }: KanbanColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-72 rounded-xl border ${
        isOver ? 'border-primary bg-primary/5' : 'border-border bg-background/50'
      } transition-colors`}
    >
      {/* Column Header */}
      <div className={`p-3 rounded-t-xl ${color}`}>
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-sm">{label}</h3>
          <Badge variant="secondary" className="text-xs">
            {count}
          </Badge>
        </div>
      </div>

      {/* Column Content */}
      <ScrollArea className="h-[calc(100vh-320px)] min-h-[400px]">
        <div className="p-2 space-y-2">
          {children}
          {count === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Kéo thả nội dung vào đây
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
