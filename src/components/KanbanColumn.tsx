import { useDroppable } from '@dnd-kit/core';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ReactNode } from 'react';
import { InboxIcon } from 'lucide-react';

interface KanbanColumnProps {
  id: string;
  label: string;
  color: string;
  count: number;
  children: ReactNode;
  icon?: ReactNode;
}

export function KanbanColumn({ id, label, color, count, children, icon }: KanbanColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 min-w-[300px] w-[300px] max-w-[300px] sm:min-w-[320px] sm:w-[320px] sm:max-w-[320px] rounded-2xl border-2 transition-colors duration-200 kanban-column ${
        isOver 
          ? 'border-primary bg-primary/5 shadow-xl shadow-primary/20 kanban-column-drop-active' 
          : 'border-border/40 bg-gradient-to-b from-background to-muted/10 hover:border-border/60'
      }`}
    >
      {/* Column Header */}
      <div className={`p-4 rounded-t-[14px] ${color} border-b border-border/20`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-background/50 backdrop-blur-sm">
              {icon}
            </div>
            <h3 className="font-semibold text-sm sm:text-base">{label}</h3>
          </div>
          <Badge 
            variant="secondary" 
            className="text-xs font-bold min-w-[32px] h-7 justify-center bg-background/80 backdrop-blur-sm shadow-sm count-badge-animate"
          >
            {count}
          </Badge>
        </div>
        {/* Mini progress indicator */}
        <div className="mt-3 h-1 bg-background/30 rounded-full overflow-hidden">
          <div 
            className="h-full bg-background/60 rounded-full transition-all duration-500"
            style={{ width: count > 0 ? '100%' : '0%' }}
          />
        </div>
      </div>

      {/* Column Content */}
      <ScrollArea className="h-[calc(100vh-400px)] min-h-[380px] sm:min-h-[420px]">
        <div className="p-3 space-y-3">
          {children}
          {count === 0 && (
            <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center mb-4 empty-state-icon">
                <InboxIcon className="w-8 h-8 text-muted-foreground/30" />
              </div>
              <p className="text-sm text-muted-foreground/50 font-medium">
                Kéo thả nội dung vào đây
              </p>
              <p className="text-xs text-muted-foreground/30 mt-1">
                Drop items here
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}