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
      className={`flex-shrink-0 w-[280px] sm:w-80 rounded-xl border-2 transition-all duration-200 ${
        isOver 
          ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10 scale-[1.01]' 
          : 'border-border/50 bg-gradient-to-b from-background to-muted/20 hover:border-border'
      }`}
    >
      {/* Column Header */}
      <div className={`p-3 sm:p-4 rounded-t-[10px] ${color} border-b border-border/30`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <h3 className="font-semibold text-sm sm:text-base">{label}</h3>
          </div>
          <Badge 
            variant="secondary" 
            className="text-xs font-bold min-w-[28px] justify-center bg-background/80 backdrop-blur-sm"
          >
            {count}
          </Badge>
        </div>
      </div>

      {/* Column Content */}
      <ScrollArea className="h-[calc(100vh-380px)] min-h-[350px] sm:min-h-[400px]">
        <div className="p-2 sm:p-3 space-y-2 sm:space-y-3">
          {children}
          {count === 0 && (
            <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center">
              <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mb-3">
                <InboxIcon className="w-6 h-6 text-muted-foreground/40" />
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground/60 font-medium">
                Kéo thả nội dung vào đây
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
