import { cn } from '@/lib/utils';
import { Check, Facebook } from 'lucide-react';
import { Platform, PLATFORM_OPTIONS } from '@/types/carousel';

interface PlatformSelectorProps {
  value: Platform;
  onChange: (value: Platform) => void;
  disabled?: boolean;
}

const platformIcons: Record<Platform, React.ComponentType<{ className?: string }>> = {
  facebook: Facebook,
  tiktok: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
    </svg>
  ),
};

const platformColors: Record<Platform, string> = {
  facebook: 'from-blue-500/20 to-blue-600/10 border-blue-500/30 hover:border-blue-500/60',
  tiktok: 'from-pink-500/20 to-purple-600/10 border-pink-500/30 hover:border-pink-500/60',
};

const platformActiveColors: Record<Platform, string> = {
  facebook: 'from-blue-500/30 to-blue-600/20 border-blue-500 ring-2 ring-blue-500/20',
  tiktok: 'from-pink-500/30 to-purple-600/20 border-pink-500 ring-2 ring-pink-500/20',
};

export function PlatformSelector({ value, onChange, disabled }: PlatformSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {PLATFORM_OPTIONS.map((option) => {
        const Icon = platformIcons[option.value];
        const isSelected = value === option.value;
        
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => !disabled && onChange(option.value)}
            disabled={disabled}
            className={cn(
              "relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-300",
              "bg-gradient-to-br hover:scale-[1.02] active:scale-[0.98]",
              isSelected 
                ? platformActiveColors[option.value]
                : platformColors[option.value],
              disabled && "opacity-50 cursor-not-allowed hover:scale-100"
            )}
          >
            {/* Selected indicator */}
            {isSelected && (
              <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center animate-scale-in">
                <Check className="w-3 h-3 text-primary-foreground" />
              </div>
            )}
            
            <Icon className={cn(
              "w-6 h-6 transition-transform duration-300",
              isSelected && "scale-110"
            )} />
            
            <span className={cn(
              "font-medium text-sm",
              isSelected ? "text-foreground" : "text-muted-foreground"
            )}>
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
