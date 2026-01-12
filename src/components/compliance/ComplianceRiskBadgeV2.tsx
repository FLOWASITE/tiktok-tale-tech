/**
 * ComplianceRiskBadgeV2 - Visual compliance status indicator
 * 
 * Displays risk level with color coding and expandable details.
 */

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Lightbulb,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RiskLevel } from '@/types/industryParkV2';

interface ComplianceIssue {
  type: string;
  term: string;
  reason: string;
  severity: 'error' | 'warning';
  suggestion?: string;
  alternative?: string;
}

interface ComplianceRiskBadgeV2Props {
  riskLevel: RiskLevel;
  riskScore?: number;
  issues?: ComplianceIssue[];
  onSuggestFix?: () => Promise<void>;
  isSuggesting?: boolean;
  className?: string;
  showDetails?: boolean;
}

const riskConfig: Record<RiskLevel, {
  label: string;
  icon: typeof CheckCircle2;
  className: string;
  description: string;
}> = {
  low: {
    label: 'An toàn',
    icon: CheckCircle2,
    className: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
    description: 'Nội dung tuân thủ tốt',
  },
  medium: {
    label: 'Cần xem xét',
    icon: AlertCircle,
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
    description: 'Có một số cảnh báo nhỏ',
  },
  high: {
    label: 'Rủi ro cao',
    icon: AlertTriangle,
    className: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
    description: 'Cần điều chỉnh trước khi sử dụng',
  },
  blocked: {
    label: 'Bị chặn',
    icon: XCircle,
    className: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
    description: 'Vi phạm nghiêm trọng, không thể xuất bản',
  },
};

export function ComplianceRiskBadgeV2({
  riskLevel,
  riskScore,
  issues = [],
  onSuggestFix,
  isSuggesting = false,
  className,
  showDetails = true,
}: ComplianceRiskBadgeV2Props) {
  const [isOpen, setIsOpen] = useState(false);
  const config = riskConfig[riskLevel];
  const Icon = config.icon;
  
  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;

  // Simple badge without popover
  if (!showDetails || issues.length === 0) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="outline" 
              className={cn(config.className, 'gap-1 cursor-default', className)}
            >
              <Icon className="h-3 w-3" />
              {config.label}
              {riskScore !== undefined && riskScore > 0 && (
                <span className="text-xs opacity-75">({riskScore})</span>
              )}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>{config.description}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Badge with expandable details
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Badge 
          variant="outline" 
          className={cn(
            config.className, 
            'gap-1 cursor-pointer hover:opacity-80 transition-opacity', 
            className
          )}
        >
          <Icon className="h-3 w-3" />
          {config.label}
          {issues.length > 0 && (
            <span className="text-xs">
              ({errorCount > 0 ? `${errorCount} lỗi` : ''}{errorCount > 0 && warningCount > 0 ? ', ' : ''}{warningCount > 0 ? `${warningCount} cảnh báo` : ''})
            </span>
          )}
          <ChevronDown className={cn(
            "h-3 w-3 transition-transform",
            isOpen && "rotate-180"
          )} />
        </Badge>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-0" 
        align="start"
        sideOffset={5}
      >
        {/* Header */}
        <div className={cn('px-3 py-2 border-b', config.className)}>
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            <span className="font-medium">{config.label}</span>
            {riskScore !== undefined && (
              <span className="ml-auto text-xs opacity-75">Điểm rủi ro: {riskScore}</span>
            )}
          </div>
          <p className="text-xs opacity-75 mt-0.5">{config.description}</p>
        </div>

        {/* Issues list */}
        <div className="max-h-60 overflow-y-auto">
          {issues.map((issue, idx) => (
            <div 
              key={idx}
              className={cn(
                'px-3 py-2 border-b last:border-b-0 text-sm',
                issue.severity === 'error' 
                  ? 'bg-red-50 dark:bg-red-950/20' 
                  : 'bg-yellow-50 dark:bg-yellow-950/20'
              )}
            >
              <div className="flex items-start gap-2">
                {issue.severity === 'error' ? (
                  <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">
                    "{issue.term}"
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {issue.reason}
                  </p>
                  {issue.alternative && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                      <Lightbulb className="h-3 w-3" />
                      Thay bằng: {issue.alternative}
                    </p>
                  )}
                  {issue.suggestion && !issue.alternative && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      💡 {issue.suggestion}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        {onSuggestFix && riskLevel !== 'low' && (
          <div className="px-3 py-2 border-t bg-muted/50">
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={onSuggestFix}
              disabled={isSuggesting}
            >
              {isSuggesting ? (
                <>
                  <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                  Đang tạo gợi ý...
                </>
              ) : (
                <>
                  <Lightbulb className="h-3 w-3 mr-2" />
                  Gợi ý topic an toàn
                </>
              )}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
