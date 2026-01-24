import { Card, CardContent } from '@/components/ui/card';
import { Target, Compass, FileText, Sparkles, CheckCircle2 } from 'lucide-react';
import { ContentGoal, ContentAngle, CONTENT_ANGLES, CONTENT_GOALS } from '@/types/multichannel';
import { CoreContentLengthMode, CORE_CONTENT_LENGTH_MODES } from '@/types/coreContent';
import { cn } from '@/lib/utils';

interface StrategyOverviewCardProps {
  contentGoal?: ContentGoal;
  contentAngle?: ContentAngle;
  lengthMode?: CoreContentLengthMode;
  className?: string;
}

export function StrategyOverviewCard({
  contentGoal,
  contentAngle,
  lengthMode,
  className,
}: StrategyOverviewCardProps) {
  const goalInfo = CONTENT_GOALS.find(g => g.value === contentGoal);
  const angleInfo = CONTENT_ANGLES.find(a => a.value === contentAngle);
  const lengthInfo = CORE_CONTENT_LENGTH_MODES.find(l => l.value === lengthMode);

  const items = [
    {
      icon: Target,
      label: 'Mục tiêu',
      value: goalInfo?.label || 'Chưa chọn',
      description: goalInfo?.description,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      hasValue: !!contentGoal,
    },
    {
      icon: Compass,
      label: 'Góc tiếp cận',
      value: angleInfo?.label || 'Mặc định',
      description: angleInfo?.description,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      hasValue: !!contentAngle,
    },
    {
      icon: FileText,
      label: 'Độ dài',
      value: lengthInfo?.label || 'Trung bình',
      description: lengthInfo ? `${lengthInfo.targetWords} từ` : undefined,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      hasValue: !!lengthMode,
    },
  ];

  return (
    <Card className={cn(
      'border-primary/20 bg-gradient-to-br from-primary/5 via-background to-secondary/5',
      className
    )}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            Tổng quan chiến lược từ Step 1-2
          </span>
        </div>

        {/* Strategy Items */}
        <div className="grid grid-cols-3 gap-3">
          {items.map((item) => (
            <div
              key={item.label}
              className={cn(
                'relative rounded-lg p-2.5 transition-all',
                item.bgColor,
                'border border-transparent',
                item.hasValue && 'border-current/10'
              )}
            >
              {/* Check indicator */}
              {item.hasValue && (
                <CheckCircle2 className="absolute top-1.5 right-1.5 w-3 h-3 text-green-500" />
              )}
              
              {/* Icon + Label */}
              <div className="flex items-center gap-1.5 mb-1">
                <item.icon className={cn('w-3.5 h-3.5', item.color)} />
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                  {item.label}
                </span>
              </div>

              {/* Value */}
              <p className={cn(
                'text-sm font-semibold truncate',
                item.hasValue ? 'text-foreground' : 'text-muted-foreground/60'
              )}>
                {item.value}
              </p>

              {/* Description */}
              {item.description && (
                <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                  {item.description}
                </p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
