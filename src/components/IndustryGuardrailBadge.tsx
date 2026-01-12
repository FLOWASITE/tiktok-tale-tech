import { ShieldCheck, Info, Lock, AlertTriangle, AlertCircle, ArrowUp, Globe } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { IndustryMemory } from '@/hooks/useIndustryMemory';

// Helper to get jurisdiction display name
const getJurisdictionName = (code: string): string => {
  const names: Record<string, string> = {
    VN: 'Việt Nam',
    SG: 'Singapore',
    TH: 'Thailand',
    ID: 'Indonesia',
    US: 'United States',
    EU: 'European Union',
    MY: 'Malaysia',
    PH: 'Philippines',
  };
  return names[code] || code;
};

interface IndustryGuardrailBadgeProps {
  industryMemory: IndustryMemory | null;
  isLoading?: boolean;
  countryName?: string;
  className?: string;
  /** Content's industry template version for comparison */
  contentVersion?: string;
  /** Show upgrade warning if versions differ */
  showVersionWarning?: boolean;
  /** Callback when upgrade is requested */
  onUpgrade?: () => void;
  /** Show v2.1 jurisdiction info */
  showJurisdiction?: boolean;
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
  contentVersion,
  showVersionWarning = true,
  onUpgrade,
  showJurisdiction = true,
}: IndustryGuardrailBadgeProps) {
  // Determine jurisdiction display
  const jurisdictionCode = industryMemory?.jurisdiction_code;
  const isV2Source = industryMemory?._source === 'v2.1';
  const displayCountry = jurisdictionCode 
    ? getJurisdictionName(jurisdictionCode) 
    : countryName;
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

  // Check if content version is outdated
  const isOutdated = contentVersion && contentVersion !== industryMemory.version;

  return (
    <TooltipProvider>
      <div className={`flex items-center gap-2 flex-wrap ${className}`}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 cursor-help">
              <ShieldCheck className="h-4 w-4" />
              <span className="font-medium">Generated under</span>
              <Badge 
                variant="secondary" 
                className="text-[10px] px-1.5 py-0.5 h-auto bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
              >
                {industryMemory.name} – {displayCountry} (v{contentVersion || industryMemory.version})
                {showJurisdiction && isV2Source && (
                  <Globe className="h-3 w-3 ml-1 inline" />
                )}
              </Badge>
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-sm" side="bottom">
            <div className="space-y-2 text-xs">
              <p className="font-semibold flex items-center gap-1.5 text-emerald-500">
                <ShieldCheck className="h-3.5 w-3.5" />
                Industry Rules đã được áp dụng
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

        {/* Version outdated warning */}
        {showVersionWarning && isOutdated && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5">
                <Badge 
                  variant="outline" 
                  className="text-[10px] px-1.5 py-0.5 text-amber-600 border-amber-500/30 bg-amber-500/10"
                >
                  <AlertCircle className="w-3 h-3 mr-1" />
                  v{industryMemory.version} available
                </Badge>
                {onUpgrade && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onUpgrade}
                    className="h-5 text-[10px] px-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-500/10"
                  >
                    <ArrowUp className="w-3 h-3 mr-0.5" />
                    Upgrade
                  </Button>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">
                Phiên bản mới v{industryMemory.version} đã có sẵn. 
                <br />
                Edit content để áp dụng quy tắc mới.
              </p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
