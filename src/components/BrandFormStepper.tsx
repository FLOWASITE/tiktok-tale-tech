import { cn } from '@/lib/utils';
import { Check, Info, Megaphone, Settings, Globe } from 'lucide-react';

export interface Step {
  id: number;
  title: string;
  icon: React.ReactNode;
}

export const BRAND_FORM_STEPS: Step[] = [
  { id: 1, title: 'Thông tin cơ bản', icon: <Info className="w-4 h-4" /> },
  { id: 2, title: 'Brand Voice', icon: <Megaphone className="w-4 h-4" /> },
  { id: 3, title: 'Cài đặt kênh', icon: <Globe className="w-4 h-4" /> },
];

interface BrandFormStepperProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
  completedSteps?: number[];
}

export function BrandFormStepper({ currentStep, onStepClick, completedSteps = [] }: BrandFormStepperProps) {
  return (
    <div className="mb-6">
      {/* Progress bar */}
      <div className="flex items-center gap-1 mb-4">
        {BRAND_FORM_STEPS.map((step, i) => (
          <div
            key={step.id}
            className={cn(
              'flex-1 h-1.5 rounded-full transition-colors',
              currentStep >= step.id ? 'bg-primary' : 'bg-muted'
            )}
          />
        ))}
      </div>

      {/* Step labels */}
      <div className="hidden sm:flex items-center justify-between">
        {BRAND_FORM_STEPS.map((step) => {
          const isActive = currentStep === step.id;
          const isCompleted = completedSteps.includes(step.id) || currentStep > step.id;
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
                'flex items-center gap-2 text-xs transition-colors',
                isActive && 'text-primary font-medium',
                isCompleted && !isActive && 'text-muted-foreground',
                !isActive && !isCompleted && 'text-muted-foreground/50',
                isClickable && 'cursor-pointer hover:text-primary'
              )}
            >
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs transition-colors',
                  isActive && 'bg-primary text-primary-foreground',
                  isCompleted && !isActive && 'bg-primary/20 text-primary',
                  !isActive && !isCompleted && 'bg-muted text-muted-foreground'
                )}
              >
                {isCompleted && !isActive ? (
                  <Check className="w-3 h-3" />
                ) : (
                  step.id
                )}
              </div>
              <span className="hidden md:inline">{step.title}</span>
            </button>
          );
        })}
      </div>

      {/* Mobile: current step indicator */}
      <div className="sm:hidden flex items-center justify-center gap-2 text-sm">
        <span className="text-muted-foreground">Bước {currentStep}/3:</span>
        <span className="font-medium">{BRAND_FORM_STEPS[currentStep - 1]?.title}</span>
      </div>
    </div>
  );
}
