import { Card, CardContent } from '@/components/ui/card';
import { Target, Compass, FileText, Sparkles } from 'lucide-react';
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
      hasValue: !!contentGoal,
    },
    {
      icon: Compass,
      label: 'Góc tiếp cận',
      value: angleInfo?.label || 'Mặc định',
      description: angleInfo?.description,
      hasValue: !!contentAngle,
    },
    {
      icon: FileText,
      label: 'Độ dài',
      value: lengthInfo?.label || 'Trung bình',
      description: lengthInfo ? `${lengthInfo.targetWords} từ` : undefined,
      hasValue: !!lengthMode,
    },
  ];

  return (
    <Card className={cn(
      'border-border/30 bg-muted/30 backdrop-blur-sm shadow-sm',
      className
    )}>
      <CardContent className="px-4 py-3">
        <div className="flex items-center gap-2 mb-2.5">
          <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
            Chiến lược từ Step 1–2
          </span>
        </div>

        <div className="flex items-center divide-x divide-border/40">
          {items.map((item) => (
            <div
              key={item.label}
              className="flex-1 px-3 first:pl-0 last:pr-0"
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <item.icon className="w-3 h-3 text-muted-foreground/70" />
                <span className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wider">
                  {item.label}
                </span>
              </div>
              <p className={cn(
                'text-sm font-medium truncate',
                item.hasValue ? 'text-foreground' : 'text-muted-foreground/50'
              )}>
                {item.value}
              </p>
              {item.description && (
                <p className="text-[10px] text-muted-foreground/60 mt-0.5 truncate">
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
