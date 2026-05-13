import { cn } from '@/lib/utils';
import { Check, Minus, BarChart3, Blend, Hexagon, Paintbrush, Focus, type LucideIcon } from 'lucide-react';
import { VisualPresetType, VISUAL_PRESET_OPTIONS } from '@/types/carousel';

const ICON_MAP: Record<string, LucideIcon> = {
  Minus,
  BarChart3,
  Blend,
  Hexagon,
  Paintbrush,
  Focus,
};

interface VisualPresetSelectorProps {
  value: VisualPresetType;
  onChange: (value: VisualPresetType) => void;
  disabled?: boolean;
}

/** Mini color/font preview data per preset — synced with PRESET_DNA in edge function */
const PRESET_PREVIEW: Record<VisualPresetType, { colors: string[]; font: string }> = {
  minimalist:    { colors: ['#F8F6F2', '#1A1A1A', '#8A8A87'], font: 'Fraunces' },
  flat_design:   { colors: ['#0A0A0A', '#FAFAF7', '#FF5722'], font: 'Archivo Black' },
  gradient:      { colors: ['#0F0F23', '#667EEA', '#F0ABFC'], font: 'Migra' },
  geometric:     { colors: ['#0B1F3A', '#F4EFE6', '#C9A961'], font: 'Domaine' },
  illustration:  { colors: ['#FDF6EC', '#E07A5F', '#83A275'], font: 'Recoleta' },
  product_only:  { colors: ['#F2EFE9', '#1A1A1A', '#C9C4BA'], font: 'Tiempos' },
};

export function VisualPresetSelector({ value, onChange, disabled }: VisualPresetSelectorProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {VISUAL_PRESET_OPTIONS.map((option) => {
        const isSelected = value === option.value;
        const preview = PRESET_PREVIEW[option.value];
        const IconComponent = ICON_MAP[option.icon];

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
              {IconComponent && (
                <IconComponent size={14} className={cn(
                  isSelected ? "text-primary" : "text-muted-foreground"
                )} />
              )}
              <span className={cn(
                "font-semibold text-xs",
                isSelected ? "text-foreground" : "text-muted-foreground"
              )}>
                {option.label}
              </span>
            </div>

            {/* Mini preview strip: color dots + font */}
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="flex items-center gap-0.5">
                {preview.colors.map((color, i) => (
                  <span
                    key={i}
                    className="w-3 h-3 rounded-full border border-border/40 shrink-0"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <span className="text-[9px] text-muted-foreground truncate">
                {preview.font}
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
