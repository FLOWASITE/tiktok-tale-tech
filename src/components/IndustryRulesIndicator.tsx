import { ShieldCheck, Info, Lock, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { IndustryMemory } from '@/hooks/useIndustryMemory';

interface IndustryRulesIndicatorProps {
  industryMemory: IndustryMemory | null;
  isLoading?: boolean;
  countryName?: string;
  className?: string;
}

/**
 * Compact pre-generate indicator showing Industry Memory will be applied
 */
export function IndustryRulesIndicator({
  industryMemory,
  isLoading = false,
  countryName = 'Việt Nam',
  className,
}: IndustryRulesIndicatorProps) {
  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 p-2 rounded-lg bg-muted/50 animate-pulse ${className}`}>
        <div className="h-4 w-4 rounded bg-muted" />
        <div className="h-3 w-32 rounded bg-muted" />
      </div>
    );
  }

  if (!industryMemory) {
    return (
      <div className={`flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 ${className}`}>
        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
        <span className="text-xs text-amber-600 dark:text-amber-400">
          Chưa liên kết Industry Memory
        </span>
      </div>
    );
  }

  const complianceCount = industryMemory.compliance_rules?.length || 0;
  const forbiddenCount = industryMemory.forbidden_terms?.length || 0;
  const claimCount = industryMemory.claim_restrictions?.length || 0;

  return (
    <div className={`flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 ${className}`}>
      <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
        Industry rules applied
      </span>
      <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 h-auto">
        {industryMemory.name} – {countryName} (v{industryMemory.version})
      </Badge>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="h-3.5 w-3.5 text-emerald-400 cursor-help shrink-0" />
        </TooltipTrigger>
        <TooltipContent className="max-w-sm">
          <div className="space-y-2 text-xs">
            <p className="font-medium flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              Industry Memory sẽ được áp dụng
            </p>
            <div className="space-y-1 text-muted-foreground">
              {complianceCount > 0 && (
                <p className="flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3 text-emerald-500" />
                  {complianceCount} quy tắc tuân thủ
                </p>
              )}
              {forbiddenCount > 0 && (
                <p className="flex items-center gap-1">
                  <Lock className="h-3 w-3 text-destructive" />
                  {forbiddenCount} từ cấm ngành
                </p>
              )}
              {claimCount > 0 && (
                <p className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-amber-500" />
                  {claimCount} tuyên bố bị hạn chế
                </p>
              )}
            </div>
            <p className="text-muted-foreground italic text-[10px]">
              Target: {industryMemory.target_audience}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
