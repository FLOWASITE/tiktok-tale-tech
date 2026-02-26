import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Eye, Scale, CheckCircle, Heart, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  JourneyStage,
  JOURNEY_STAGES,
  JOURNEY_STAGE_CONFIG,
  EMOTIONAL_TONE_CONFIG,
} from '@/types/journeyStageMessaging';

interface InlineJourneySelectorProps {
  value?: JourneyStage;
  onValueChange: (value: JourneyStage | undefined) => void;
  disabled?: boolean;
}

const STAGE_ICONS: Record<JourneyStage, React.ComponentType<{ className?: string }>> = {
  awareness: Eye,
  consideration: Scale,
  decision: CheckCircle,
  loyalty: Heart,
};

export function InlineJourneySelector({
  value,
  onValueChange,
  disabled = false,
}: InlineJourneySelectorProps) {
  const selectedConfig = value ? JOURNEY_STAGE_CONFIG[value] : null;
  const defaultToneConfig = selectedConfig
    ? EMOTIONAL_TONE_CONFIG[selectedConfig.defaultTone]
    : null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
          Giai đoạn hành trình
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="w-3 h-3 text-muted-foreground/60 cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p className="text-xs">Chọn giai đoạn để AI điều chỉnh messaging phù hợp</p>
            </TooltipContent>
          </Tooltip>
        </Label>
        {value && (
          <button
            type="button"
            onClick={() => onValueChange(undefined)}
            className="text-[10px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-0.5"
            disabled={disabled}
          >
            <X className="w-3 h-3" />
            Bỏ chọn
          </button>
        )}
      </div>

      {/* Inline button group */}
      <div className="flex flex-wrap gap-1.5">
        {JOURNEY_STAGES.map((stage) => {
          const config = JOURNEY_STAGE_CONFIG[stage];
          const Icon = STAGE_ICONS[stage];
          const isSelected = value === stage;

          return (
            <Tooltip key={stage}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onValueChange(isSelected ? undefined : stage)}
                  disabled={disabled}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all",
                    isSelected
                      ? `${config.borderColor} ${config.bgColor} ${config.color}`
                      : 'border-border/50 text-muted-foreground hover:border-border hover:bg-muted/30',
                    disabled && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {config.label}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[220px]">
                <p className="text-xs font-medium mb-1">{config.label} ({config.labelEn})</p>
                <p className="text-xs text-muted-foreground">{config.description}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      {/* Compact selected info */}
      {value && selectedConfig && defaultToneConfig && (
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
            Tone: {defaultToneConfig.label}
          </Badge>
          <span>• CTA: {selectedConfig.ctaExamples[0]}</span>
        </div>
      )}
    </div>
  );
}
