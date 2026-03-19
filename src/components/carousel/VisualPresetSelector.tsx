import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { VisualPresetType, VISUAL_PRESET_OPTIONS } from '@/types/carousel';

interface VisualPresetSelectorProps {
  value: VisualPresetType;
  onChange: (value: VisualPresetType) => void;
  disabled?: boolean;
}

export function VisualPresetSelector({ value, onChange, disabled }: VisualPresetSelectorProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {VISUAL_PRESET_OPTIONS.map((option) => {
        const isSelected = value === option.value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => !disabled && onChange(option.value)}
            disabled={disabled}
            className={cn(
              "relative flex flex-col items-start gap-1 p-2.5 rounded-lg border-2 transition-all duration-300 text-left",
              "hover:scale-[1.02] active:scale-[0.98]",
              isSelected
                ? "border-primary bg-primary/10 ring-1 ring-primary/20"
                : "border-border/50 bg-muted/20 hover:border-primary/40",
              disabled && "opacity-50 cursor-not-allowed hover:scale-100"
            )}
          >
            {isSelected && (
              <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                <Check className="w-2.5 h-2.5 text-primary-foreground" />
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <span className="text-sm">{option.icon}</span>
              <span className={cn(
                "font-semibold text-xs",
                isSelected ? "text-foreground" : "text-muted-foreground"
              )}>
                {option.label}
              </span>
            </div>

            <span className="text-[10px] text-muted-foreground leading-tight pr-3">
              {option.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}
