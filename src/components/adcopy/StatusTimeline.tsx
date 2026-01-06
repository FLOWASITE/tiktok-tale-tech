import { memo } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

type AdStatus = 'draft' | 'review' | 'approved' | 'published';

interface StatusTimelineProps {
  currentStatus: AdStatus | string | null;
  compact?: boolean;
}

const STATUS_STEPS: { key: AdStatus; label: string; color: string }[] = [
  { key: 'draft', label: 'Nháp', color: 'bg-muted-foreground' },
  { key: 'review', label: 'Đang duyệt', color: 'bg-yellow-500' },
  { key: 'approved', label: 'Đã duyệt', color: 'bg-blue-500' },
  { key: 'published', label: 'Đã xuất bản', color: 'bg-green-500' },
];

const getStatusIndex = (status: string | null): number => {
  const idx = STATUS_STEPS.findIndex(s => s.key === status);
  return idx >= 0 ? idx : 0;
};

export const StatusTimeline = memo(function StatusTimeline({ 
  currentStatus, 
  compact = false 
}: StatusTimelineProps) {
  const currentIndex = getStatusIndex(currentStatus);

  if (compact) {
    // Compact dot version
    return (
      <div className="flex items-center gap-1">
        {STATUS_STEPS.map((step, idx) => {
          const isCompleted = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          
          return (
            <Tooltip key={step.key}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "w-2 h-2 rounded-full transition-all duration-300",
                    isCompleted && "bg-green-500",
                    isCurrent && step.color,
                    !isCompleted && !isCurrent && "bg-muted-foreground/30"
                  )}
                />
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {step.label}
                {isCurrent && " (hiện tại)"}
                {isCompleted && " ✓"}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    );
  }

  // Full timeline version
  return (
    <div className="flex items-center gap-1 w-full">
      {STATUS_STEPS.map((step, idx) => {
        const isCompleted = idx < currentIndex;
        const isCurrent = idx === currentIndex;
        const isLast = idx === STATUS_STEPS.length - 1;

        return (
          <div key={step.key} className="flex items-center flex-1">
            {/* Step dot */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "relative flex items-center justify-center shrink-0 transition-all duration-300",
                    "w-5 h-5 rounded-full border-2",
                    isCompleted && "bg-green-500 border-green-500",
                    isCurrent && `${step.color} border-current`,
                    !isCompleted && !isCurrent && "bg-background border-muted-foreground/30"
                  )}
                >
                  {isCompleted && (
                    <Check className="h-3 w-3 text-white" />
                  )}
                  {isCurrent && (
                    <div className={cn("w-2 h-2 rounded-full bg-white")} />
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {step.label}
              </TooltipContent>
            </Tooltip>

            {/* Connector line */}
            {!isLast && (
              <div
                className={cn(
                  "flex-1 h-0.5 mx-1 transition-all duration-300",
                  idx < currentIndex ? "bg-green-500" : "bg-muted-foreground/20"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
});
