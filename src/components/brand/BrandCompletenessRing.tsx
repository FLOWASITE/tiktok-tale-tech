import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { BrandCompleteness, getCompletenessRingColor, getCompletenessColor } from '@/utils/brandCompleteness';
import { AlertTriangle, TrendingUp, CheckCircle, Sparkles } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useConfetti } from '@/hooks/useConfetti';
import { useToast } from '@/hooks/use-toast';

interface BrandCompletenessRingProps {
  completeness: BrandCompleteness;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showLabel?: boolean;
  showIcon?: boolean;
  showTooltip?: boolean;
  animated?: boolean;
  className?: string;
}

const sizeConfig = {
  sm: { ring: 40, stroke: 3, text: 'text-[10px]', icon: 12, labelText: 'text-xs' },
  md: { ring: 56, stroke: 4, text: 'text-xs', icon: 14, labelText: 'text-sm' },
  lg: { ring: 72, stroke: 5, text: 'text-sm', icon: 18, labelText: 'text-base' },
  xl: { ring: 96, stroke: 6, text: 'text-lg', icon: 24, labelText: 'text-lg' },
};

function getLevelIcon(level: BrandCompleteness['level'], size: number) {
  const iconClass = cn('transition-all duration-300');
  
  switch (level) {
    case 'complete':
      return <Sparkles className={iconClass} style={{ width: size, height: size }} />;
    case 'high':
      return <CheckCircle className={iconClass} style={{ width: size, height: size }} />;
    case 'medium':
      return <TrendingUp className={iconClass} style={{ width: size, height: size }} />;
    case 'low':
    default:
      return <AlertTriangle className={iconClass} style={{ width: size, height: size }} />;
  }
}

function getGlowColor(level: BrandCompleteness['level']) {
  switch (level) {
    case 'complete': return 'shadow-emerald-500/30';
    case 'high': return 'shadow-blue-500/20';
    case 'medium': return 'shadow-amber-500/20';
    case 'low': default: return 'shadow-destructive/20';
  }
}

export function BrandCompletenessRing({
  completeness,
  size = 'md',
  showLabel = true,
  showIcon = false,
  showTooltip = true,
  animated = true,
  className,
}: BrandCompletenessRingProps) {
  const { score, level, items } = completeness;
  const [animatedScore, setAnimatedScore] = useState(animated ? 0 : score);
  const prevScoreRef = useRef<number | null>(null);
  const hasCelebratedRef = useRef(false);
  const { fireConfetti } = useConfetti();
  const { toast } = useToast();
  
  // Celebrate when reaching 100%
  useEffect(() => {
    if (
      score === 100 && 
      prevScoreRef.current !== null && 
      prevScoreRef.current < 100 &&
      !hasCelebratedRef.current
    ) {
      hasCelebratedRef.current = true;
      fireConfetti();
      toast({
        title: "🎉 Hoàn thiện 100%!",
        description: "Brand của bạn đã hoàn thiện đầy đủ thông tin!",
        className: "border-emerald-500/50 bg-emerald-500/5",
      });
    }
    prevScoreRef.current = score;
  }, [score, fireConfetti, toast]);
  
  // Animate score on mount
  useEffect(() => {
    if (!animated) {
      setAnimatedScore(score);
      return;
    }
    
    const duration = 800;
    const startTime = performance.now();
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(easeOut * score));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [score, animated]);

  const config = sizeConfig[size];
  const radius = (config.ring - config.stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference;

  const RingContent = (
    <div 
      className={cn(
        "relative rounded-full transition-shadow duration-500",
        level === 'complete' && 'shadow-lg',
        level === 'complete' && getGlowColor(level),
        className
      )} 
      style={{ width: config.ring, height: config.ring }}
    >
      {/* Glow effect for complete */}
      {level === 'complete' && (
        <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-pulse-glow" />
      )}
      
      {/* Background Circle */}
      <svg
        className="absolute inset-0 -rotate-90"
        width={config.ring}
        height={config.ring}
      >
        {/* Track */}
        <circle
          cx={config.ring / 2}
          cy={config.ring / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={config.stroke}
          className="text-muted/20"
        />
        {/* Progress */}
        <circle
          cx={config.ring / 2}
          cy={config.ring / 2}
          r={radius}
          fill="none"
          strokeWidth={config.stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className={cn(
            "transition-all duration-700 ease-out",
            getCompletenessRingColor(level)
          )}
        />
      </svg>
      
      {/* Center Content */}
      <div className={cn(
        "absolute inset-0 flex flex-col items-center justify-center",
        getCompletenessColor(level)
      )}>
        {showIcon && size !== 'sm' ? (
          <>
            {getLevelIcon(level, config.icon)}
            <span className={cn("font-bold mt-0.5", config.text)}>
              {animatedScore}%
            </span>
          </>
        ) : (
          <span className={cn("font-bold", config.text)}>
            {animatedScore}%
          </span>
        )}
      </div>
    </div>
  );

  const TooltipItems = (
    <div className="space-y-1.5 max-w-[200px]">
      <p className="font-medium text-xs border-b pb-1 mb-2">Chi tiết hoàn thiện</p>
      {items.map((item) => (
        <div key={item.key} className="flex items-center gap-2 text-xs">
          <div className={cn(
            "w-3 h-3 rounded-full flex items-center justify-center text-[8px]",
            item.completed 
              ? "bg-emerald-500/20 text-emerald-500" 
              : "bg-muted text-muted-foreground"
          )}>
            {item.completed ? '✓' : '○'}
          </div>
          <span className={item.completed ? 'text-foreground' : 'text-muted-foreground'}>
            {item.label}
          </span>
          <span className="ml-auto text-muted-foreground text-[10px]">
            {item.weight}%
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <div className={cn("flex items-center gap-3", showLabel && 'gap-3')}>
      {showTooltip ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {RingContent}
            </TooltipTrigger>
            <TooltipContent side="bottom" className="p-3">
              {TooltipItems}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        RingContent
      )}

      {showLabel && (
        <div className="flex flex-col">
          <span className={cn("font-semibold", config.labelText, getCompletenessColor(level))}>
            {level === 'complete' ? 'Hoàn thiện!' : 
             level === 'high' ? 'Gần hoàn thiện' :
             level === 'medium' ? 'Đang phát triển' : 'Cần bổ sung'}
          </span>
          <span className="text-xs text-muted-foreground">
            Brand Completeness
          </span>
        </div>
      )}
    </div>
  );
}
