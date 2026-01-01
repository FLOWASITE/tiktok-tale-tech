import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Eye, 
  Scale, 
  CheckCircle, 
  Heart,
  Info,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { 
  JourneyStage, 
  JOURNEY_STAGES, 
  JOURNEY_STAGE_CONFIG,
  EMOTIONAL_TONE_CONFIG,
} from '@/types/journeyStageMessaging';

interface JourneyStageSelectorProps {
  value?: JourneyStage;
  onValueChange: (value: JourneyStage | undefined) => void;
  disabled?: boolean;
  showEmotionalTone?: boolean;
}

const STAGE_ICONS: Record<JourneyStage, React.ComponentType<{ className?: string }>> = {
  awareness: Eye,
  consideration: Scale,
  decision: CheckCircle,
  loyalty: Heart,
};

export function JourneyStageSelector({
  value,
  onValueChange,
  disabled = false,
  showEmotionalTone = true,
}: JourneyStageSelectorProps) {
  const selectedConfig = value ? JOURNEY_STAGE_CONFIG[value] : null;
  const defaultToneConfig = selectedConfig 
    ? EMOTIONAL_TONE_CONFIG[selectedConfig.defaultTone] 
    : null;

  return (
    <TooltipProvider>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-foreground font-semibold text-sm flex items-center gap-2">
            Giai đoạn hành trình khách hàng
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="text-xs">
                  Chọn giai đoạn để AI điều chỉnh messaging phù hợp với vị trí của khách hàng trong phễu mua hàng
                </p>
              </TooltipContent>
            </Tooltip>
          </Label>
          {value && (
            <button
              type="button"
              onClick={() => onValueChange(undefined)}
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
              disabled={disabled}
            >
              Bỏ chọn
            </button>
          )}
        </div>

        <RadioGroup
          value={value || ''}
          onValueChange={(v) => onValueChange(v as JourneyStage)}
          disabled={disabled}
          className="grid grid-cols-2 gap-2"
        >
          {JOURNEY_STAGES.map((stage) => {
            const config = JOURNEY_STAGE_CONFIG[stage];
            const Icon = STAGE_ICONS[stage];
            const isSelected = value === stage;

            return (
              <Tooltip key={stage}>
                <TooltipTrigger asChild>
                  <Label
                    htmlFor={`journey-${stage}`}
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all",
                      isSelected
                        ? `${config.borderColor} ${config.bgColor}`
                        : 'border-border/50 hover:border-border bg-muted/30',
                      disabled && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <RadioGroupItem
                      value={stage}
                      id={`journey-${stage}`}
                      className="sr-only"
                    />
                    <div className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-lg",
                      isSelected ? config.bgColor : 'bg-muted/50'
                    )}>
                      <Icon className={cn(
                        "w-4 h-4",
                        isSelected ? config.color : 'text-muted-foreground'
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm font-medium truncate",
                        isSelected ? 'text-foreground' : 'text-muted-foreground'
                      )}>
                        {config.label}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {config.labelEn}
                      </p>
                    </div>
                  </Label>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[220px]">
                  <p className="text-xs font-medium mb-1">{config.label}</p>
                  <p className="text-xs text-muted-foreground">{config.description}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </RadioGroup>

        {/* Selected Stage Details */}
        {value && selectedConfig && showEmotionalTone && (
          <Card className={cn("border", selectedConfig.borderColor, selectedConfig.bgColor)}>
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Giai đoạn:</span>
                <Badge variant="outline" className={cn("text-xs", selectedConfig.color)}>
                  {selectedConfig.label}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedConfig.description}
              </p>
              {defaultToneConfig && (
                <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                  <span className="text-xs text-muted-foreground">Tone mặc định:</span>
                  <Badge variant="secondary" className="text-xs">
                    {defaultToneConfig.label}
                  </Badge>
                </div>
              )}
              <div className="pt-1">
                <span className="text-xs text-muted-foreground">CTA gợi ý: </span>
                <span className="text-xs font-medium">
                  {selectedConfig.ctaExamples.slice(0, 2).join(', ')}
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
}
