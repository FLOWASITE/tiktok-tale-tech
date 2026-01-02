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

interface ProgressStep {
  id: string;
  label: string;
  icon: React.ReactNode;
  duration: number; // ms
}

interface AIGenerationProgressProps {
  isLoading: boolean;
  channelCount: number;
  elapsedMs?: number;
  className?: string;
}

// Dynamic step durations based on channel count
// Durations aligned with backend reality (~15-25s total)
const getProgressSteps = (channelCount: number): ProgressStep[] => [
  { id: 'brand', label: 'Tải ngữ cảnh thương hiệu', icon: <Building2 className="w-4 h-4" />, duration: 1500 },
  { id: 'personas', label: 'Phân tích personas & sản phẩm', icon: <Users className="w-4 h-4" />, duration: 1200 },
  { id: 'industry', label: 'Tải dữ liệu ngành', icon: <Package className="w-4 h-4" />, duration: 1000 },
  { id: 'prompt', label: 'Xây dựng prompt AI', icon: <FileText className="w-4 h-4" />, duration: 800 },
  { id: 'ai', label: 'AI đang tạo nội dung', icon: <Sparkles className="w-4 h-4" />, duration: 6000 + (channelCount * 1500) },
  { id: 'critique', label: 'Đánh giá chất lượng', icon: <CheckCircle2 className="w-4 h-4" />, duration: 4000 },
  { id: 'finalize', label: 'Tối ưu và hoàn thiện', icon: <Wand2 className="w-4 h-4" />, duration: 5000 },
];

export function AIGenerationProgress({ 
  isLoading, 
  channelCount, 
  elapsedMs: externalElapsedMs, 
  className 
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

  const totalDuration = stepThresholds[stepThresholds.length - 1];

  // Determine step statuses based on elapsed time
  const stepsWithStatus = useMemo(() => {
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
  }, [steps, stepThresholds, elapsed]);

  // Calculate remaining time
  const remainingMs = Math.max(0, totalDuration - elapsed);
  const remainingSeconds = Math.ceil(remainingMs / 1000);

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
        <span>Đang tạo nội dung cho {channelCount} kênh</span>
      </div>

      {/* Progress Timeline */}
      <div className="relative pl-6">
        {/* Vertical line */}
        <div className="absolute left-[11px] top-2 bottom-2 w-[2px] bg-border" />
        
        {/* Progress fill */}
        <motion.div 
          className="absolute left-[11px] top-2 w-[2px] bg-primary"
          initial={{ height: 0 }}
          animate={{ 
            // Cap at 95% until actual completion to avoid "stuck at 100%" feeling
            height: `${Math.min(95, (elapsed / totalDuration) * 100)}%` 
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

      {/* Estimated time */}
      <motion.div 
        className="flex items-center justify-center gap-2 text-xs text-muted-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <Sparkles className="w-3 h-3" />
        <span>
          {remainingSeconds > 5 
            ? `Còn khoảng ${remainingSeconds} giây...` 
            : remainingSeconds > 0
              ? 'Sắp hoàn thành...'
              : 'Đang hoàn thiện, vui lòng chờ...'}
        </span>
      </motion.div>
    </motion.div>
  );
}
