import { ShieldCheck, Info, Lock, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { IndustryMemory } from '@/hooks/useIndustryMemory';

interface IndustryMemoryBadgeProps {
  industryMemory: IndustryMemory | null;
  countryName?: string;
  variant?: 'pre-generate' | 'post-generate';
  className?: string;
}

/**
 * Badge component to display Industry Memory activation status
 * 
 * - Pre-generate: Shows before content is generated
 * - Post-generate: Shows after content is generated (proof badge)
 */
export function IndustryMemoryBadge({
  industryMemory,
  countryName = 'Việt Nam',
  variant = 'pre-generate',
  className,
}: IndustryMemoryBadgeProps) {
  if (!industryMemory) {
    return (
      <div className={`flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 ${className}`}>
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <span className="text-xs text-amber-600 dark:text-amber-400">
          Chưa liên kết Industry Rules
        </span>
      </div>
    );
  }

  const complianceCount = industryMemory.compliance_rules.length;
  const forbiddenCount = industryMemory.forbidden_terms.length;
  const claimCount = industryMemory.claim_restrictions.length;

  if (variant === 'post-generate') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
              <span>Generated under</span>
              <Badge variant="secondary" className="text-xs">
                {industryMemory.name} – {countryName} (v{industryMemory.version})
              </Badge>
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-sm">
            <div className="space-y-1 text-xs">
              {complianceCount > 0 && (
                <p className="flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3 text-emerald-500" />
                  {complianceCount} quy tắc tuân thủ đã áp dụng
                </p>
              )}
              {forbiddenCount > 0 && (
                <p className="flex items-center gap-1">
                  <Lock className="h-3 w-3 text-destructive" />
                  {forbiddenCount} từ cấm ngành đã được lọc
                </p>
              )}
              {claimCount > 0 && (
                <p className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-amber-500" />
                  {claimCount} tuyên bố bị hạn chế
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  // Pre-generate variant
  return (
    <div className={`p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800 ${className}`}>
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        <span className="font-medium text-sm text-blue-700 dark:text-blue-300">
          Industry rules applied
        </span>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <span className="text-sm text-blue-600 dark:text-blue-400">
          {industryMemory.name} – {countryName} (v{industryMemory.version})
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-4 w-4 text-blue-400 cursor-help" />
          </TooltipTrigger>
          <TooltipContent className="max-w-sm">
            <div className="space-y-2 text-xs">
              <p className="font-medium">🔒 Industry Rules (Quy tắc ngành)</p>
              {complianceCount > 0 && (
                <div>
                  <p className="text-muted-foreground">Quy tắc tuân thủ:</p>
                  <ul className="list-disc list-inside">
                    {industryMemory.compliance_rules.slice(0, 3).map((rule, i) => (
                      <li key={i} className="truncate">{rule}</li>
                    ))}
                    {complianceCount > 3 && (
                      <li className="text-primary">+{complianceCount - 3} quy tắc khác</li>
                    )}
                  </ul>
                </div>
              )}
              {forbiddenCount > 0 && (
                <p className="text-destructive">
                  ⛔ {forbiddenCount} từ cấm ngành
                </p>
              )}
              {claimCount > 0 && (
                <p className="text-amber-500">
                  ⚠️ {claimCount} tuyên bố bị hạn chế
                </p>
              )}
              <p className="text-muted-foreground italic">
                Target: {industryMemory.target_audience}
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
