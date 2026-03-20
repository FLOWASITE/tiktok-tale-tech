import { Duration, DURATION_LABELS } from '@/types/script';
import { cn } from '@/lib/utils';
import { Zap, Film, Tv, Video } from 'lucide-react';

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
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
              "relative flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-200",
              "hover:border-primary/40 hover:bg-accent/30",
              isSelected
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border/50 bg-card/60",
              disabled && "opacity-50 cursor-not-allowed pointer-events-none"
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
              isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
              <Icon className="w-4 h-4" />
            </div>
            <span className={cn(
              "text-sm font-semibold",
              isSelected ? "text-foreground" : "text-muted-foreground"
            )}>
              {DURATION_LABELS[duration]}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {config.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}
