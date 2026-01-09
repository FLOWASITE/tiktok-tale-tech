import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ShieldAlert, ShieldCheck, ShieldX, Loader2 } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ComplianceIssue, PreCheckResult } from '@/hooks/useCompliancePrecheck';

interface ComplianceWarningBadgeProps {
  result: PreCheckResult | null;
  onSuggestCompliant?: () => void;
  isSuggesting?: boolean;
  className?: string;
}

export function ComplianceWarningBadge({
  result,
  onSuggestCompliant,
  isSuggesting,
  className,
}: ComplianceWarningBadgeProps) {
  if (!result) return null;

  const { riskLevel, issues, passed } = result;

  // No issues
  if (riskLevel === 'low' && issues.length === 0) {
    return (
      <Badge variant="outline" className={cn("gap-1.5 text-emerald-600 border-emerald-200 bg-emerald-50", className)}>
        <ShieldCheck className="w-3 h-3" />
        An toàn
      </Badge>
    );
  }

  const errorIssues = issues.filter(i => i.severity === 'error');
  const warningIssues = issues.filter(i => i.severity === 'warning');

  // Blocked - has forbidden terms
  if (riskLevel === 'blocked') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("flex items-center gap-2", className)}>
            <Badge variant="destructive" className="gap-1.5">
              <ShieldX className="w-3 h-3" />
              Topic bị chặn
            </Badge>
            {onSuggestCompliant && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onSuggestCompliant}
                disabled={isSuggesting}
                className="h-6 text-xs gap-1 text-primary border-primary/30 hover:bg-primary/5"
              >
                {isSuggesting ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Đang gợi ý...
                  </>
                ) : (
                  'Gợi ý topic an toàn'
                )}
              </Button>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium text-destructive">Từ cấm được phát hiện:</p>
            <ul className="text-sm space-y-0.5">
              {errorIssues.map((issue, idx) => (
                <li key={idx}>• "{issue.term}" - {issue.reason}</li>
              ))}
            </ul>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  // High risk
  if (riskLevel === 'high') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("flex items-center gap-2", className)}>
            <Badge variant="outline" className="gap-1.5 text-amber-600 border-amber-200 bg-amber-50">
              <ShieldAlert className="w-3 h-3" />
              Rủi ro cao ({issues.length})
            </Badge>
            {onSuggestCompliant && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onSuggestCompliant}
                disabled={isSuggesting}
                className="h-6 text-xs gap-1"
              >
                {isSuggesting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Cải thiện'}
              </Button>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium">Cảnh báo compliance:</p>
            <ul className="text-sm space-y-0.5">
              {issues.slice(0, 5).map((issue, idx) => (
                <li key={idx}>• "{issue.term}" - {issue.reason}</li>
              ))}
            </ul>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Medium risk
  if (riskLevel === 'medium') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={cn("gap-1.5 text-yellow-600 border-yellow-200 bg-yellow-50", className)}>
            <AlertTriangle className="w-3 h-3" />
            Cần xem lại ({issues.length})
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium">Lưu ý:</p>
            <ul className="text-sm space-y-0.5">
              {issues.map((issue, idx) => (
                <li key={idx}>• {issue.reason}</li>
              ))}
            </ul>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return null;
}
