import { useMemo } from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { ChannelSettings } from '@/types/channelSettings';

interface ContentLengthIndicatorProps {
  content: string;
  settings: ChannelSettings;
  className?: string;
}

type ComplianceLevel = 'optimal' | 'warning' | 'error';

interface ComplianceResult {
  level: ComplianceLevel;
  percentage: number;
  currentValue: number;
  minValue: number | undefined;
  maxValue: number;
  unit: 'words' | 'chars';
  message: string;
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function countCharacters(text: string): number {
  return text.length;
}

function analyzeCompliance(content: string, settings: ChannelSettings): ComplianceResult {
  const currentValue = settings.length_unit === 'chars' 
    ? countCharacters(content) 
    : countWords(content);
  
  const { min_length, max_length, length_unit } = settings;
  const unitLabel = length_unit === 'chars' ? 'ký tự' : 'chữ';
  
  // Calculate percentage (capped at 100% for display, but can be over)
  const percentage = Math.min((currentValue / max_length) * 100, 100);
  
  let level: ComplianceLevel = 'optimal';
  let message = '';
  
  if (currentValue > max_length) {
    level = 'error';
    const over = currentValue - max_length;
    message = `Vượt ${over} ${unitLabel}`;
  } else if (min_length && currentValue < min_length) {
    level = 'warning';
    const under = min_length - currentValue;
    message = `Thiếu ${under} ${unitLabel}`;
  } else if (currentValue >= max_length * 0.9) {
    level = 'warning';
    message = `Gần giới hạn (${Math.round((currentValue / max_length) * 100)}%)`;
  } else {
    message = `Phù hợp (${Math.round((currentValue / max_length) * 100)}%)`;
  }
  
  return {
    level,
    percentage,
    currentValue,
    minValue: min_length,
    maxValue: max_length,
    unit: length_unit,
    message,
  };
}

export function ContentLengthIndicator({ content, settings, className }: ContentLengthIndicatorProps) {
  const compliance = useMemo(() => analyzeCompliance(content, settings), [content, settings]);
  
  const colorClasses = {
    optimal: {
      progress: 'bg-emerald-500',
      text: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      icon: CheckCircle2,
    },
    warning: {
      progress: 'bg-amber-500',
      text: 'text-amber-500',
      bg: 'bg-amber-500/10',
      icon: AlertTriangle,
    },
    error: {
      progress: 'bg-destructive',
      text: 'text-destructive',
      bg: 'bg-destructive/10',
      icon: AlertCircle,
    },
  };
  
  const colors = colorClasses[compliance.level];
  const Icon = colors.icon;
  const unitLabel = compliance.unit === 'chars' ? 'ký tự' : 'chữ';
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`space-y-1.5 ${className}`}>
            {/* Progress bar with custom color */}
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
              <div 
                className={`h-full transition-all duration-300 ${colors.progress}`}
                style={{ 
                  width: `${Math.min(compliance.percentage, 100)}%`,
                }}
              />
              {/* Min marker */}
              {compliance.minValue && (
                <div 
                  className="absolute top-0 h-full w-0.5 bg-muted-foreground/30"
                  style={{ left: `${(compliance.minValue / compliance.maxValue) * 100}%` }}
                />
              )}
            </div>
            
            {/* Status row */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <Icon className={`w-3.5 h-3.5 ${colors.text}`} />
                <span className={colors.text}>{compliance.message}</span>
              </div>
              <span className="text-muted-foreground">
                {compliance.currentValue}/{compliance.maxValue} {unitLabel}
              </span>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium">Giới hạn độ dài</p>
            {compliance.minValue ? (
              <p className="text-xs text-muted-foreground">
                {compliance.minValue} - {compliance.maxValue} {unitLabel}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Tối đa {compliance.maxValue} {unitLabel}
              </p>
            )}
            <p className="text-xs">
              Hiện tại: <span className={colors.text}>{compliance.currentValue} {unitLabel}</span>
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
