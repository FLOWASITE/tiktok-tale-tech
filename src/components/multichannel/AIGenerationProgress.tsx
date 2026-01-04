import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  Users, 
  Package, 
  FileText, 
  Sparkles, 
  CheckCircle2, 
  Wand2,
  Check,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  GENERATION_STEPS, 
  calculateTotalDuration,
  PROGRESS_CAP_PERCENT 
} from './progressConstants';

interface ProgressStep {
  id: string;
  label: string;
  icon: React.ReactNode;
  duration: number;
}

interface AIGenerationProgressProps {
  isLoading: boolean;
  channelCount: number;
  elapsedMs?: number;
  className?: string;
  // SSE progress props for real-time updates
  sseStep?: string;
  sseProgress?: number;
  sseMessage?: string;
  completedChannels?: string[];
  totalChannels?: string[];
}

// Map step IDs to icons
const STEP_ICONS: Record<string, React.ReactNode> = {
  brand: <Building2 className="w-4 h-4" />,
  personas: <Users className="w-4 h-4" />,
  industry: <Package className="w-4 h-4" />,
  prompt: <FileText className="w-4 h-4" />,
  ai: <Sparkles className="w-4 h-4" />,
  critique: <CheckCircle2 className="w-4 h-4" />,
  finalize: <Wand2 className="w-4 h-4" />,
};

// Build progress steps with icons from shared constants
const getProgressSteps = (channelCount: number): ProgressStep[] => {
  return GENERATION_STEPS.map(step => ({
    id: step.id,
    label: step.label,
    icon: STEP_ICONS[step.id] || <Sparkles className="w-4 h-4" />,
    duration: step.baseDuration + (step.channelScaling || 0) * Math.max(0, channelCount - 1)
  }));
};

