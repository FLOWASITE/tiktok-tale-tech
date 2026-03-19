import { motion } from 'framer-motion';
import { Maximize2, Loader2, CheckCircle2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface CarouselMiniTrackerProps {
  overallPercent: number;
  statusText: string;
  allDone: boolean;
  onExpand: () => void;
  onViewResults?: () => void;
}

export function CarouselMiniTracker({
  overallPercent,
  statusText,
  allDone,
  onExpand,
  onViewResults,
}: CarouselMiniTrackerProps) {
  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className={cn(
        "fixed z-50 bottom-4 right-4 w-72 max-w-[calc(100vw-2rem)]",
        "rounded-xl border border-border bg-card shadow-2xl"
      )}
    >
      <div className="p-3 space-y-2.5">
        {/* Header row */}
        <div className="flex items-center gap-2">
          {allDone ? (
            <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
          ) : (
            <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
          )}
          <span className="text-xs text-muted-foreground flex-1 truncate">
            {statusText}
          </span>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-muted-foreground hover:text-foreground shrink-0"
            onClick={onExpand}
            title="Mở rộng"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Progress */}
        <div className="space-y-1">
          <Progress value={overallPercent} className="h-1.5" />
          <div className="text-[10px] text-muted-foreground text-right tabular-nums">
            {overallPercent}%
          </div>
        </div>

        {/* View results button when done */}
        {allDone && onViewResults && (
          <Button
            size="sm"
            variant="default"
            className="w-full h-7 text-xs gap-1.5"
            onClick={onViewResults}
          >
            <Eye className="w-3 h-3" />
            Xem kết quả
          </Button>
        )}
      </div>
    </motion.div>
  );
}
