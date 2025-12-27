import { useState } from 'react';
import { Package, Rocket, Gift, Target, Star, TrendingUp, ChevronDown, Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ContentPurpose, MarketingFramework, CONTENT_PURPOSE_LABELS, MARKETING_FRAMEWORK_LABELS } from '@/types/topicDiscovery';

interface ContentPurposeSelectorProps {
  value?: ContentPurpose;
  onValueChange: (value: ContentPurpose | undefined) => void;
  selectedFramework?: MarketingFramework;
  onFrameworkChange?: (framework: MarketingFramework | undefined) => void;
  disabled?: boolean;
  className?: string;
}

const purposeIcons: Record<ContentPurpose, React.ReactNode> = {
  service_intro: <Package className="w-4 h-4" />,
  product_launch: <Rocket className="w-4 h-4" />,
  promotion: <Gift className="w-4 h-4" />,
  lead_generation: <Target className="w-4 h-4" />,
  testimonial_request: <Star className="w-4 h-4" />,
  upsell: <TrendingUp className="w-4 h-4" />,
};

const purposeColors: Record<ContentPurpose, string> = {
  service_intro: 'text-blue-500 bg-blue-500/10',
  product_launch: 'text-purple-500 bg-purple-500/10',
  promotion: 'text-orange-500 bg-orange-500/10',
  lead_generation: 'text-emerald-500 bg-emerald-500/10',
  testimonial_request: 'text-amber-500 bg-amber-500/10',
  upsell: 'text-cyan-500 bg-cyan-500/10',
};

export function ContentPurposeSelector({
  value,
  onValueChange,
  selectedFramework,
  onFrameworkChange,
  disabled,
  className,
}: ContentPurposeSelectorProps) {
  const [open, setOpen] = useState(false);
  const selectedPurpose = CONTENT_PURPOSE_LABELS.find(p => p.value === value);
  const suggestedFrameworks = selectedPurpose?.suggestedFrameworks || [];

  const handleSelect = (purpose: ContentPurpose) => {
    onValueChange(purpose);
    // Auto-suggest first framework
    if (onFrameworkChange) {
      const purposeLabel = CONTENT_PURPOSE_LABELS.find(p => p.value === purpose);
      if (purposeLabel?.suggestedFrameworks?.length) {
        onFrameworkChange(purposeLabel.suggestedFrameworks[0]);
      }
    }
    setOpen(false);
  };

  const handleClear = () => {
    onValueChange(undefined);
    if (onFrameworkChange) {
      onFrameworkChange(undefined);
    }
    setOpen(false);
  };

  return (
    <TooltipProvider>
      <div className={cn('space-y-3', className)}>
        {/* Purpose Selector */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              disabled={disabled}
              className={cn(
                'w-full justify-between h-auto min-h-10 py-2',
                value && purposeColors[value]
              )}
            >
              {selectedPurpose ? (
                <div className="flex items-center gap-2">
                  {purposeIcons[value!]}
                  <span className="font-medium">{selectedPurpose.label}</span>
                </div>
              ) : (
                <span className="text-muted-foreground">Chọn mục đích bán hàng...</span>
              )}
              <ChevronDown className="w-4 h-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-2" align="start">
            <div className="space-y-1">
              {CONTENT_PURPOSE_LABELS.map((purpose) => (
                <Tooltip key={purpose.value}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => handleSelect(purpose.value)}
                      className={cn(
                        'w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-colors',
                        value === purpose.value
                          ? purposeColors[purpose.value]
                          : 'hover:bg-muted'
                      )}
                    >
                      <div className={cn('p-1.5 rounded-md', purposeColors[purpose.value])}>
                        {purposeIcons[purpose.value]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{purpose.label}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {purpose.description}
                        </p>
                      </div>
                      {value === purpose.value && (
                        <Check className="w-4 h-4 shrink-0 text-primary" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs">
                    <p className="font-medium mb-1">{purpose.description}</p>
                    <p className="text-xs text-muted-foreground">
                      Frameworks gợi ý: {purpose.suggestedFrameworks.join(', ')}
                    </p>
                  </TooltipContent>
                </Tooltip>
              ))}
              
              {value && (
                <>
                  <div className="border-t my-2" />
                  <button
                    onClick={handleClear}
                    className="w-full text-sm text-muted-foreground hover:text-foreground p-2 text-center"
                  >
                    Bỏ chọn
                  </button>
                </>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Framework Selector - Show when purpose is selected */}
        {value && suggestedFrameworks.length > 0 && onFrameworkChange && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">
                Marketing Framework gợi ý
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestedFrameworks.map((fw) => {
                const frameworkInfo = MARKETING_FRAMEWORK_LABELS.find(f => f.value === fw);
                return (
                  <Tooltip key={fw}>
                    <TooltipTrigger asChild>
                      <Badge
                        variant={selectedFramework === fw ? 'default' : 'outline'}
                        className={cn(
                          'cursor-pointer transition-all',
                          selectedFramework === fw && 'ring-2 ring-primary/20'
                        )}
                        onClick={() => onFrameworkChange(selectedFramework === fw ? undefined : fw)}
                      >
                        {fw}
                        {selectedFramework === fw && <Check className="w-3 h-3 ml-1" />}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs z-[100]">
                      <p className="font-semibold text-sm mb-1">{frameworkInfo?.fullName}</p>
                      <p className="text-xs text-muted-foreground mb-2">{frameworkInfo?.description}</p>
                      <div className="space-y-0.5 border-t pt-2 mt-2">
                        <p className="text-xs font-medium mb-1">Cấu trúc:</p>
                        {frameworkInfo?.structure.map((step, i) => (
                          <p key={i} className="text-xs text-muted-foreground">• {step}</p>
                        ))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
