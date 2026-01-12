/**
 * JurisdictionBadge - Display jurisdiction info with flag
 * 
 * Shows the jurisdiction code with flag emoji and optional details.
 */

import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { getJurisdictionName, getJurisdictionFlag } from '@/utils/jurisdictionResolver';

interface JurisdictionBadgeProps {
  jurisdictionCode: string;
  industryCode?: string;
  industryName?: string;
  version?: string;
  validityStatus?: 'valid' | 'stale' | 'invalid';
  showDetails?: boolean;
  className?: string;
}

export function JurisdictionBadge({
  jurisdictionCode,
  industryCode,
  industryName,
  version,
  validityStatus = 'valid',
  showDetails = false,
  className,
}: JurisdictionBadgeProps) {
  const flag = getJurisdictionFlag(jurisdictionCode);
  const name = getJurisdictionName(jurisdictionCode);

  const statusStyles = {
    valid: 'border-green-500/50 bg-green-50 dark:bg-green-950/20',
    stale: 'border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20',
    invalid: 'border-red-500/50 bg-red-50 dark:bg-red-950/20',
  };

  const badge = (
    <Badge 
      variant="outline" 
      className={cn(
        'gap-1.5',
        validityStatus !== 'valid' && statusStyles[validityStatus],
        className
      )}
    >
      <span className="text-base leading-none">{flag}</span>
      <span>{jurisdictionCode}</span>
      {industryCode && (
        <>
          <span className="text-muted-foreground">•</span>
          <span>{industryName || industryCode}</span>
        </>
      )}
      {version && (
        <span className="text-xs text-muted-foreground">v{version}</span>
      )}
    </Badge>
  );

  if (!showDetails) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm">
            <p className="font-medium">{name}</p>
            {industryName && (
              <p className="text-muted-foreground">Ngành: {industryName}</p>
            )}
            {version && (
              <p className="text-muted-foreground">Phiên bản: {version}</p>
            )}
            {validityStatus !== 'valid' && (
              <p className={cn(
                'mt-1',
                validityStatus === 'stale' && 'text-yellow-600',
                validityStatus === 'invalid' && 'text-red-600',
              )}>
                {validityStatus === 'stale' ? '⚠️ Cần cập nhật' : '❌ Không hợp lệ'}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
