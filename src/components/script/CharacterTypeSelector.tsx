import { CharacterType, CHARACTER_TYPE_LABELS } from '@/types/script';
import { cn } from '@/lib/utils';
import { User, UserCircle, HeadphonesIcon, GraduationCap, Bot } from 'lucide-react';

interface CharacterTypeSelectorProps {
  value: CharacterType;
  onChange: (value: CharacterType) => void;
  disabled?: boolean;
}

const CHARACTER_CONFIG: Record<CharacterType, { 
  icon: typeof User; 
  color: string;
  bgColor: string;
}> = {
  male_expert: { 
    icon: UserCircle, 
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30'
  },
  female_expert: { 
    icon: User, 
    color: 'text-pink-600',
    bgColor: 'bg-pink-100 dark:bg-pink-900/30'
  },
  consultant: { 
    icon: HeadphonesIcon, 
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30'
  },
  instructor: { 
    icon: GraduationCap, 
    color: 'text-amber-600',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30'
  },
  ai_presenter: { 
    icon: Bot, 
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/30'
  },
};

export function CharacterTypeSelector({ value, onChange, disabled }: CharacterTypeSelectorProps) {
  const characterTypes = Object.keys(CHARACTER_CONFIG) as CharacterType[];
  
  return (
    <div className="flex flex-wrap gap-2">
      {characterTypes.map((type) => {
        const config = CHARACTER_CONFIG[type];
        const Icon = config.icon;
        const isSelected = value === type;
        
        return (
          <button
            key={type}
            type="button"
            onClick={() => onChange(type)}
            disabled={disabled}
            className={cn(
              "group relative flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full border-2 transition-all duration-300",
              "hover:scale-[1.02] active:scale-[0.98]",
              isSelected
                ? "border-primary bg-primary/10 shadow-md"
                : "border-border/50 bg-muted/30 hover:border-primary/30 hover:bg-muted/50",
              disabled && "opacity-50 cursor-not-allowed pointer-events-none"
            )}
          >
            {/* Avatar */}
            <div className={cn(
              "w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center transition-all duration-300",
              isSelected ? config.bgColor : "bg-muted",
              isSelected && "ring-2 ring-primary/20"
            )}>
              <Icon className={cn(
                "w-3.5 h-3.5 sm:w-4 sm:h-4 transition-colors",
                isSelected ? config.color : "text-muted-foreground"
              )} />
            </div>
            
            {/* Label */}
            <span className={cn(
              "text-xs sm:text-sm font-medium transition-colors whitespace-nowrap",
              isSelected ? "text-foreground" : "text-muted-foreground"
            )}>
              {CHARACTER_TYPE_LABELS[type]}
            </span>
            
            {/* Glow effect on selected */}
            {isSelected && (
              <div className="absolute inset-0 rounded-full bg-primary/5 animate-pulse-glow pointer-events-none" />
            )}
          </button>
        );
      })}
    </div>
  );
}
