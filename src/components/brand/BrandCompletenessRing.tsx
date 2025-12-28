import { cn } from '@/lib/utils';
import { BrandCompleteness, getCompletenessRingColor, getCompletenessColor } from '@/utils/brandCompleteness';

interface BrandCompletenessRingProps {
  completeness: BrandCompleteness;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function BrandCompletenessRing({
  completeness,
  size = 'md',
  showLabel = true,
  className,
}: BrandCompletenessRingProps) {
  const { score, level } = completeness;
  
  const sizeConfig = {
    sm: { ring: 40, stroke: 4, text: 'text-xs', icon: 12 },
    md: { ring: 56, stroke: 5, text: 'text-sm', icon: 16 },
    lg: { ring: 80, stroke: 6, text: 'text-lg', icon: 24 },
  };

  const config = sizeConfig[size];
  const radius = (config.ring - config.stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative" style={{ width: config.ring, height: config.ring }}>
        {/* Background Circle */}
        <svg
          className="absolute inset-0 -rotate-90"
          width={config.ring}
          height={config.ring}
        >
          <circle
            cx={config.ring / 2}
            cy={config.ring / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={config.stroke}
            className="text-muted/20"
          />
          <circle
            cx={config.ring / 2}
            cy={config.ring / 2}
            r={radius}
            fill="none"
            strokeWidth={config.stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={cn("transition-all duration-500", getCompletenessRingColor(level))}
          />
        </svg>
        
        {/* Score Text */}
        <div className={cn(
          "absolute inset-0 flex items-center justify-center font-semibold",
          config.text,
          getCompletenessColor(level)
        )}>
          {score}%
        </div>
      </div>

      {showLabel && (
        <div className="flex flex-col">
          <span className={cn("font-medium", config.text)}>
            {level === 'complete' ? 'Hoàn thành' : 
             level === 'high' ? 'Gần hoàn thành' :
             level === 'medium' ? 'Trung bình' : 'Cần bổ sung'}
          </span>
          {size !== 'sm' && (
            <span className="text-xs text-muted-foreground">
              Độ hoàn thiện Brand
            </span>
          )}
        </div>
      )}
    </div>
  );
}
