import { Duration, DURATION_LABELS } from '@/types/script';
import { cn } from '@/lib/utils';
import { Zap, Film, Tv, Video } from 'lucide-react';

interface DurationSelectorProps {
  value: Duration;
  onChange: (value: Duration) => void;
  disabled?: boolean;
}

const DURATION_CONFIG: Record<Duration, { icon: typeof Zap; description: string; color: string }> = {
  60: { icon: Zap, description: 'TikTok/Reels', color: 'from-pink-500 to-rose-500' },
  90: { icon: Film, description: 'Standard', color: 'from-violet-500 to-purple-500' },
  120: { icon: Tv, description: 'Extended', color: 'from-blue-500 to-cyan-500' },
  180: { icon: Video, description: 'Long-form', color: 'from-emerald-500 to-green-500' },
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
              "relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-300",
              "hover:scale-[1.02] active:scale-[0.98]",
              isSelected
                ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                : "border-border/50 bg-muted/30 hover:border-primary/30 hover:bg-muted/50",
              disabled && "opacity-50 cursor-not-allowed pointer-events-none"
            )}
          >
            {/* Gradient background on selected */}
            {isSelected && (
              <div className={cn(
                "absolute inset-0 rounded-xl opacity-10 bg-gradient-to-br",
                config.color
              )} />
            )}
            
            {/* Icon */}
            <div className={cn(
              "relative w-8 h-8 rounded-lg flex items-center justify-center",
              isSelected ? `bg-gradient-to-br ${config.color} text-white` : "bg-muted text-muted-foreground"
            )}>
              <Icon className="w-4 h-4" />
            </div>
            
            {/* Label */}
            <span className={cn(
              "text-sm font-semibold",
              isSelected ? "text-foreground" : "text-muted-foreground"
            )}>
              {DURATION_LABELS[duration]}
            </span>
            
            {/* Description */}
            <span className="text-[10px] text-muted-foreground">
              {config.description}
            </span>
            
            {/* Selected indicator */}
            {isSelected && (
              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                <svg className="w-2.5 h-2.5 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
