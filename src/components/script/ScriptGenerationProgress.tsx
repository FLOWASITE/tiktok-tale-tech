import { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  Cpu,
  Search,
  Database,
  LayoutList,
  PenTool,
  ShieldCheck,
} from 'lucide-react';

interface GenerationStep {
  id: number;
  label: string;
  icon: React.ReactNode;
  startPercent: number;
  endPercent: number;
  durationMs: number;
}

const GENERATION_STEPS: GenerationStep[] = [
  { id: 1, label: 'Khởi tạo...', icon: <Cpu className="w-4 h-4" />, startPercent: 0, endPercent: 5, durationMs: 1000 },
  { id: 2, label: 'Phân tích chủ đề & brand', icon: <Search className="w-4 h-4" />, startPercent: 5, endPercent: 20, durationMs: 3000 },
  { id: 3, label: 'Tải dữ liệu ngành', icon: <Database className="w-4 h-4" />, startPercent: 20, endPercent: 35, durationMs: 3000 },
  { id: 4, label: 'Xây dựng cấu trúc kịch bản', icon: <LayoutList className="w-4 h-4" />, startPercent: 35, endPercent: 55, durationMs: 4000 },
  { id: 5, label: 'AI đang viết nội dung', icon: <PenTool className="w-4 h-4" />, startPercent: 55, endPercent: 85, durationMs: 12000 },
  { id: 6, label: 'Đánh giá & hoàn thiện', icon: <ShieldCheck className="w-4 h-4" />, startPercent: 85, endPercent: 95, durationMs: 5000 },
];

interface ScriptGenerationProgressProps {
  isActive: boolean;
  isComplete?: boolean;
  topic?: string;
  videoType?: string;
  duration?: number;
}

export function ScriptGenerationProgress({
  isActive,
  isComplete = false,
  topic,
  videoType,
  duration,
}: ScriptGenerationProgressProps) {
  const [progress, setProgress] = useState(0);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);

  // Reset on activation
  useEffect(() => {
    if (isActive) {
      setProgress(0);
      setActiveStepIndex(0);
      setStartTime(Date.now());
    } else {
      setStartTime(null);
    }
  }, [isActive]);

  // Jump to 100% when complete
  useEffect(() => {
    if (isComplete) {
      setProgress(100);
      setActiveStepIndex(GENERATION_STEPS.length);
    }
  }, [isComplete]);

  // Animate progress
  useEffect(() => {
    if (!isActive || isComplete || !startTime) return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      let cumulativeTime = 0;
      let currentStepIdx = 0;
      let currentProgress = 0;

      for (let i = 0; i < GENERATION_STEPS.length; i++) {
        const step = GENERATION_STEPS[i];
        if (elapsed < cumulativeTime + step.durationMs) {
          currentStepIdx = i;
          const stepElapsed = elapsed - cumulativeTime;
          const stepProgress = stepElapsed / step.durationMs;
          // Ease out for smoother feel
          const eased = 1 - Math.pow(1 - stepProgress, 2);
          currentProgress = step.startPercent + (step.endPercent - step.startPercent) * eased;
          break;
        }
        cumulativeTime += step.durationMs;
        currentProgress = step.endPercent;
        currentStepIdx = i + 1;
      }

      // Cap at 95%
      currentProgress = Math.min(currentProgress, 95);
      setProgress(currentProgress);
      setActiveStepIndex(Math.min(currentStepIdx, GENERATION_STEPS.length - 1));
    }, 50);

    return () => clearInterval(interval);
  }, [isActive, isComplete, startTime]);

  const currentStepLabel = useMemo(() => {
    if (isComplete) return 'Hoàn tất!';
    if (activeStepIndex < GENERATION_STEPS.length) return GENERATION_STEPS[activeStepIndex].label;
    return GENERATION_STEPS[GENERATION_STEPS.length - 1].label;
  }, [activeStepIndex, isComplete]);

  if (!isActive) return null;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header info */}
      <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/5 via-background to-primary/5 p-5 relative overflow-hidden">
        {/* Animated shimmer bg */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent animate-shimmer pointer-events-none" />

        <div className="relative flex items-center gap-3 mb-4">
          <div className="relative">
            <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary animate-pulse" />
            </div>
            <div className="absolute -inset-1 bg-primary/20 rounded-full blur-md animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">Đang tạo kịch bản</span>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
            </div>
            {topic && (
              <p className="text-xs text-muted-foreground truncate mt-0.5 max-w-[280px]">
                {topic}
              </p>
            )}
          </div>
          <div className="text-right">
            <span className="text-lg font-bold text-primary tabular-nums">
              {Math.round(progress)}%
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <Progress value={progress} className="h-2 bg-muted/50" />

        {/* Current step label */}
        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
          {!isComplete && <Loader2 className="w-3 h-3 animate-spin" />}
          {currentStepLabel}
        </p>
      </div>

      {/* Steps timeline */}
      <div className="space-y-1">
        {GENERATION_STEPS.map((step, index) => {
          const isCompleted = isComplete || activeStepIndex > index;
          const isCurrent = !isComplete && activeStepIndex === index;
          const isPending = !isComplete && activeStepIndex < index;

          return (
            <div
              key={step.id}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300",
                isCurrent && "bg-primary/5",
                isPending && "opacity-40"
              )}
            >
              {/* Icon */}
              <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all duration-300",
                isCompleted && "bg-primary/10 text-primary",
                isCurrent && "bg-primary/10 text-primary",
                isPending && "bg-muted text-muted-foreground"
              )}>
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                ) : isCurrent ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  step.icon
                )}
              </div>

              {/* Label */}
              <span className={cn(
                "text-sm transition-colors duration-300",
                isCompleted && "text-foreground",
                isCurrent && "text-foreground font-medium",
                isPending && "text-muted-foreground"
              )}>
                {step.label}
              </span>

              {/* Completed checkmark */}
              {isCompleted && (
                <span className="ml-auto text-xs text-primary">✓</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Skeleton preview */}
      <div className="space-y-3 px-1">
        <div className="text-xs text-muted-foreground/60 uppercase tracking-wide">Xem trước...</div>
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-full" style={{ animationDelay: '100ms' }} />
        <Skeleton className="h-4 w-5/6" style={{ animationDelay: '200ms' }} />
        <Skeleton className="h-4 w-2/3" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}