export function AIGenerationProgress({ 
  isLoading, 
  channelCount, 
  elapsedMs: externalElapsedMs, 
  className,
  sseStep,
  sseProgress,
  sseMessage,
  completedChannels,
  totalChannels,
}: AIGenerationProgressProps) {
  const [internalElapsedMs, setInternalElapsedMs] = useState(0);
  
  // Use external elapsed if provided, otherwise track internally
  const elapsed = externalElapsedMs ?? internalElapsedMs;

  useEffect(() => {
    if (!isLoading || externalElapsedMs !== undefined) {
      setInternalElapsedMs(0);
      return;
    }
    
    const startTime = Date.now();
    const interval = setInterval(() => {
      setInternalElapsedMs(Date.now() - startTime);
    }, 100);
    
    return () => clearInterval(interval);
  }, [isLoading, externalElapsedMs]);

  const steps = useMemo(() => getProgressSteps(channelCount), [channelCount]);
  
  // Calculate cumulative thresholds
  const stepThresholds = useMemo(() => {
    let cumulative = 0;
    return steps.map(step => {
      cumulative += step.duration;
      return cumulative;
    });
  }, [steps]);

  const totalDuration = useMemo(() => calculateTotalDuration(channelCount), [channelCount]);

  // Determine step statuses - prioritize SSE data when available
  const stepsWithStatus = useMemo(() => {
    // If we have SSE step data, use it to determine status
    if (sseStep) {
      const sseStepIndex = steps.findIndex(s => s.id === sseStep);
      return steps.map((step, index) => {
        let status: 'pending' | 'active' | 'complete';
        if (index < sseStepIndex) {
          status = 'complete';
        } else if (index === sseStepIndex) {
          status = sseStep === 'complete' ? 'complete' : 'active';
        } else {
          status = 'pending';
        }
        return { ...step, status };
      });
    }
    
    // Fallback to time-based calculation
    return steps.map((step, index) => {
      const stepStart = index === 0 ? 0 : stepThresholds[index - 1];
      const stepEnd = stepThresholds[index];
      
      let status: 'pending' | 'active' | 'complete';
      if (elapsed >= stepEnd) {
        status = 'complete';
      } else if (elapsed >= stepStart) {
        status = 'active';
      } else {
        status = 'pending';
      }
      
      return { ...step, status };
    });
  }, [steps, stepThresholds, elapsed, sseStep]);

  // Calculate remaining time - use SSE progress if available
  const effectiveProgress = sseProgress ?? Math.min(PROGRESS_CAP_PERCENT, (elapsed / totalDuration) * 100);
  const remainingMs = Math.max(0, totalDuration - elapsed);
  const remainingSeconds = Math.ceil(remainingMs / 1000);

  // Display message - prioritize SSE message
  const displayMessage = sseMessage || (
    remainingSeconds > 5 
      ? `Còn khoảng ${remainingSeconds} giây...` 
      : remainingSeconds > 0
        ? 'Sắp hoàn thành...'
        : 'Đang hoàn thiện, vui lòng chờ...'
  );

  // Channel progress display
  const channelProgressText = completedChannels && totalChannels 
    ? `${completedChannels.length}/${totalChannels.length} kênh`
    : `${channelCount} kênh`;

  if (!isLoading) return null;

  return (
    <motion.div 
      className={cn("space-y-4", className)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10">
          <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
        </div>
        <span>Đang tạo nội dung cho {channelProgressText}</span>
      </div>

      {/* SSE Message Display */}
      {sseMessage && (
        <motion.div 
          className="px-3 py-2 bg-primary/10 rounded-lg text-sm text-primary font-medium"
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          key={sseMessage} // Re-animate on message change
        >
          {sseMessage}
        </motion.div>
      )}

      {/* Progress Timeline */}
      <div className="relative pl-6">
        {/* Vertical line */}
        <div className="absolute left-[11px] top-2 bottom-2 w-[2px] bg-border" />
        
        {/* Progress fill */}
        <motion.div 
          className="absolute left-[11px] top-2 w-[2px] bg-primary"
          initial={{ height: 0 }}
          animate={{ 
            height: `${effectiveProgress}%` 
          }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />

        {/* Steps */}
        <div className="space-y-3">
          <AnimatePresence mode="sync">
            {stepsWithStatus.map((step, index) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1, duration: 0.3 }}
                className="relative flex items-center gap-3"
              >
                {/* Status indicator */}
                <div 
                  className={cn(
                    "relative z-10 flex items-center justify-center w-6 h-6 rounded-full border-2 transition-all duration-300",
                    step.status === 'complete' && "bg-primary border-primary",
                    step.status === 'active' && "bg-background border-primary",
                    step.status === 'pending' && "bg-background border-muted-foreground/30"
                  )}
                >
                  {step.status === 'complete' ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    >
                      <Check className="w-3.5 h-3.5 text-primary-foreground" />
                    </motion.div>
                  ) : step.status === 'active' ? (
                    <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                  )}
                </div>

                {/* Step content */}
                <div className="flex-1 flex items-center gap-2">
                  <span 
                    className={cn(
                      "transition-colors duration-300",
                      step.status === 'complete' && "text-primary",
                      step.status === 'active' && "text-foreground",
                      step.status === 'pending' && "text-muted-foreground"
                    )}
                  >
                    {step.icon}
                  </span>
                  <span 
                    className={cn(
                      "text-sm transition-colors duration-300",
                      step.status === 'complete' && "text-foreground",
                      step.status === 'active' && "text-foreground font-medium",
                      step.status === 'pending' && "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </span>
                  
                  {/* Active shimmer */}
                  {step.status === 'active' && (
                    <motion.div
                      className="ml-auto h-1 w-12 rounded-full bg-gradient-to-r from-primary/20 via-primary/50 to-primary/20"
                      animate={{
                        backgroundPosition: ['200% 0', '-200% 0'],
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: 'linear',
                      }}
                      style={{
                        backgroundSize: '200% 100%',
                      }}
                    />
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Status message - only show if no SSE message */}
      {!sseMessage && (
        <motion.div 
          className="flex items-center justify-center gap-2 text-xs text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Sparkles className="w-3 h-3" />
          <span>{displayMessage}</span>
        </motion.div>
      )}
    </motion.div>
  );
}
