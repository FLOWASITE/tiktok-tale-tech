import { cn } from '@/lib/utils';
import { Check, Layers, GraduationCap, ListOrdered, Images, type LucideIcon } from 'lucide-react';
import { CarouselStyleType, CAROUSEL_STYLE_OPTIONS } from '@/types/carousel';

const ICON_MAP: Record<string, LucideIcon> = {
  Layers,
  GraduationCap,
  ListOrdered,
  Images,
};

interface CarouselStyleSelectorProps {
  value: CarouselStyleType;
  onChange: (value: CarouselStyleType) => void;
  disabled?: boolean;
}

export function CarouselStyleSelector({ value, onChange, disabled }: CarouselStyleSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {CAROUSEL_STYLE_OPTIONS.map((option) => {
        const isSelected = value === option.value;
        const IconComponent = ICON_MAP[option.icon];

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => !disabled && onChange(option.value)}
            disabled={disabled}
            className={cn(
              "relative flex flex-col items-start gap-1.5 p-3 rounded-xl border-2 transition-all duration-300 text-left",
              "bg-gradient-to-br hover:scale-[1.02] active:scale-[0.98]",
              isSelected
                ? "from-primary/20 to-primary/5 border-primary ring-2 ring-primary/20"
                : "from-muted/30 to-muted/10 border-border/50 hover:border-primary/40",
              disabled && "opacity-50 cursor-not-allowed hover:scale-100"
            )}
          >
            {isSelected && (
              <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center animate-scale-in">
                <Check className="w-3 h-3 text-primary-foreground" />
              </div>
            )}

            <div className="flex items-center gap-2">
              {IconComponent && (
                <IconComponent size={18} className={cn(
                  isSelected ? "text-primary" : "text-muted-foreground"
                )} />
              )}
              <span className={cn(
                "font-semibold text-sm",
                isSelected ? "text-foreground" : "text-muted-foreground"
              )}>
                {option.label}
              </span>
            </div>

            <span className="text-xs text-muted-foreground leading-snug pr-4">
              {option.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}
