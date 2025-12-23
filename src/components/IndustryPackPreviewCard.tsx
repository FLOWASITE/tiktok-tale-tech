import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  ShieldCheck, 
  Lock, 
  AlertTriangle, 
  CheckCircle2, 
  Users, 
  Building2,
  Eye,
  ArrowRight
} from 'lucide-react';
import { IndustryMemory } from '@/hooks/useIndustryMemory';
import { cn } from '@/lib/utils';

interface IndustryPackPreviewCardProps {
  industryMemory: IndustryMemory;
  countryName?: string;
  flagEmoji?: string;
  onSelect?: () => void;
  onViewDetails?: () => void;
  isSelected?: boolean;
  className?: string;
}

const MAX_VISIBLE_TERMS = 5;

/**
 * Full preview card showing Industry Memory Pack details
 * Used when hovering/clicking on pack in selector
 */
export function IndustryPackPreviewCard({
  industryMemory,
  countryName = 'Việt Nam',
  flagEmoji = '🇻🇳',
  onSelect,
  onViewDetails,
  isSelected = false,
  className,
}: IndustryPackPreviewCardProps) {
  const forbiddenTerms = industryMemory.forbidden_terms || [];
  const complianceRules = industryMemory.compliance_rules || [];
  const claimRestrictions = industryMemory.claim_restrictions || [];
  const brandVoice = industryMemory.brand_voice || {};

  const visibleTerms = forbiddenTerms.slice(0, MAX_VISIBLE_TERMS);
  const remainingTermsCount = forbiddenTerms.length - MAX_VISIBLE_TERMS;

  const targetAudienceLabel = {
    'B2B': 'Doanh nghiệp (B2B)',
    'B2C': 'Người tiêu dùng (B2C)',
    'both': 'Cả B2B & B2C',
  }[industryMemory.target_audience] || industryMemory.target_audience;

  return (
    <Card className={cn(
      "overflow-hidden transition-all",
      isSelected && "ring-2 ring-primary border-primary",
      className
    )}>
      {/* Header */}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2">
              {industryMemory.name}
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-normal">
                {flagEmoji} {countryName}
              </Badge>
              <Badge variant="secondary" className="text-xs font-mono">
                v{industryMemory.version}
              </Badge>
              <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                Stable
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Target Audience */}
        <div className="flex items-center gap-2 text-sm">
          {industryMemory.target_audience === 'B2B' ? (
            <Building2 className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Users className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-muted-foreground">Đối tượng:</span>
          <span className="font-medium">{targetAudienceLabel}</span>
        </div>

        <Separator />

        {/* Forbidden Terms (LOCKED) */}
        {forbiddenTerms.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium text-destructive">TỪ CẤM NGÀNH (LOCKED)</span>
            </div>
            <div className="p-2.5 rounded-lg bg-destructive/5 border border-destructive/20">
              <div className="flex flex-wrap gap-1.5">
                {visibleTerms.map((term, idx) => (
                  <Badge 
                    key={idx} 
                    variant="outline" 
                    className="text-xs bg-background border-destructive/30 text-destructive"
                  >
                    {term}
                  </Badge>
                ))}
                {remainingTermsCount > 0 && (
                  <Badge 
                    variant="outline" 
                    className="text-xs bg-muted text-muted-foreground"
                  >
                    …và {remainingTermsCount} từ khác
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Compliance Rules */}
        {complianceRules.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">COMPLIANCE RULES</span>
            </div>
            <ul className="space-y-1 pl-6 text-sm text-muted-foreground">
              {complianceRules.slice(0, 3).map((rule, idx) => (
                <li key={idx} className="list-disc">{rule}</li>
              ))}
              {complianceRules.length > 3 && (
                <li className="list-disc text-muted-foreground/70">
                  …và {complianceRules.length - 3} quy tắc khác
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Claim Restrictions */}
        {claimRestrictions.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium text-amber-600 dark:text-amber-400">CLAIM RESTRICTIONS</span>
            </div>
            <ul className="space-y-1 pl-6 text-sm text-muted-foreground">
              {claimRestrictions.slice(0, 2).map((claim, idx) => (
                <li key={idx} className="list-disc">{claim}</li>
              ))}
              {claimRestrictions.length > 2 && (
                <li className="list-disc text-muted-foreground/70">
                  …và {claimRestrictions.length - 2} hạn chế khác
                </li>
              )}
            </ul>
          </div>
        )}

        <Separator />

        {/* Brand Voice Suggestions */}
        <div className="space-y-2">
          <span className="text-sm font-medium text-muted-foreground">
            🎨 BRAND VOICE GỢI Ý (có thể tùy chỉnh)
          </span>
          <div className="flex flex-wrap gap-1.5">
            {brandVoice.tone_of_voice?.map((tone, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {tone}
              </Badge>
            ))}
            {brandVoice.formality_level && (
              <Badge variant="outline" className="text-xs">
                {brandVoice.formality_level}
              </Badge>
            )}
          </div>
        </div>

        {/* Actions */}
        {(onSelect || onViewDetails) && (
          <>
            <Separator />
            <div className="flex items-center gap-2">
              {onSelect && (
                <Button 
                  onClick={onSelect} 
                  className="flex-1 gap-2"
                  variant={isSelected ? "secondary" : "default"}
                >
                  {isSelected ? 'Đã chọn' : 'Chọn Pack này'}
                  {!isSelected && <ArrowRight className="h-4 w-4" />}
                </Button>
              )}
              {onViewDetails && (
                <Button variant="outline" size="icon" onClick={onViewDetails}>
                  <Eye className="h-4 w-4" />
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
