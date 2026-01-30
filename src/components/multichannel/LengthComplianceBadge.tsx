import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle,
  Ruler,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  validateLength,
  CHANNEL_LENGTH_CONFIGS,
  COMPLIANCE_LEVEL_LABELS,
  HIGH_PRIORITY_CHANNELS,
  type LengthValidationResult,
  type ComplianceLevel,
} from '@/types/length-compliance';

interface LengthComplianceBadgeProps {
  content: string;
  channel: string;
  className?: string;
  showDetails?: boolean;
  size?: 'sm' | 'md';
}

const LEVEL_ICONS: Record<ComplianceLevel, typeof CheckCircle2> = {
  optimal: CheckCircle2,
  acceptable: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle,
};

export function LengthComplianceBadge({
  content,
  channel,
  className,
  showDetails = false,
  size = 'sm',
}: LengthComplianceBadgeProps) {
  const validation = useMemo(() => validateLength(content, channel), [content, channel]);
  const config = CHANNEL_LENGTH_CONFIGS[channel];
  
  if (!config) return null;
  
  const { label, color, bgColor } = COMPLIANCE_LEVEL_LABELS[validation.complianceLevel];
  const Icon = LEVEL_ICONS[validation.complianceLevel];
  const unitLabel = config.length_unit === 'chars' ? 'ký tự' : 'từ';
  const isPriority = HIGH_PRIORITY_CHANNELS.includes(channel);
  
  // Calculate progress percentage (capped at 100 for display)
  const progressPercent = Math.min(
    (validation.actualLength / validation.maxAllowed) * 100,
    100
  );
  
  // Min marker position
  const minMarkerPercent = (validation.minRequired / validation.maxAllowed) * 100;
  
  const badgeContent = (
    <Badge 
      variant="outline" 
      className={cn(
        'gap-1 font-normal cursor-pointer transition-colors',
        bgColor,
        color,
        size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1',
        className
      )}
    >
      <Icon className={cn('flex-shrink-0', size === 'sm' ? 'w-3 h-3' : 'w-4 h-4')} />
      <span>{validation.actualLength}/{validation.maxAllowed}</span>
      {isPriority && validation.complianceLevel === 'error' && (
        <span className="ml-0.5">⭐</span>
      )}
    </Badge>
  );
  
  if (!showDetails) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {badgeContent}
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-1">
              <p className="font-medium">{label}</p>
              <p className="text-xs text-muted-foreground">
                {validation.actualLength} / {validation.minRequired}-{validation.maxAllowed} {unitLabel}
              </p>
              {validation.suggestion && (
                <p className="text-xs">{validation.suggestion}</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        {badgeContent}
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4" side="top">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ruler className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">Độ dài nội dung</span>
            </div>
            <Badge variant="outline" className={cn('text-xs', bgColor, color)}>
              {label}
            </Badge>
          </div>
          
          {/* Progress bar */}
          <div className="space-y-1">
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
              <div 
                className={cn(
                  'h-full transition-all duration-300',
                  validation.complianceLevel === 'optimal' && 'bg-emerald-500',
                  validation.complianceLevel === 'acceptable' && 'bg-blue-500',
                  validation.complianceLevel === 'warning' && 'bg-amber-500',
                  validation.complianceLevel === 'error' && 'bg-destructive',
                )}
                style={{ width: `${progressPercent}%` }}
              />
              {/* Min marker */}
              <div 
                className="absolute top-0 h-full w-0.5 bg-foreground/40"
                style={{ left: `${minMarkerPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{validation.minRequired} min</span>
              <span className={color}>{validation.actualLength}</span>
              <span>{validation.maxAllowed} max</span>
            </div>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Đơn vị:</span>
              <span className="font-medium">{unitLabel}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">% mục tiêu:</span>
              <span className={cn('font-medium', color)}>
                {validation.percentOfTarget}%
              </span>
            </div>
          </div>
          
          {/* Suggestion */}
          {validation.suggestion && (
            <div className={cn(
              'p-2 rounded-md text-xs',
              validation.shortfall > 0 && 'bg-amber-500/10 text-amber-700',
              validation.overflow > 0 && 'bg-blue-500/10 text-blue-700',
            )}>
              <div className="flex items-start gap-1.5">
                {validation.shortfall > 0 ? (
                  <TrendingUp className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                )}
                <span>{validation.suggestion}</span>
              </div>
            </div>
          )}
          
          {/* Priority note */}
          {isPriority && (
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <span>⭐</span>
              <span>Kênh ưu tiên cao - độ dài quan trọng cho engagement</span>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Compact inline display for content cards
 */
interface LengthComplianceInlineProps {
  content: string;
  channel: string;
  className?: string;
}

export function LengthComplianceInline({ content, channel, className }: LengthComplianceInlineProps) {
  const validation = useMemo(() => validateLength(content, channel), [content, channel]);
  const config = CHANNEL_LENGTH_CONFIGS[channel];
  
  if (!config) return null;
  
  const { color } = COMPLIANCE_LEVEL_LABELS[validation.complianceLevel];
  const Icon = LEVEL_ICONS[validation.complianceLevel];
  const unitLabel = config.length_unit === 'chars' ? 'ký tự' : 'từ';
  
  return (
    <div className={cn('flex items-center gap-1 text-xs', className)}>
      <Icon className={cn('w-3 h-3', color)} />
      <span className="text-muted-foreground">
        {validation.actualLength} {unitLabel}
      </span>
      {!validation.isValid && validation.suggestion && (
        <span className={cn('ml-1', color)}>
          ({validation.shortfall > 0 ? `+${validation.shortfall}` : `-${validation.overflow}`})
        </span>
      )}
    </div>
  );
}
