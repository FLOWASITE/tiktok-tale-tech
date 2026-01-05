import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

interface CampaignProgressBarProps {
  progress: number;
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

export function CampaignProgressBar({ 
  progress, 
  className, 
  showLabel = true,
  size = 'md' 
}: CampaignProgressBarProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress));
  
  const getProgressColor = () => {
    if (clampedProgress >= 100) return 'bg-green-500';
    if (clampedProgress >= 75) return 'bg-primary';
    if (clampedProgress >= 50) return 'bg-yellow-500';
    if (clampedProgress >= 25) return 'bg-orange-500';
    return 'bg-muted-foreground';
  };

  return (
    <div className={cn('space-y-1', className)}>
      {showLabel && (
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Tiến độ</span>
          <span className="font-medium">{Math.round(clampedProgress)}%</span>
        </div>
      )}
      <div className={cn(
        'relative w-full rounded-full bg-muted overflow-hidden',
        size === 'sm' ? 'h-1.5' : 'h-2'
      )}>
        <div 
          className={cn(
            'h-full rounded-full transition-all duration-500',
            getProgressColor()
          )}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
}
