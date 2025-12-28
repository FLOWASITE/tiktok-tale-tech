import { cn } from '@/lib/utils';
import { Check, User, Palette, Megaphone, Globe, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';

export interface Step {
  id: number;
  title: string;
  shortTitle: string;
  icon: React.ReactNode;
}

export const BRAND_FORM_STEPS: Step[] = [
  { id: 1, title: 'Nhận dạng', shortTitle: 'Identity', icon: <User className="w-4 h-4" /> },
  { id: 2, title: 'Hình ảnh', shortTitle: 'Visual', icon: <Palette className="w-4 h-4" /> },
  { id: 3, title: 'Brand Voice', shortTitle: 'Voice', icon: <Megaphone className="w-4 h-4" /> },
  { id: 4, title: 'Kênh', shortTitle: 'Channels', icon: <Globe className="w-4 h-4" /> },
  { id: 5, title: 'Guideline', shortTitle: 'Guideline', icon: <FileText className="w-4 h-4" /> },
];

interface BrandFormStepperProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
  completedSteps?: number[];
  validationErrors?: Record<number, boolean>;
}

export function BrandFormStepper({ 
  currentStep, 
  onStepClick, 
  completedSteps = [],
  validationErrors = {}
}: BrandFormStepperProps) {
  const currentStepData = BRAND_FORM_STEPS[currentStep - 1];
  
  return (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b pb-4 mb-6 -mx-1 px-1 pt-1">
      {/* Progress bar */}
      <div className="flex items-center gap-1 mb-3">
        {BRAND_FORM_STEPS.map((step) => {
          const isCompleted = completedSteps.includes(step.id) || currentStep > step.id;
          const hasError = validationErrors[step.id];
          
          return (
            <div
              key={step.id}
              className={cn(
                'flex-1 h-1.5 rounded-full transition-all duration-300',
                currentStep >= step.id ? 'bg-primary' : 'bg-muted',
                isCompleted && !hasError && 'bg-primary',
                hasError && 'bg-amber-500'
              )}
            />
          );
        })}
      </div>

      {/* Desktop: Step labels */}
      <div className="hidden sm:flex items-center justify-between">
        {BRAND_FORM_STEPS.map((step) => {
          const isActive = currentStep === step.id;
          const isCompleted = completedSteps.includes(step.id) || currentStep > step.id;
          const hasError = validationErrors[step.id];
          const isClickable = onStepClick && (isCompleted || step.id <= currentStep);

          return (
            <button
              key={step.id}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isClickable) return;
                onStepClick?.(step.id);
              }}
              disabled={!isClickable}
              className={cn(
                'flex items-center gap-2 text-xs transition-all duration-200 group',
                isActive && 'text-primary font-medium',
                isCompleted && !isActive && 'text-muted-foreground hover:text-primary',
                !isActive && !isCompleted && 'text-muted-foreground/50',
                hasError && 'text-amber-600',
                isClickable && 'cursor-pointer'
              )}
            >
              <div
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all duration-200',
                  isActive && 'bg-primary text-primary-foreground shadow-md scale-110',
                  isCompleted && !isActive && 'bg-primary/20 text-primary group-hover:bg-primary/30',
                  !isActive && !isCompleted && 'bg-muted text-muted-foreground',
                  hasError && 'bg-amber-500/20 text-amber-600'
                )}
              >
                {isCompleted && !isActive ? (
                  <Check className="w-3.5 h-3.5" />
                ) : hasError ? (
                  <span className="text-amber-600">!</span>
                ) : (
                  step.icon
                )}
              </div>
              <div className="hidden md:flex flex-col items-start">
                <span className={cn(
                  "transition-colors",
                  isCompleted && !isActive && "line-through opacity-60"
                )}>
                  {step.title}
                </span>
                {isCompleted && !isActive && (
                  <span className="text-[10px] text-primary/70">Hoàn thành</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Mobile: Enhanced navigation */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between">
          {/* Previous button */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => currentStep > 1 && onStepClick?.(currentStep - 1)}
            disabled={currentStep === 1}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          {/* Current step indicator */}
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center",
              "bg-primary text-primary-foreground shadow-md"
            )}>
              {currentStepData?.icon}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium">{currentStepData?.title}</span>
              <span className="text-[10px] text-muted-foreground">
                Bước {currentStep}/{BRAND_FORM_STEPS.length}
              </span>
            </div>
          </div>

          {/* Next button */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => currentStep < BRAND_FORM_STEPS.length && onStepClick?.(currentStep + 1)}
            disabled={currentStep === BRAND_FORM_STEPS.length}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Mobile step dots */}
        <div className="flex items-center justify-center gap-2 mt-2">
          {BRAND_FORM_STEPS.map((step) => {
            const isActive = currentStep === step.id;
            const isCompleted = completedSteps.includes(step.id) || currentStep > step.id;
            const hasError = validationErrors[step.id];

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => onStepClick?.(step.id)}
                disabled={!onStepClick || (!isCompleted && step.id > currentStep)}
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center transition-all",
                  isActive && "bg-primary text-primary-foreground",
                  isCompleted && !isActive && "bg-primary/20 text-primary",
                  !isActive && !isCompleted && "bg-muted text-muted-foreground/50",
                  hasError && "bg-amber-500/20 text-amber-600"
                )}
              >
                {isCompleted && !isActive ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <span className="text-[10px]">{step.id}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
