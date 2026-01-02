import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Sparkles, Users, Package, Brain, Building2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ProgressStep {
  id: string;
  label: string;
  icon: React.ReactNode;
  status: 'pending' | 'active' | 'complete';
  duration?: number;
}

interface TopicRefinementProgressProps {
  isLoading: boolean;
  elapsedMs?: number;
  className?: string;
}

const PROGRESS_STEPS: Omit<ProgressStep, 'status'>[] = [
  { id: 'brand', label: 'Tải ngữ cảnh thương hiệu', icon: <Building2 className="h-3.5 w-3.5" />, duration: 400 },
  { id: 'personas', label: 'Phân tích personas & sản phẩm', icon: <Users className="h-3.5 w-3.5" />, duration: 600 },
  { id: 'industry', label: 'Tải dữ liệu ngành', icon: <Package className="h-3.5 w-3.5" />, duration: 400 },
  { id: 'learning', label: 'Học từ lịch sử', icon: <Brain className="h-3.5 w-3.5" />, duration: 300 },
  { id: 'ai', label: 'AI đang tinh chỉnh chủ đề', icon: <Sparkles className="h-3.5 w-3.5" />, duration: 1500 },
];

// Calculate cumulative thresholds
const STEP_THRESHOLDS = PROGRESS_STEPS.reduce<number[]>((acc, step, i) => {
  const prev = acc[i - 1] || 0;
  acc.push(prev + (step.duration || 500));
  return acc;
}, []);

export function TopicRefinementProgress({
  isLoading,
  elapsedMs = 0,
  className,
}: TopicRefinementProgressProps) {
  const [internalElapsed, setInternalElapsed] = useState(0);
  
  // Track elapsed time internally when loading
  useEffect(() => {
    if (!isLoading) {
      setInternalElapsed(0);
      return;
    }
    
    const startTime = Date.now();
    const interval = setInterval(() => {
      setInternalElapsed(Date.now() - startTime);
    }, 100);
    
    return () => clearInterval(interval);
  }, [isLoading]);
  
  const elapsed = elapsedMs > 0 ? elapsedMs : internalElapsed;
  
  // Calculate which steps are complete/active based on elapsed time
  const stepsWithStatus = useMemo(() => {
    return PROGRESS_STEPS.map((step, i) => {
      const threshold = STEP_THRESHOLDS[i];
      const prevThreshold = STEP_THRESHOLDS[i - 1] || 0;
      
      let status: 'pending' | 'active' | 'complete' = 'pending';
      if (elapsed >= threshold) {
        status = 'complete';
      } else if (elapsed >= prevThreshold) {
        status = 'active';
      }
      
      return { ...step, status };
    });
  }, [elapsed]);
  
  const activeStepIndex = stepsWithStatus.findIndex(s => s.status === 'active');
  const progressPercentage = Math.min(100, Math.round((elapsed / STEP_THRESHOLDS[STEP_THRESHOLDS.length - 1]) * 100));
  
  if (!isLoading) return null;
  
  return (
    <div className={cn("space-y-2", className)}>
      {/* Timeline */}
      <div className="relative pl-6">
        {/* Vertical line */}
        <div className="absolute left-[9px] top-2 bottom-2 w-px bg-border" />
        
        {/* Progress fill */}
        <motion.div 
          className="absolute left-[9px] top-2 w-px bg-primary"
          initial={{ height: 0 }}
          animate={{ height: `${progressPercentage}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
        
        <div className="space-y-2">
          <AnimatePresence mode="sync">
            {stepsWithStatus.map((step, index) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1, duration: 0.2 }}
                className="relative flex items-center gap-2"
              >
                {/* Status indicator */}
                <div className="absolute -left-6 flex items-center justify-center">
                  <div
                    className={cn(
                      "h-[18px] w-[18px] rounded-full flex items-center justify-center transition-all duration-300",
                      step.status === 'complete' && "bg-primary text-primary-foreground",
                      step.status === 'active' && "bg-primary/20 border-2 border-primary",
                      step.status === 'pending' && "bg-muted border border-border"
                    )}
                  >
                    {step.status === 'complete' ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                      >
                        <Check className="h-3 w-3" />
                      </motion.div>
                    ) : step.status === 'active' ? (
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 1 }}
                        className="h-2 w-2 rounded-full bg-primary"
                      />
                    ) : (
                      <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                    )}
                  </div>
                </div>
                
                {/* Step content */}
                <div
                  className={cn(
                    "flex items-center gap-2 py-1.5 px-2 rounded-md text-sm transition-all duration-300",
                    step.status === 'active' && "bg-primary/5 text-primary font-medium",
                    step.status === 'complete' && "text-muted-foreground",
                    step.status === 'pending' && "text-muted-foreground/60"
                  )}
                >
                  <span className={cn(
                    "transition-colors",
                    step.status === 'active' && "text-primary",
                    step.status === 'complete' && "text-primary/60",
                    step.status === 'pending' && "text-muted-foreground/40"
                  )}>
                    {step.icon}
                  </span>
                  <span>{step.label}</span>
                  
                  {/* Active shimmer */}
                  {step.status === 'active' && (
                    <Loader2 className="h-3 w-3 animate-spin text-primary ml-auto" />
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
      
      {/* Estimated time */}
      <motion.div 
        className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground pt-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <Sparkles className="h-3 w-3 text-primary/60" />
        <span>
          {activeStepIndex >= PROGRESS_STEPS.length - 1 
            ? "Đang hoàn tất..." 
            : `Còn khoảng ${Math.max(1, Math.ceil((STEP_THRESHOLDS[STEP_THRESHOLDS.length - 1] - elapsed) / 1000))} giây...`
          }
        </span>
      </motion.div>
    </div>
  );
}

export default TopicRefinementProgress;
