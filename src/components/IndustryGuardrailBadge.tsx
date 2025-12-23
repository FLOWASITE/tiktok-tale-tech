import { ShieldCheck, Info, Lock, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { IndustryMemory } from '@/hooks/useIndustryMemory';

interface IndustryGuardrailBadgeProps {
  industryMemory: IndustryMemory | null;
  isLoading?: boolean;
  countryName?: string;
  className?: string;
}

/**
 * Post-generate proof badge showing content was generated under Industry Memory
 * Displayed in Viewers (MultiChannel, Carousel, Script) after content generation
 */
export function IndustryGuardrailBadge({
  industryMemory,
  isLoading = false,
  countryName = 'Việt Nam',
  className,
}: IndustryGuardrailBadgeProps) {
  if (isLoading) {
    return (
      <div className={`flex items-center gap-1.5 animate-pulse ${className}`}>
        <div className="h-4 w-4 rounded bg-muted" />
        <div className="h-4 w-24 rounded bg-muted" />
      </div>
    );
  }

  if (!industryMemory) {
    return null; // Don't show anything if no industry memory
  }

  const complianceCount = industryMemory.compliance_rules?.length || 0;
  const forbiddenCount = industryMemory.forbidden_terms?.length || 0;
  const claimCount = industryMemory.claim_restrictions?.length || 0;

  return (
    <TooltipProvider>
      <div className={`flex items-center gap-2 ${className}`}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 cursor-help">
              <ShieldCheck className="h-4 w-4" />
              <span className="font-medium">Generated under</span>
              <Badge 
                variant="secondary" 
                className="text-[10px] px-1.5 py-0.5 h-auto bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
              >
                {industryMemory.name} – {countryName} (v{industryMemory.version})
              </Badge>
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-sm" side="bottom">
            <div className="space-y-2 text-xs">
              <p className="font-semibold flex items-center gap-1.5 text-emerald-500">
                <ShieldCheck className="h-3.5 w-3.5" />
                Industry Memory đã được áp dụng
              </p>
              <div className="space-y-1">
                {complianceCount > 0 && (
                  <p className="flex items-center gap-1.5">
                    <ShieldCheck className="h-3 w-3 text-emerald-500" />
                    <span>{complianceCount} quy tắc tuân thủ đã áp dụng</span>
                  </p>
                )}
                {forbiddenCount > 0 && (
                  <p className="flex items-center gap-1.5">
                    <Lock className="h-3 w-3 text-destructive" />
                    <span>{forbiddenCount} từ cấm ngành đã được lọc</span>
                  </p>
                )}
                {claimCount > 0 && (
                  <p className="flex items-center gap-1.5">
                    <AlertTriangle className="h-3 w-3 text-amber-500" />
                    <span>{claimCount} tuyên bố bị hạn chế</span>
                  </p>
                )}
              </div>
              <p className="text-muted-foreground pt-1 border-t border-border/50 italic">
                Nội dung này tuân thủ quy tắc ngành {industryMemory.name}
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
