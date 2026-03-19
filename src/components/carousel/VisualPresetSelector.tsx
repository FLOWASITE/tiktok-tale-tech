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

/** Mini color/font preview data per preset */
const PRESET_PREVIEW: Record<VisualPresetType, { colors: string[]; font: string }> = {
  minimalist: { colors: ['#1a1a1a', '#ffffff', '#6366f1'], font: 'Inter' },
  flat_design: { colors: ['#1e293b', '#f8fafc', '#f59e0b'], font: 'Montserrat' },
  gradient: { colors: ['#0f0f23', '#667eea', '#764ba2'], font: 'Poppins' },
  geometric: { colors: ['#1b2a4a', '#f5f0e8', '#c8a961'], font: 'Playfair' },
  illustration: { colors: ['#2d2d2d', '#fdf6ec', '#e07a5f'], font: 'Nunito' },
  product_only: { colors: ['#111111', '#f5f5f5', '#e5e5e5'], font: 'Helvetica' },
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
