import { Duration, DURATION_LABELS } from '@/types/script';
import { cn } from '@/lib/utils';
import { Zap, Film, Tv, Video, Check } from 'lucide-react';

interface DurationSelectorProps {
  value: Duration;
  onChange: (value: Duration) => void;
  disabled?: boolean;
}

const DURATION_CONFIG: Record<Duration, { icon: typeof Zap; description: string }> = {
  60: { icon: Zap, description: 'TikTok/Reels' },
  90: { icon: Film, description: 'Standard' },
  120: { icon: Tv, description: 'Extended' },
  180: { icon: Video, description: 'Long-form' },
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
              "w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300",
              isSelected 
                ? "bg-primary/10 text-primary" 
                : "bg-muted/50 text-muted-foreground"
            )}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="text-left">
              <span className={cn(
                "text-sm font-semibold tracking-tight block",
                isSelected ? "text-foreground" : "text-muted-foreground"
              )}>
                {DURATION_LABELS[duration]}
              </span>
              <span className="text-[10px] text-muted-foreground/70">
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
