import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Lock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IndustryPackSummaryProps {
  packId?: string;
  name: string;
  version?: string;
  countryCode?: string;
  countryName?: string;
  flagEmoji?: string;
  forbiddenTermsCount?: number;
  complianceRulesCount?: number;
  claimRestrictionsCount?: number;
  status?: 'stable' | 'draft' | 'deprecated';
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Compact Industry Pack summary for lists, badges, and tooltips
 */
export function IndustryPackSummary({
  name,
  version,
  countryCode = 'VN',
  countryName = 'Việt Nam',
  flagEmoji = '🇻🇳',
  forbiddenTermsCount = 0,
  complianceRulesCount = 0,
  claimRestrictionsCount = 0,
  status = 'stable',
  size = 'md',
  className,
}: IndustryPackSummaryProps) {
  const isSmall = size === 'sm';
  
  return (
    <div 
      className={cn(
        "flex items-center gap-2 flex-wrap",
        isSmall ? "gap-1.5" : "gap-2",
        className
      )}
    >
      {/* Name + Country + Version */}
      <div className="flex items-center gap-1.5">
        <span className={cn(
          "font-medium",
          isSmall ? "text-xs" : "text-sm"
        )}>
          {name}
        </span>
        <span className="text-muted-foreground">
          {flagEmoji || countryCode}
        </span>
        {version && (
          <Badge 
            variant="outline" 
            className={cn(
              "font-mono",
              isSmall ? "text-[10px] px-1 py-0" : "text-xs px-1.5 py-0.5"
            )}
          >
            v{version}
          </Badge>
        )}
        {status === 'stable' && (
          <CheckCircle2 className={cn(
            "text-emerald-500",
            isSmall ? "h-3 w-3" : "h-3.5 w-3.5"
          )} />
        )}
      </div>

      {/* Rule counts */}
      {(forbiddenTermsCount > 0 || complianceRulesCount > 0 || claimRestrictionsCount > 0) && (
        <div className={cn(
          "flex items-center gap-1.5",
          isSmall ? "gap-1" : "gap-1.5"
        )}>
          {forbiddenTermsCount > 0 && (
            <Badge 
              variant="secondary" 
              className={cn(
                "bg-destructive/10 text-destructive border-destructive/20",
                isSmall ? "text-[10px] px-1 py-0 gap-0.5" : "text-xs px-1.5 py-0.5 gap-1"
              )}
            >
              <Lock className={isSmall ? "h-2.5 w-2.5" : "h-3 w-3"} />
              {forbiddenTermsCount}
            </Badge>
          )}
          {complianceRulesCount > 0 && (
            <Badge 
              variant="secondary" 
              className={cn(
                "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
                isSmall ? "text-[10px] px-1 py-0 gap-0.5" : "text-xs px-1.5 py-0.5 gap-1"
              )}
            >
              <ShieldCheck className={isSmall ? "h-2.5 w-2.5" : "h-3 w-3"} />
              {complianceRulesCount}
            </Badge>
          )}
          {claimRestrictionsCount > 0 && (
            <Badge 
              variant="secondary" 
              className={cn(
                "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
                isSmall ? "text-[10px] px-1 py-0 gap-0.5" : "text-xs px-1.5 py-0.5 gap-1"
              )}
            >
              <AlertTriangle className={isSmall ? "h-2.5 w-2.5" : "h-3 w-3"} />
              {claimRestrictionsCount}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
