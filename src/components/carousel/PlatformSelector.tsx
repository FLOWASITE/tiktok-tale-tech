import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { Platform, PLATFORM_OPTIONS } from '@/types/carousel';
import { FacebookIcon, InstagramIcon, LinkedInIcon, TikTokIcon } from '@/components/icons/SocialIcons';

interface PlatformSelectorProps {
  value: Platform;
  onChange: (value: Platform) => void;
  disabled?: boolean;
}

const platformIcons: Record<Platform, React.ComponentType<{ className?: string }>> = {
  facebook: FacebookIcon,
  instagram: InstagramIcon,
  tiktok: TikTokIcon,
  linkedin: LinkedInIcon,
};

const platformColors: Record<Platform, string> = {
  facebook: 'from-blue-500/20 to-blue-600/10 border-blue-500/30 hover:border-blue-500/60',
  instagram: 'from-pink-500/20 to-purple-500/10 border-pink-500/30 hover:border-pink-500/60',
  tiktok: 'from-pink-500/20 to-purple-600/10 border-pink-500/30 hover:border-pink-500/60',
  linkedin: 'from-sky-500/20 to-sky-600/10 border-sky-500/30 hover:border-sky-500/60',
};

const platformActiveColors: Record<Platform, string> = {
  facebook: 'from-blue-500/30 to-blue-600/20 border-blue-500 ring-2 ring-blue-500/20',
  instagram: 'from-pink-500/30 to-purple-500/20 border-pink-500 ring-2 ring-pink-500/20',
  tiktok: 'from-pink-500/30 to-purple-600/20 border-pink-500 ring-2 ring-pink-500/20',
  linkedin: 'from-sky-500/30 to-sky-600/20 border-sky-500 ring-2 ring-sky-500/20',
};

export function PlatformSelector({ value, onChange, disabled }: PlatformSelectorProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
