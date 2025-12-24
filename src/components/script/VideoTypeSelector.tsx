import { VideoType, VIDEO_TYPE_LABELS } from '@/types/script';
import { cn } from '@/lib/utils';
import { 
  GraduationCap, 
  Search, 
  AlertTriangle,
  MessageCircle
} from 'lucide-react';

interface VideoTypeSelectorProps {
  value: VideoType;
  onChange: (value: VideoType) => void;
  disabled?: boolean;
}

const VIDEO_TYPE_CONFIG: Record<VideoType, { 
  icon: typeof GraduationCap; 
  description: string; 
  gradient: string;
}> = {
  expert_share: { 
    icon: GraduationCap, 
    description: 'Chia sẻ kiến thức chuyên môn',
    gradient: 'from-blue-500 to-indigo-600'
  },
  analyze_explain: { 
    icon: Search, 
    description: 'Phân tích, giải thích chi tiết',
    gradient: 'from-amber-500 to-yellow-500'
  },
  warning_mistake: { 
    icon: AlertTriangle, 
    description: 'Cảnh báo sai lầm phổ biến',
    gradient: 'from-red-500 to-rose-500'
  },
  quick_qa: { 
    icon: MessageCircle, 
    description: 'Hỏi đáp nhanh, ngắn gọn',
    gradient: 'from-green-500 to-emerald-500'
  },
};

export function VideoTypeSelector({ value, onChange, disabled }: VideoTypeSelectorProps) {
  const videoTypes = Object.keys(VIDEO_TYPE_CONFIG) as VideoType[];
  
  return (
    <div className="grid grid-cols-2 gap-2">
      {videoTypes.map((type, index) => {
        const config = VIDEO_TYPE_CONFIG[type];
        const Icon = config.icon;
        const isSelected = value === type;
        
        return (
          <button
            key={type}
            type="button"
            onClick={() => onChange(type)}
            disabled={disabled}
            className={cn(
              "stagger-item group relative flex flex-col items-start gap-2 p-3 rounded-xl border-2 text-left transition-all duration-300",
              "hover:scale-[1.02] active:scale-[0.98]",
              isSelected
                ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                : "border-border/50 bg-muted/30 hover:border-primary/30 hover:bg-muted/50",
              disabled && "opacity-50 cursor-not-allowed pointer-events-none"
            )}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {/* Gradient overlay on hover/selected */}
            <div className={cn(
              "absolute inset-0 rounded-xl transition-opacity duration-300 bg-gradient-to-br",
              config.gradient,
              isSelected ? "opacity-[0.08]" : "opacity-0 group-hover:opacity-[0.04]"
            )} />
            
            {/* Header with icon */}
            <div className="relative flex items-center gap-2">
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300",
                isSelected 
                  ? `bg-gradient-to-br ${config.gradient} text-white shadow-lg` 
                  : "bg-muted text-muted-foreground group-hover:bg-muted/80"
              )}>
                <Icon className="w-4 h-4" />
              </div>
              <span className={cn(
                "text-xs sm:text-sm font-semibold transition-colors line-clamp-1",
                isSelected ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
              )}>
                {VIDEO_TYPE_LABELS[type]}
              </span>
            </div>
            
            {/* Description */}
            <p className="relative text-[10px] sm:text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
              {config.description}
            </p>
            
            {/* Selected indicator */}
            {isSelected && (
              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center animate-scale-in">
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
