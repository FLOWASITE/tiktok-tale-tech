import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Step {
  id: number;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  optional?: boolean;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (step: number) => void;
  completedSteps?: number[];
}

export function StepIndicator({ 
  steps, 
  currentStep, 
  onStepClick,
  completedSteps = []
}: StepIndicatorProps) {
  return (
    <div className="w-full">
      {/* Desktop view */}
      <div className="hidden sm:flex items-center justify-between relative">
        {/* Progress line background */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-border" />
        
        {/* Progress line fill */}
        <div 
          className="absolute top-5 left-0 h-0.5 bg-primary transition-all duration-500"
          style={{ 
            width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` 
          }}
        />
        
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(step.id) || step.id < currentStep;
          const isCurrent = step.id === currentStep;
          const isClickable = onStepClick && (isCompleted || step.id <= currentStep);
          
          return (
            <div 
              key={step.id}
              className={cn(
                "relative flex flex-col items-center z-10",
                isClickable && "cursor-pointer"
              )}
              onClick={() => isClickable && onStepClick?.(step.id)}
            >
              {/* Step circle */}
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-2",
                isCompleted && "bg-primary border-primary text-primary-foreground",
                isCurrent && !isCompleted && "bg-primary/10 border-primary text-primary animate-pulse",
                !isCompleted && !isCurrent && "bg-muted border-border text-muted-foreground"
              )}>
                {isCompleted ? (
                  <Check className="w-5 h-5" />
                ) : (
                  step.icon || <span className="text-sm font-semibold">{step.id}</span>
                )}
              </div>
              
              {/* Step title */}
              <div className="mt-2 text-center">
                <p className={cn(
                  "text-xs font-medium transition-colors",
                  isCurrent && "text-primary",
                  isCompleted && "text-foreground",
                  !isCompleted && !isCurrent && "text-muted-foreground"
                )}>
                  {step.title}
                </p>
                {step.optional && (
                  <span className="text-[10px] text-muted-foreground">(tùy chọn)</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Mobile view - compact */}
      <div className="sm:hidden flex items-center justify-center gap-2">
        {steps.map((step) => {
          const isCompleted = completedSteps.includes(step.id) || step.id < currentStep;
          const isCurrent = step.id === currentStep;
          
          return (
            <div 
              key={step.id}
              className={cn(
                "w-2.5 h-2.5 rounded-full transition-all duration-300",
                isCompleted && "bg-primary",
                isCurrent && !isCompleted && "bg-primary/50 ring-2 ring-primary/30",
                !isCompleted && !isCurrent && "bg-muted"
              )}
            />
          );
        })}
        <span className="ml-2 text-xs text-muted-foreground">
          {currentStep}/{steps.length}: {steps.find(s => s.id === currentStep)?.title}
        </span>
      </div>
    </div>
  );
}
