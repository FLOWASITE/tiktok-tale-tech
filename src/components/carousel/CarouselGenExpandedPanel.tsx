import { motion } from 'framer-motion';
import { Minimize2, X, Loader2, CheckCircle2, AlertCircle, Eye, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { CarouselGenerationJob } from '@/contexts/CarouselGenerationContext';
import { textContentToString } from '@/types/carousel';

interface Props {
  job: CarouselGenerationJob;
  percent: number;
  statusText: string;
  etaText: string | null;
  onCollapse: () => void;
  onCancel?: () => void;
  onRetry?: () => void;
  onDismiss?: () => void;
  onOpenCarousel?: () => void;
}

export function CarouselGenExpandedPanel({
  job,
  percent,
  statusText,
  etaText,
  onCollapse,
  onCancel,
  onRetry,
  onDismiss,
  onOpenCarousel,
}: Props) {
  const total = job.totalSlides || job.partialSlides.length || 0;
  const slots = Array.from({ length: Math.max(total, job.partialSlides.length) }, (_, i) => i + 1);
  const isError = job.status === 'error' || job.status === 'cancelled';
  const isDone = job.status === 'done';

  return (
    <motion.div
      initial={{ y: 30, opacity: 0, scale: 0.95 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: 30, opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', damping: 25, stiffness: 280 }}
      className={cn(
        'fixed z-50 bottom-4 right-4 w-[360px] max-w-[calc(100vw-2rem)] h-[500px] max-h-[calc(100vh-2rem)]',
        'rounded-2xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden'
      )}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-2 shrink-0">
        {isDone ? (
          <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
        ) : isError ? (
          <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
        ) : (
          <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">Đang tạo Carousel</div>
          <div className="text-[11px] text-muted-foreground truncate">{statusText}</div>
        </div>
        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={onCollapse} title="Thu nhỏ">
          <Minimize2 className="w-3.5 h-3.5" />
        </Button>
        {(isError || isDone) && onDismiss && (
          <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={onDismiss} title="Đóng">
            <X className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      {/* Progress block */}
      <div className="px-4 py-3 border-b border-border space-y-2 shrink-0">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground tabular-nums">
          <span>{percent}%</span>
          {etaText && !isDone && !isError && <span>{etaText}</span>}
        </div>
        <Progress
          value={percent}
          className={cn('h-1.5 transition-all duration-300', isError && '[&>div]:bg-destructive')}
        />
        {total > 0 && (
          <div className="flex items-center gap-1 flex-wrap pt-1">
            {slots.map((n) => {
              const isDoneSlide = n <= job.completedSlides;
              const isCurrent = n === job.completedSlides + 1 && !isDone && !isError;
              return (
                <div
                  key={n}
                  title={`Slide ${n}`}
                  className={cn(
                    'h-1.5 flex-1 min-w-[8px] rounded-full transition-all',
                    isDoneSlide && 'bg-primary',
                    isCurrent && 'bg-primary/40 animate-pulse',
                    !isDoneSlide && !isCurrent && 'bg-muted'
                  )}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Slides list */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {slots.length === 0 && (
            <div className="text-center text-xs text-muted-foreground py-8">Đang khởi tạo...</div>
          )}
          {slots.map((n) => {
            const slide = job.partialSlides.find((s) => s.slideNumber === n) || job.partialSlides[n - 1];
            const isCurrent = n === job.completedSlides + 1 && !isDone && !isError;

            if (slide) {
              const text = textContentToString(slide.textContent);
              return (
                <motion.div
                  key={n}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg border border-border bg-muted/30 p-2.5 space-y-1"
                >
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-primary shrink-0" />
                    <span className="text-[11px] font-semibold">Slide {slide.slideNumber}</span>
                    <span className="text-[10px] text-muted-foreground truncate">{slide.objective}</span>
                  </div>
                  <p className="text-[11px] text-foreground/80 line-clamp-2 leading-relaxed">{text}</p>
                </motion.div>
              );
            }

            const showLivePreview = isCurrent && job.revealingSlideMeta?.slideNumber === n;
            const meta = showLivePreview ? job.revealingSlideMeta : null;

            return (
              <div
                key={n}
                className={cn(
                  'rounded-lg border p-2.5 space-y-1.5',
                  isCurrent
                    ? 'border-primary/40 bg-primary/5'
                    : 'border-dashed border-border'
                )}
              >
                <div className="flex items-center gap-1.5">
                  {isCurrent ? (
                    <Loader2 className="w-3 h-3 text-primary animate-spin shrink-0" />
                  ) : (
                    <div className="w-3 h-3 rounded-full border border-muted-foreground/40 shrink-0" />
                  )}
                  <span className={cn(
                    "text-[11px] font-medium",
                    isCurrent ? "text-primary" : "text-muted-foreground"
                  )}>
                    {isCurrent ? `Prompt cho Slide ${n}` : `Slide ${n}`}
                  </span>
                </div>
                {isCurrent ? (
                  meta?.objective || meta?.textPreview ? (
                    <>
                      {meta.objective && (
                        <p className="text-[10.5px] text-foreground/80 leading-snug line-clamp-1 font-medium">
                          {meta.objective}
                        </p>
                      )}
                      {meta.textPreview && (
                        <p className="text-[10.5px] text-muted-foreground leading-snug line-clamp-2">
                          {meta.textPreview}
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <Skeleton className="h-2 w-full" />
                      <Skeleton className="h-2 w-3/4" />
                    </>
                  )
                ) : (
                  <div className="text-[10px] text-muted-foreground/60">Chờ...</div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Footer actions */}
      <div className="px-3 py-2.5 border-t border-border flex items-center gap-2 shrink-0">
        {job.status === 'generating' && onCancel && (
          <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={onCancel}>
            <X className="w-3 h-3" />
            Hủy
          </Button>
        )}
        {isError && onRetry && (
          <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={onRetry}>
            <RotateCw className="w-3 h-3" />
            Thử lại
          </Button>
        )}
        {isDone && onOpenCarousel && (
          <Button size="sm" variant="default" className="flex-1 h-8 text-xs" onClick={onOpenCarousel}>
            <Eye className="w-3 h-3" />
            Mở carousel
          </Button>
        )}
      </div>
    </motion.div>
  );
}
