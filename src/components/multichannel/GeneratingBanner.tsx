import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, ChevronDown, ChevronUp, Bot } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface GeneratingBannerProps {
  isGenerating: boolean;
  channelCount: number;
  elapsedMs?: number;
  className?: string;
}

const PROGRESS_STEPS = [
  { id: 'context', label: 'Tải ngữ cảnh thương hiệu', duration: 800 },
  { id: 'personas', label: 'Phân tích personas & sản phẩm', duration: 1200 },
  { id: 'industry', label: 'Tải dữ liệu ngành', duration: 1000 },
  { id: 'prompt', label: 'Xây dựng prompt AI', duration: 600 },
  { id: 'generate', label: 'AI đang tạo nội dung', duration: 8000 },
  { id: 'critique', label: 'Đánh giá chất lượng', duration: 2000 },
  { id: 'finalize', label: 'Tối ưu và hoàn thiện', duration: 1500 },
];

export function GeneratingBanner({
  isGenerating,
  channelCount,
  elapsedMs: externalElapsedMs,
  className,
}: GeneratingBannerProps) {
  const [internalElapsedMs, setInternalElapsedMs] = useState(0);
  const [expanded, setExpanded] = useState(false);

  const elapsedMs = externalElapsedMs ?? internalElapsedMs;

  // Internal timer if no external elapsed provided
  useEffect(() => {
    if (!isGenerating || externalElapsedMs !== undefined) {
      if (!isGenerating) setInternalElapsedMs(0);
      return;
    }

    const interval = setInterval(() => {
      setInternalElapsedMs((prev) => prev + 100);
    }, 100);

    return () => clearInterval(interval);
  }, [isGenerating, externalElapsedMs]);

  // Calculate current step based on elapsed time
  const { currentStepIndex, stepProgress } = useMemo(() => {
    // Scale durations based on channel count
    const channelMultiplier = 1 + (channelCount - 1) * 0.4;
    let accumulated = 0;

    for (let i = 0; i < PROGRESS_STEPS.length; i++) {
      const step = PROGRESS_STEPS[i];
      const scaledDuration = i === 4 ? step.duration * channelMultiplier : step.duration;
      
      if (elapsedMs < accumulated + scaledDuration) {
        const progress = (elapsedMs - accumulated) / scaledDuration;
        return { currentStepIndex: i, stepProgress: Math.min(progress, 1) };
      }
      accumulated += scaledDuration;
    }

    return { currentStepIndex: PROGRESS_STEPS.length - 1, stepProgress: 1 };
  }, [elapsedMs, channelCount]);

  // Estimated remaining time
  const estimatedRemainingSeconds = useMemo(() => {
    const channelMultiplier = 1 + (channelCount - 1) * 0.4;
    const totalMs = PROGRESS_STEPS.reduce((sum, step, i) => {
      return sum + (i === 4 ? step.duration * channelMultiplier : step.duration);
    }, 0);
    const remaining = Math.max(0, totalMs - elapsedMs);
    return Math.ceil(remaining / 1000);
  }, [elapsedMs, channelCount]);

  if (!isGenerating) return null;

  const currentStep = PROGRESS_STEPS[currentStepIndex];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.98 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className={cn('w-full', className)}
      >
        <Card className="border-primary/30 bg-gradient-to-r from-primary/5 via-primary/10 to-secondary/5 shadow-lg shadow-primary/5 overflow-hidden">
          {/* Progress bar at top */}
          <div className="h-1 bg-primary/10 relative overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-secondary"
              initial={{ width: '0%' }}
              animate={{
                width: `${((currentStepIndex + stepProgress) / PROGRESS_STEPS.length) * 100}%`,
              }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
            {/* Shimmer effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              animate={{ x: ['0%', '200%'] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            />
          </div>

          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              {/* Left: Icon and main message */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="relative flex-shrink-0">
                  <motion.div
                    className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <Bot className="w-5 h-5 text-primary-foreground" />
                  </motion.div>
                  {/* Pulse ring */}
                  <motion.div
                    className="absolute inset-0 rounded-xl border-2 border-primary/50"
                    animate={{ scale: [1, 1.3], opacity: [0.5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                    <h3 className="font-semibold text-foreground truncate">
                      AI đang tạo nội dung đa kênh
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-2">
                    <span>Đang xử lý {channelCount} kênh</span>
                    <span className="text-primary/60">•</span>
                    <span className="text-primary font-medium">{currentStep?.label}</span>
                  </p>
                </div>
              </div>

              {/* Right: Time and expand button */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="text-right hidden sm:block">
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                    <span>~{estimatedRemainingSeconds}s còn lại</span>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpanded(!expanded)}
                  className="h-8 px-2 text-muted-foreground hover:text-foreground"
                >
                  {expanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Expanded: Detailed steps */}
            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 pt-4 border-t border-border/50 space-y-2">
                    {PROGRESS_STEPS.map((step, index) => {
                      const isComplete = index < currentStepIndex;
                      const isCurrent = index === currentStepIndex;
                      const isPending = index > currentStepIndex;

                      return (
                        <div
                          key={step.id}
                          className={cn(
                            'flex items-center gap-3 text-sm py-1.5 px-2 rounded-lg transition-colors',
                            isCurrent && 'bg-primary/10',
                            isComplete && 'text-muted-foreground',
                            isPending && 'text-muted-foreground/50'
                          )}
                        >
                          {/* Step indicator */}
                          <div
                            className={cn(
                              'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium',
                              isComplete && 'bg-primary text-primary-foreground',
                              isCurrent && 'bg-primary/20 text-primary border border-primary/50',
                              isPending && 'bg-muted text-muted-foreground'
                            )}
                          >
                            {isComplete ? '✓' : index + 1}
                          </div>

                          {/* Step label */}
                          <span className={cn(isCurrent && 'text-foreground font-medium')}>
                            {step.label}
                          </span>

                          {/* Loading indicator for current step */}
                          {isCurrent && (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary ml-auto" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
