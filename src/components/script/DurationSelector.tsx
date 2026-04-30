import { Duration, DURATION_LABELS } from '@/types/script';
import { cn } from '@/lib/utils';
import { Zap, Film, Tv, Video, Check, Sparkles, Clock, Megaphone } from 'lucide-react';

interface DurationSelectorProps {
  value: Duration;
  onChange: (value: Duration) => void;
  disabled?: boolean;
}

const DURATION_CONFIG: Record<Duration, { icon: typeof Zap; description: string }> = {
  15: { icon: Sparkles, description: 'Hook ngắn' },
  30: { icon: Megaphone, description: 'Quảng cáo' },
  60: { icon: Zap, description: 'Standard' },
  90: { icon: Film, description: 'Long-form' },
  120: { icon: Tv, description: 'Extended' },
  140: { icon: Tv, description: 'X Premium' },
  180: { icon: Video, description: 'Mid-form' },
  300: { icon: Tv, description: 'Threads dài' },
  600: { icon: Clock, description: 'YouTube dài' },
};

export function DurationSelector({ value, onChange, disabled }: DurationSelectorProps) {
  const durations = Object.keys(DURATION_CONFIG).map(Number) as Duration[];

  return (
    <div className="grid grid-cols-2 gap-2">
      {durations.map((duration) => {
        const config = DURATION_CONFIG[duration];
        const Icon = config.icon;
        const isSelected = value === duration;

        return (
          <button
            key={duration}
            type="button"
            onClick={() => onChange(duration)}
            disabled={disabled}
            className={cn(
              "relative flex items-center gap-3 p-3 rounded-xl border transition-all duration-300",
              "hover:shadow-sm hover:-translate-y-px active:translate-y-0",
              isSelected
                ? "border-primary/30 bg-primary/[0.04] shadow-sm shadow-primary/5"
                : "border-border/30 bg-background hover:border-border/50 hover:bg-muted/30",
              disabled && "opacity-50 cursor-not-allowed pointer-events-none"
            )}
          >
            <div className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 shrink-0",
              isSelected
                ? "bg-primary/10 text-primary"
                : "bg-muted/50 text-muted-foreground"
            )}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="text-left min-w-0">
              <span className={cn(
                "text-sm font-semibold tracking-tight block truncate",
                isSelected ? "text-foreground" : "text-muted-foreground"
              )}>
                {DURATION_LABELS[duration]}
              </span>
              <span className="text-[10px] text-muted-foreground/70 block truncate">
                {config.description}
              </span>
            </div>
            {isSelected && (
              <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary/15 flex items-center justify-center">
                <Check className="w-2.5 h-2.5 text-primary" />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
