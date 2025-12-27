import { Check, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MarketingFramework, MARKETING_FRAMEWORK_LABELS } from '@/types/topicDiscovery';

interface MarketingFrameworkSelectorProps {
  value?: MarketingFramework;
  onValueChange: (value: MarketingFramework | undefined) => void;
  suggestedFrameworks?: MarketingFramework[];
  disabled?: boolean;
  className?: string;
  variant?: 'inline' | 'dropdown';
}

export function MarketingFrameworkSelector({
  value,
  onValueChange,
  suggestedFrameworks,
  disabled,
  className,
  variant = 'inline',
}: MarketingFrameworkSelectorProps) {
  const selectedFramework = MARKETING_FRAMEWORK_LABELS.find(f => f.value === value);
  const displayFrameworks = suggestedFrameworks?.length 
    ? MARKETING_FRAMEWORK_LABELS.filter(f => suggestedFrameworks.includes(f.value))
    : MARKETING_FRAMEWORK_LABELS;

  if (variant === 'dropdown') {
    return (
      <TooltipProvider delayDuration={150}>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={disabled}
              className={cn('gap-2', className)}
            >
              {selectedFramework ? (
                <>
                  <span className="font-semibold">{selectedFramework.value}</span>
                  <span className="text-muted-foreground">-</span>
                  <span className="text-muted-foreground text-xs">
                    {selectedFramework.fullName}
                  </span>
                </>
              ) : (
                <>
                  <Info className="w-4 h-4" />
                  Chọn Framework
                </>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-2" align="start">
            <div className="space-y-1">
              {MARKETING_FRAMEWORK_LABELS.map((fw) => (
                <button
                  key={fw.value}
                  onClick={() => onValueChange(value === fw.value ? undefined : fw.value)}
                  className={cn(
                    'w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors',
                    value === fw.value
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-muted'
                  )}
                >
                  <Badge variant={value === fw.value ? 'default' : 'outline'} className="mt-0.5">
                    {fw.value}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{fw.fullName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {fw.description}
                    </p>
                    <div className="mt-2 space-y-0.5">
                      {fw.structure.map((step, i) => (
                        <p key={i} className="text-xs text-muted-foreground">{step}</p>
                      ))}
                    </div>
                  </div>
                  {value === fw.value && (
                    <Check className="w-4 h-4 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </TooltipProvider>
    );
  }

  // Inline variant
  return (
    <TooltipProvider delayDuration={150}>
      <div className={cn('flex flex-wrap gap-2', className)}>
        {displayFrameworks.map((fw) => (
          <Tooltip key={fw.value}>
            <TooltipTrigger asChild>
              <Badge
                variant={value === fw.value ? 'default' : 'outline'}
                className={cn(
                  'cursor-pointer transition-all px-3 py-1',
                  value === fw.value && 'ring-2 ring-primary/20',
                  disabled && 'opacity-50 cursor-not-allowed'
                )}
                onClick={() => !disabled && onValueChange(value === fw.value ? undefined : fw.value)}
              >
                {fw.value}
                {value === fw.value && <Check className="w-3 h-3 ml-1" />}
              </Badge>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs z-[100]" side="bottom">
              <p className="font-semibold text-sm mb-1">{fw.fullName}</p>
              <p className="text-xs text-muted-foreground mb-2">{fw.description}</p>
              <div className="space-y-0.5 border-t pt-2 mt-2">
                <p className="text-xs font-medium mb-1">Cấu trúc:</p>
                {fw.structure.map((step, i) => (
                  <p key={i} className="text-xs text-muted-foreground">• {step}</p>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
