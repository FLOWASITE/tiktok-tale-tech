import { useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, X, BookOpen, ListOrdered, FileText, CheckCircle, Clock, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { CoreContentProgress } from "@/hooks/useStreamingCoreContent";

// Step labels mapping
const STEP_LABELS: Record<string, string> = {
  init: "Khởi tạo...",
  research: "Đang thu thập dữ liệu từ web...",
  outline: "Đang tạo dàn ý...",
  outline_done: "Đã tạo dàn ý",
  section_1: "Đang viết phần 1/5...",
  section_2: "Đang viết phần 2/5...",
  section_3: "Đang viết phần 3/5...",
  section_4: "Đang viết phần 4/5...",
  section_5: "Đang viết phần 5/5...",
  compile: "Đang hoàn thiện...",
  saving: "Đang lưu...",
  complete: "Hoàn thành!",
  error: "Lỗi xảy ra",
  generating: "Đang tạo nội dung...",
  fallback: "Chuyển chế độ đơn giản...",
};

// Quality mode labels
type QualityMode = 'fast' | 'balanced' | 'quality';

const QUALITY_MODE_LABELS: Record<QualityMode, { icon: string; label: string }> = {
  fast: { icon: "⚡", label: "Nhanh" },
  balanced: { icon: "⚖️", label: "Cân bằng" },
  quality: { icon: "✨", label: "Chất lượng cao" },
};

// Step Progress Indicator Component
function StepProgressIndicator({ 
  progress,
  qualityMode 
}: { 
  progress: CoreContentProgress; 
  qualityMode: QualityMode;
}) {
  // Calculate remaining time display
  const remainingDisplay = useMemo(() => {
    if (!progress.estimatedRemainingMs || progress.estimatedRemainingMs <= 0) return null;
    const seconds = Math.ceil(progress.estimatedRemainingMs / 1000);
    if (seconds < 60) return `~${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSecs = seconds % 60;
    return remainingSecs > 0 ? `~${minutes}m ${remainingSecs}s` : `~${minutes}m`;
  }, [progress.estimatedRemainingMs]);

  // Define steps based on quality mode
  const steps = useMemo(() => {
    if (qualityMode === 'fast') {
      return [
        { id: 'generating', label: 'Tạo nội dung', icon: Sparkles },
      ];
    }
    return [
      { id: 'outline', label: 'Dàn ý', icon: ListOrdered },
      { id: 'sections', label: 'Nội dung', icon: FileText },
      { id: 'compile', label: 'Hoàn thiện', icon: CheckCircle },
    ];
  }, [qualityMode]);

  // Determine current step state
  const getStepState = (stepId: string) => {
    const currentStep = progress.step || '';
    
    if (stepId === 'outline') {
      if (currentStep === 'outline') return 'active';
      if (currentStep === 'outline_done' || currentStep.startsWith('section') || currentStep === 'compile' || currentStep === 'saving' || currentStep === 'complete') return 'complete';
      return 'pending';
    }
    
    if (stepId === 'sections') {
      if (currentStep.startsWith('section')) return 'active';
      if (currentStep === 'compile' || currentStep === 'saving' || currentStep === 'complete') return 'complete';
      if (currentStep === 'outline' || currentStep === 'outline_done' || currentStep === 'init') return 'pending';
      return 'pending';
    }
    
    if (stepId === 'compile') {
      if (currentStep === 'compile' || currentStep === 'saving') return 'active';
      if (currentStep === 'complete') return 'complete';
      return 'pending';
    }
    
    if (stepId === 'generating') {
      if (currentStep === 'generating') return 'active';
      if (currentStep === 'complete') return 'complete';
      return 'pending';
    }
    
    return 'pending';
  };

  return (
    <div className="space-y-2">
      {/* Mini stepper */}
      <div className="flex items-center gap-1 flex-wrap">
        {steps.map((step, idx) => {
          const state = getStepState(step.id);
          const Icon = step.icon;
          
          return (
            <div key={step.id} className="flex items-center gap-1">
              <div className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-all",
                state === 'active' && "bg-primary/20 text-primary font-medium",
                state === 'complete' && "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
                state === 'pending' && "bg-muted text-muted-foreground"
              )}>
                <Icon className={cn(
                  "w-3 h-3",
                  state === 'active' && "animate-pulse"
                )} />
                <span>{step.label}</span>
                {state === 'complete' && (
                  <CheckCircle className="w-3 h-3 ml-0.5" />
                )}
              </div>
              {idx < steps.length - 1 && (
                <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* Time estimate */}
      {remainingDisplay && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>Còn khoảng {remainingDisplay}</span>
        </div>
      )}
    </div>
  );
}

interface CoreContentStreamingCardProps {
  streamingText: string;
  progress: CoreContentProgress;
  isStreaming: boolean;
  qualityMode: QualityMode;
  onCancel?: () => void;
}

export function CoreContentStreamingCard({
  streamingText,
  progress,
  isStreaming,
  qualityMode,
  onCancel,
}: CoreContentStreamingCardProps) {
  const textRef = useRef<HTMLDivElement>(null);

  // Auto-scroll when new text arrives
  useEffect(() => {
    if (textRef.current && isStreaming) {
      textRef.current.scrollTop = textRef.current.scrollHeight;
    }
  }, [streamingText, isStreaming]);

  // Word count calculation
  const wordCount = useMemo(() => {
    if (!streamingText) return 0;
    return streamingText.trim().split(/\s+/).filter(Boolean).length;
  }, [streamingText]);

  // Get step label
  const stepLabel = useMemo(() => {
    return STEP_LABELS[progress.step] || progress.message || "Đang xử lý...";
  }, [progress.step, progress.message]);

  const modeInfo = QUALITY_MODE_LABELS[qualityMode] || QUALITY_MODE_LABELS.balanced;

  return (
    <Card className={cn(
      "bg-card/50 backdrop-blur-sm border-primary/30",
      "ring-2 ring-primary/20 shadow-lg shadow-primary/5",
      "transition-all duration-300"
    )}>
      <CardHeader className="pb-3 pt-4 px-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary animate-pulse" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Đang tạo Core Content</h3>
              <p className="text-xs text-muted-foreground">{stepLabel}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {modeInfo.icon} {modeInfo.label}
            </Badge>
            {onCancel && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-muted-foreground hover:text-foreground" 
                onClick={onCancel}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Step Progress Indicator */}
        <div className="mt-3">
          <StepProgressIndicator progress={progress} qualityMode={qualityMode} />
        </div>

        {/* Progress Bar */}
        <div className="mt-3 space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Tiến độ tổng</span>
            <span className="tabular-nums font-medium">{Math.round(progress.progress)}%</span>
          </div>
          <Progress value={progress.progress} className="h-2" />
          
        </div>
      </CardHeader>

      <CardContent className="px-5 pb-4 pt-0">
        {/* Streaming Text Display */}
        <div
          ref={textRef}
          className={cn(
            "rounded-lg bg-muted/30 p-4 overflow-y-auto scrollbar-thin",
            "border border-border/50",
            "min-h-[150px] max-h-[300px]"
          )}
        >
          {streamingText ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words text-foreground/90">
              {streamingText}
              {isStreaming && !progress.isComplete && (
                <motion.span
                  className="inline-block w-0.5 h-4 bg-primary ml-0.5 align-middle"
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
                />
              )}
            </p>
          ) : (
            <div className="flex flex-col items-center justify-center h-[120px] text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mb-2 text-primary/60" />
              <span className="text-sm">{stepLabel}</span>
            </div>
          )}
        </div>

        {/* Footer Stats */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              <span className="tabular-nums">{wordCount}</span> từ
            </span>
          </div>
          
          {onCancel && (
            <Button 
              variant="outline" 
              size="sm" 
              className="h-7 text-xs gap-1.5" 
              onClick={onCancel}
            >
              <X className="w-3 h-3" />
              Huỷ bỏ
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
