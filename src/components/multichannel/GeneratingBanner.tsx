import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, ChevronDown, ChevronUp, Bot, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  GENERATION_STEPS, 
  calculateStepDurations, 
  calculateTotalDuration,
  PROGRESS_CAP_PERCENT,
  STEP_PROGRESS_MAP,
  type ProgressStepId,
} from './progressConstants';

interface GeneratingBannerProps {
  isGenerating: boolean;
  channelCount: number;
  elapsedMs?: number;
  className?: string;
  // Real-time progress from SSE streaming
  sseStep?: string;
  sseProgress?: number;
  sseMessage?: string;
  retryCount?: number;
}

export function GeneratingBanner({
  isGenerating,
  channelCount,
  elapsedMs: externalElapsedMs,
  className,
  sseStep,
  sseProgress,
  sseMessage,
  retryCount = 0,
}: GeneratingBannerProps) {
  const [internalElapsedMs, setInternalElapsedMs] = useState(0);
  const [expanded, setExpanded] = useState(false);

  const elapsedMs = externalElapsedMs ?? internalElapsedMs;

  // Calculate step durations based on channel count
  const steps = useMemo(() => calculateStepDurations(channelCount), [channelCount]);
  const totalDuration = useMemo(() => calculateTotalDuration(channelCount), [channelCount]);

  // Internal timer if no external elapsed provided and no SSE progress
  useEffect(() => {
    if (!isGenerating || externalElapsedMs !== undefined || sseProgress !== undefined) {
      if (!isGenerating) setInternalElapsedMs(0);
      return;
    }

    const interval = setInterval(() => {
      setInternalElapsedMs((prev) => prev + 100);
    }, 100);

    return () => clearInterval(interval);
  }, [isGenerating, externalElapsedMs, sseProgress]);

  // Find step index from SSE step ID or calculate from time
  const { currentStepIndex, stepProgress: calculatedStepProgress } = useMemo(() => {
    // If SSE step is provided, use it
    if (sseStep) {
      const sseIndex = steps.findIndex(s => s.id === sseStep);
      if (sseIndex >= 0) {
        return { currentStepIndex: sseIndex, stepProgress: 0.5 };
      }
    }

    // Fallback: calculate from elapsed time
    let accumulated = 0;
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (elapsedMs < accumulated + step.duration) {
        const progress = (elapsedMs - accumulated) / step.duration;
        return { currentStepIndex: i, stepProgress: Math.min(progress, 1) };
      }
      accumulated += step.duration;
    }
    return { currentStepIndex: steps.length - 1, stepProgress: 1 };
  }, [elapsedMs, steps, sseStep]);

  // Estimated remaining time
  const estimatedRemainingSeconds = useMemo(() => {
    const remaining = Math.max(0, totalDuration - elapsedMs);
    return Math.ceil(remaining / 1000);
  }, [elapsedMs, totalDuration]);

  // Calculate overall progress percentage - prefer SSE progress if available
  const progressPercent = useMemo(() => {
    if (sseProgress !== undefined) {
      return Math.min(PROGRESS_CAP_PERCENT, sseProgress);
    }
    const rawPercent = ((currentStepIndex + calculatedStepProgress) / steps.length) * 100;
    return Math.min(PROGRESS_CAP_PERCENT, rawPercent);
  }, [sseProgress, currentStepIndex, calculatedStepProgress, steps.length]);

  if (!isGenerating) return null;

  const activeStep = steps[currentStepIndex];
  // Display message: prefer SSE message, then step label
  const displayMessage = sseMessage || activeStep?.label || 'Đang xử lý...';

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
          <div className="h-1.5 bg-primary/10 relative overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-secondary"
              initial={{ width: '0%' }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
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
                    {retryCount > 0 && (
                      <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded">
                        <RefreshCw className="w-3 h-3" />
                        Retry {retryCount}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-2">
                    <span>Đang xử lý {channelCount} kênh</span>
                    <span className="text-primary/60">•</span>
                    <span className="text-primary font-medium truncate">{displayMessage}</span>
                  </p>
                </div>
              </div>

              {/* Right: Progress percentage and expand button */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="text-right hidden sm:block">
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                    <span className="font-medium text-primary">
                      {Math.round(progressPercent)}%
                    </span>
                    <span className="text-muted-foreground/70">
                      {estimatedRemainingSeconds > 5 
                        ? `~${estimatedRemainingSeconds}s`
                        : estimatedRemainingSeconds > 0
                          ? 'Sắp xong'
                          : '...'}
                    </span>
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
                    {steps.map((step, index) => {
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
                          <span className={cn('flex-1', isCurrent && 'text-foreground font-medium')}>
                            {step.label}
                            {isCurrent && step.id === 'retry' && retryCount > 0 && (
                              <span className="ml-2 text-xs text-amber-600">
                                (lần {retryCount})
                              </span>
                            )}
                          </span>

                          {/* Mini progress bar for current step */}
                          {isCurrent && (
                            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                              <motion.div
                                className="h-full bg-primary"
                                initial={{ width: '0%' }}
                                animate={{ width: `${calculatedStepProgress * 100}%` }}
                                transition={{ duration: 0.2 }}
                              />
                            </div>
                          )}

                          {/* Loading indicator for current step */}
                          {isCurrent && (step.id === 'ai' || step.id === 'retry') ? (
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                            >
                              <Sparkles className="w-3.5 h-3.5 text-primary" />
                            </motion.div>
                          ) : isCurrent ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                          ) : null}
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
