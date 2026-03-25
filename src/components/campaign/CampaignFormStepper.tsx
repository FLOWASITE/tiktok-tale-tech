import { Check, Target, MessageSquare, DollarSign, Layers, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

interface Step {
  id: number;
  title: string;
  shortTitle: string;
  icon: React.ElementType;
}

const CAMPAIGN_FORM_STEPS: Step[] = [
  { id: 1, title: 'Thông tin cơ bản', shortTitle: 'Cơ bản', icon: Target },
  { id: 2, title: 'Mục tiêu nội dung', shortTitle: 'Mục tiêu', icon: MessageSquare },
  { id: 3, title: 'KPIs & Ngân sách', shortTitle: 'KPIs', icon: DollarSign },
  { id: 4, title: 'Kênh phân phối', shortTitle: 'Kênh', icon: Layers },
  { id: 5, title: 'Milestones', shortTitle: 'Milestones', icon: Flag },
];

interface CampaignFormStepperProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
  completedSteps?: number[];
}

export function CampaignFormStepper({
  currentStep,
  onStepClick,
  completedSteps = [],
}: CampaignFormStepperProps) {
  const progress = ((currentStep - 1) / (CAMPAIGN_FORM_STEPS.length - 1)) * 100;

  const isStepComplete = (stepId: number) => completedSteps.includes(stepId) || stepId < currentStep;
  const canClickStep = (stepId: number) => isStepComplete(stepId) || stepId <= currentStep;

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <Progress value={progress} className="h-1.5" />

      {/* Desktop Steps */}
      <div className="hidden sm:flex items-center justify-between">
        {CAMPAIGN_FORM_STEPS.map((step, index) => {
          const Icon = step.icon;
          const isComplete = isStepComplete(step.id);
          const isActive = currentStep === step.id;
          const canClick = canClickStep(step.id) && onStepClick;

          return (
            <div key={step.id} className="flex items-center">
              <button
                type="button"
                onClick={() => canClick && onStepClick(step.id)}
                disabled={!canClick}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg transition-all',
                  canClick && 'cursor-pointer hover:bg-muted',
                  !canClick && 'cursor-default',
                  isActive && 'bg-primary/10'
                )}
              >
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all',
                    isComplete && !isActive && 'bg-primary text-primary-foreground',
                    isActive && 'bg-primary text-primary-foreground ring-2 ring-primary/30',
                    !isComplete && !isActive && 'bg-muted text-muted-foreground'
                  )}
                >
                  {isComplete && !isActive ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                <span
                  className={cn(
                    'text-sm font-medium',
                    isActive && 'text-primary',
                    !isActive && !isComplete && 'text-muted-foreground',
                    isComplete && !isActive && 'text-foreground'
                  )}
                >
                  {step.title}
                </span>
              </button>

              {/* Connector */}
              {index < CAMPAIGN_FORM_STEPS.length - 1 && (
                <div
                  className={cn(
                    'w-8 h-0.5 mx-1',
                    isComplete ? 'bg-primary' : 'bg-border'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile Steps */}
      <div className="flex sm:hidden items-center justify-between">
        {CAMPAIGN_FORM_STEPS.map((step) => {
          const Icon = step.icon;
          const isComplete = isStepComplete(step.id);
          const isActive = currentStep === step.id;
          const canClick = canClickStep(step.id) && onStepClick;

          return (
            <button
              key={step.id}
              type="button"
              onClick={() => canClick && onStepClick(step.id)}
              disabled={!canClick}
              className={cn(
                'flex flex-col items-center gap-1 p-2 rounded-lg transition-all',
                canClick && 'cursor-pointer',
                !canClick && 'cursor-default opacity-50'
              )}
            >
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all',
                  isComplete && !isActive && 'bg-primary text-primary-foreground',
                  isActive && 'bg-primary text-primary-foreground ring-2 ring-primary/30',
                  !isComplete && !isActive && 'bg-muted text-muted-foreground'
                )}
              >
                {isComplete && !isActive ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>
              <span
                className={cn(
                  'text-xs',
                  isActive && 'text-primary font-medium',
                  !isActive && 'text-muted-foreground'
                )}
              >
                {step.shortTitle}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { CAMPAIGN_FORM_STEPS };
