import { motion } from 'framer-motion';
import { Maximize2, Loader2, CheckCircle2, Eye, X, AlertCircle, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface CarouselMiniTrackerProps {
  overallPercent: number;
  statusText: string;
  etaText?: string | null;
  totalSlides?: number;
  completedSlides?: number;
  status: 'generating' | 'done' | 'error' | 'cancelled';
  onExpand: () => void;
  onViewResults?: () => void;
  onCancel?: () => void;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export function CarouselMiniTracker({
  overallPercent,
  statusText,
  etaText,
  totalSlides = 0,
  completedSlides = 0,
  status,
  onExpand,
  onViewResults,
  onCancel,
  onRetry,
  onDismiss,
}: CarouselMiniTrackerProps) {
  const isDone = status === 'done';
  const isError = status === 'error' || status === 'cancelled';
  const isGenerating = status === 'generating';

  const slots = Array.from({ length: totalSlides }, (_, i) => i + 1);

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className={cn(
        'fixed z-50 bottom-4 right-4 w-72 max-w-[calc(100vw-2rem)]',
        'rounded-xl border border-border bg-card shadow-2xl'
      )}
    >
      <div className="p-3 space-y-2.5">
        {/* Header row */}
        <div className="flex items-center gap-2">
          {isDone ? (
            <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
          ) : isError ? (
            <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
          ) : (
            <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
          )}
          <span className="text-xs text-muted-foreground flex-1 truncate">{statusText}</span>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-muted-foreground hover:text-foreground shrink-0"
            onClick={onExpand}
            title="Mở rộng"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </Button>
          {(isError || isDone) && onDismiss && (
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-muted-foreground hover:text-foreground shrink-0"
              onClick={onDismiss}
              title="Đóng"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>

        {/* Progress */}
        <div className="space-y-1.5">
          <Progress
            value={overallPercent}
            className={cn(
              'h-1.5 transition-all duration-300',
              isError && '[&>div]:bg-destructive'
            )}
          />
          {totalSlides > 0 && (
            <div className="flex items-center gap-1">
              {slots.map((n) => {
                const isDoneSlide = n <= completedSlides;
                const isCurrent = n === completedSlides + 1 && isGenerating;
                return (
                  <div
                    key={n}
                    title={`Slide ${n}`}
                    className={cn(
                      'h-1 flex-1 min-w-[6px] rounded-full transition-colors',
                      isDoneSlide && 'bg-primary',
                      isCurrent && 'bg-primary/40 animate-pulse',
                      !isDoneSlide && !isCurrent && 'bg-muted'
                    )}
                  />
                );
              })}
            </div>
          )}
          <div className="flex items-center justify-between text-[10px] text-muted-foreground tabular-nums">
            <span>{etaText && isGenerating ? etaText : ''}</span>
            <span>{overallPercent}%</span>
          </div>
        </div>

        {/* Action button */}
        {isDone && onViewResults && (
          <Button size="sm" variant="default" className="w-full h-7 text-xs gap-1.5" onClick={onViewResults}>
            <Eye className="w-3 h-3" />
            Xem kết quả
          </Button>
        )}
        {isGenerating && onCancel && (
          <Button size="sm" variant="outline" className="w-full h-7 text-xs gap-1.5" onClick={onCancel}>
            <X className="w-3 h-3" />
            Hủy
          </Button>
        )}
        {isError && onRetry && (
          <Button size="sm" variant="outline" className="w-full h-7 text-xs gap-1.5" onClick={onRetry}>
            <RotateCw className="w-3 h-3" />
            Thử lại
          </Button>
        )}
      </div>
    </motion.div>
  );
}
