import { cn } from '@/lib/utils';
import { Wand2, Mic, Clapperboard, LucideIcon } from 'lucide-react';
import { ScriptPurpose, SCRIPT_PURPOSE_CONFIG } from '@/types/script';

interface ScriptPurposeSelectorProps {
  value: ScriptPurpose;
  onChange: (value: ScriptPurpose) => void;
  disabled?: boolean;
  compact?: boolean;
}

const ICON_MAP: Record<ScriptPurpose, LucideIcon> = {
  ai_video: Wand2,
  teleprompter: Mic,
  production: Clapperboard,
};

const ICON_GRADIENT: Record<ScriptPurpose, string> = {
  ai_video: 'from-violet-500/20 to-purple-500/10',
  teleprompter: 'from-amber-500/20 to-orange-500/10',
  production: 'from-sky-500/20 to-blue-500/10',
};

const ICON_COLOR: Record<ScriptPurpose, string> = {
  ai_video: 'text-violet-400',
  teleprompter: 'text-amber-400',
  production: 'text-sky-400',
};

export function ScriptPurposeSelector({ value, onChange, disabled, compact }: ScriptPurposeSelectorProps) {
  const purposes = Object.entries(SCRIPT_PURPOSE_CONFIG) as [ScriptPurpose, typeof SCRIPT_PURPOSE_CONFIG[ScriptPurpose]][];

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {purposes.map(([key, config]) => {
          const Icon = ICON_MAP[key];
          const isSelected = value === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => !disabled && onChange(key)}
              disabled={disabled}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full text-xs font-medium transition-all duration-200 border px-2.5 py-1",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isSelected
                  ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                  : "bg-card/80 text-muted-foreground border-border/60 hover:border-primary/40 hover:text-foreground hover:bg-accent/50",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <Icon className="w-3 h-3" />
              <span>{config.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      {purposes.map(([key, config]) => {
        const Icon = ICON_MAP[key];
        const isSelected = value === key;

        return (
          <button
            key={key}
            type="button"
            onClick={() => !disabled && onChange(key)}
            disabled={disabled}
            className={cn(
              "group relative flex flex-col items-center text-center gap-2.5 p-5 rounded-2xl border transition-all duration-300",
              "backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isSelected
                ? "bg-card border-primary/50 shadow-lg shadow-primary/10"
                : "bg-card/60 border-border/30 hover:border-border/60 hover:bg-card/80 hover:shadow-md",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {/* Icon container */}
            <div className={cn(
              "w-11 h-11 rounded-xl flex items-center justify-center bg-gradient-to-br transition-transform duration-300",
              ICON_GRADIENT[key],
              isSelected && "scale-110"
            )}>
              <Icon className={cn(
                "w-5 h-5 transition-colors duration-200",
                isSelected ? ICON_COLOR[key] : "text-muted-foreground"
              )} />
            </div>

            {/* Label */}
            <span className={cn(
              "text-sm font-semibold tracking-tight transition-colors duration-200",
              isSelected ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
            )}>
              {config.label}
            </span>

            {/* Subtitle */}
            <span className="text-[11px] leading-tight text-muted-foreground/70 -mt-1">
              {config.subtitle}
            </span>

            {/* Selected indicator */}
            {isSelected && (
              <div className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary" />
            )}
          </button>
        );
      })}
    </div>
  );
}
