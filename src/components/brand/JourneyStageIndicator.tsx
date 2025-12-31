import { Eye, Scale, CheckCircle, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { JourneyStage, JOURNEY_STAGE_CONFIG, JOURNEY_STAGES } from '@/types/journeyStageMessaging';

interface JourneyStageIndicatorProps {
  stagesWithContent: JourneyStage[];
  onClick?: () => void;
  className?: string;
}

const STAGE_ICONS: Record<JourneyStage, React.ComponentType<{ className?: string }>> = {
  awareness: Eye,
  consideration: Scale,
  decision: CheckCircle,
  loyalty: Heart,
};

export function JourneyStageIndicator({
  stagesWithContent,
  onClick,
  className,
}: JourneyStageIndicatorProps) {
  const completedCount = stagesWithContent.length;
  const totalCount = JOURNEY_STAGES.length;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onClick}
            className={cn(
              "flex items-center gap-0.5 p-1 rounded-md hover:bg-muted/50 transition-colors cursor-pointer",
              className
            )}
          >
            {JOURNEY_STAGES.map((stage) => {
              const Icon = STAGE_ICONS[stage];
              const hasContent = stagesWithContent.includes(stage);
              const config = JOURNEY_STAGE_CONFIG[stage];

              return (
                <span
                  key={stage}
                  className={cn(
                    "w-4 h-4 flex items-center justify-center rounded-full transition-colors",
                    hasContent ? config.bgColor : "bg-muted"
                  )}
                >
                  <Icon
                    className={cn(
                      "w-2.5 h-2.5",
                      hasContent ? config.color : "text-muted-foreground/50"
                    )}
                  />
                </span>
              );
            })}
            <span className="text-[10px] text-muted-foreground ml-1">
              {completedCount}/{totalCount}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <p className="font-medium mb-1">Journey Stage Messaging</p>
          <div className="space-y-0.5">
            {JOURNEY_STAGES.map((stage) => {
              const hasContent = stagesWithContent.includes(stage);
              const config = JOURNEY_STAGE_CONFIG[stage];
              return (
                <div key={stage} className="flex items-center gap-1.5">
                  <span className={cn(
                    "w-2 h-2 rounded-full",
                    hasContent ? config.color : "bg-muted"
                  )} />
                  <span className={hasContent ? "text-foreground" : "text-muted-foreground"}>
                    {config.label}
                  </span>
                  {hasContent && <span className="text-emerald-500">✓</span>}
                </div>
              );
            })}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
