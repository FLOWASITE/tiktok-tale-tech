import { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { IndustryMemory } from '@/hooks/useIndustryMemory';
import { cn } from '@/lib/utils';

interface ChecklistItem {
  id: string;
  type: 'compliance' | 'forbidden' | 'claim';
  text: string;
  passed: boolean;
  autoChecked?: boolean; // System auto-verified
}

export interface ComplianceResult {
  industry_template_id: string;
  industry_name: string;
  version: string;
  compliance_passed: boolean;
  checklist: ChecklistItem[];
  reviewer_confirmed: boolean;
  rejected_rules: string[];
}

interface IndustryComplianceChecklistProps {
  industryMemory: IndustryMemory;
  countryName?: string;
  contentText?: string; // Optional: for auto-checking forbidden terms
  onComplianceChange?: (result: ComplianceResult) => void;
  isReviewMode?: boolean; // true = reviewer can check items, false = view only
  className?: string;
}

/**
 * Auto-generated compliance checklist for Industry Memory review
 * Used in ApprovalDialog for enterprise-grade compliance workflow
 */
export function IndustryComplianceChecklist({
  industryMemory,
  countryName = 'Việt Nam',
  contentText = '',
  onComplianceChange,
  isReviewMode = false,
  className,
}: IndustryComplianceChecklistProps) {
  const [expanded, setExpanded] = useState(true);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [reviewerConfirmed, setReviewerConfirmed] = useState(false);

  // Initialize checklist from industry memory
  useEffect(() => {
    const items: ChecklistItem[] = [];

    // Add compliance rules
    industryMemory.compliance_rules?.forEach((rule, index) => {
      items.push({
        id: `compliance-${index}`,
        type: 'compliance',
        text: typeof rule === 'string' ? rule : (rule as any).rule || String(rule),
        passed: false,
        autoChecked: false,
      });
    });

    // Add forbidden terms check (auto-verify against content)
    industryMemory.forbidden_terms?.forEach((term, index) => {
      const termLower = term.toLowerCase();
      const contentLower = contentText.toLowerCase();
      const found = contentLower.includes(termLower);
      
      items.push({
        id: `forbidden-${index}`,
        type: 'forbidden',
        text: `"${term}" - ${found ? 'FOUND IN CONTENT' : 'NOT FOUND'}`,
        passed: !found, // Pass if NOT found
        autoChecked: true,
      });
    });

    // Add claim restrictions
    industryMemory.claim_restrictions?.forEach((claim, index) => {
      items.push({
        id: `claim-${index}`,
        type: 'claim',
        text: typeof claim === 'string' ? claim : (claim as any).claim || String(claim),
        passed: false,
        autoChecked: false,
      });
    });

    setChecklist(items);
  }, [industryMemory, contentText]);

  // Calculate stats
  const complianceItems = checklist.filter(i => i.type === 'compliance');
  const forbiddenItems = checklist.filter(i => i.type === 'forbidden');
  const claimItems = checklist.filter(i => i.type === 'claim');

  const compliancePassed = complianceItems.filter(i => i.passed).length;
  const forbiddenPassed = forbiddenItems.filter(i => i.passed).length;
  const claimsPassed = claimItems.filter(i => i.passed).length;

  const allPassed = checklist.every(i => i.passed);
  const failedItems = checklist.filter(i => !i.passed);

  // Update parent when checklist changes
  useEffect(() => {
    if (onComplianceChange) {
      onComplianceChange({
        industry_template_id: industryMemory.id,
        industry_name: industryMemory.name,
        version: industryMemory.version,
        compliance_passed: allPassed && reviewerConfirmed,
        checklist,
        reviewer_confirmed: reviewerConfirmed,
        rejected_rules: failedItems.map(i => i.text),
      });
    }
  }, [checklist, reviewerConfirmed, allPassed]);

  const handleItemToggle = (itemId: string, checked: boolean) => {
    if (!isReviewMode) return;
    
    setChecklist(prev => 
      prev.map(item => 
        item.id === itemId ? { ...item, passed: checked } : item
      )
    );
  };

  const renderChecklistSection = (
    title: string,
    icon: typeof ShieldCheck,
    items: ChecklistItem[],
    passedCount: number,
    iconColor: string,
    bgColor: string
  ) => {
    const Icon = icon;
    if (items.length === 0) return null;

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${iconColor}`} />
          <span className="text-sm font-medium">{title}</span>
          <Badge 
            variant="outline" 
            className={cn(
              'text-[10px] px-1.5 py-0',
              passedCount === items.length 
                ? 'text-emerald-600 border-emerald-500/30' 
                : 'text-amber-600 border-amber-500/30'
            )}
          >
            {passedCount}/{items.length}
          </Badge>
        </div>
        <div className={`rounded-lg p-2 space-y-1.5 ${bgColor}`}>
          {items.map((item) => (
            <div 
              key={item.id}
              className={cn(
                'flex items-start gap-2 p-1.5 rounded',
                item.passed ? 'bg-emerald-500/10' : 'bg-amber-500/10'
              )}
            >
              {isReviewMode && !item.autoChecked ? (
                <Checkbox
                  id={item.id}
                  checked={item.passed}
                  onCheckedChange={(checked) => handleItemToggle(item.id, !!checked)}
                  className="mt-0.5"
                />
              ) : (
                item.passed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                )
              )}
              <Label 
                htmlFor={item.id}
                className={cn(
                  'text-xs cursor-pointer flex-1',
                  item.passed ? 'text-muted-foreground' : 'text-foreground font-medium'
                )}
              >
                {item.text}
                {item.autoChecked && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3 h-3 inline ml-1 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Auto-verified by system</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </Label>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={cn('border rounded-lg overflow-hidden', className)}>
      {/* Header */}
      <div 
        className="flex items-center justify-between p-3 bg-muted/50 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <div className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center',
            allPassed ? 'bg-emerald-500/15' : 'bg-amber-500/15'
          )}>
            <ShieldCheck className={cn(
              'w-4 h-4',
              allPassed ? 'text-emerald-500' : 'text-amber-500'
            )} />
          </div>
          <div>
            <h4 className="text-sm font-semibold flex items-center gap-2">
              Industry Compliance Review
              <Badge 
                variant="secondary" 
                className="text-[10px] px-1.5 py-0"
              >
                {industryMemory.name} – {countryName} (v{industryMemory.version})
              </Badge>
            </h4>
            <p className="text-xs text-muted-foreground">
              {allPassed 
                ? '✓ All rules passed' 
                : `⚠ ${failedItems.length} items need attention`
              }
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </div>

      {/* Content */}
      {expanded && (
        <div className="p-3 space-y-4">
          <ScrollArea className="max-h-[300px] pr-2">
            <div className="space-y-4">
              {renderChecklistSection(
                'Compliance Rules Applied',
                ShieldCheck,
                complianceItems,
                compliancePassed,
                'text-emerald-500',
                'bg-emerald-500/5'
              )}

              {renderChecklistSection(
                'Forbidden Terms Checked',
                Lock,
                forbiddenItems,
                forbiddenPassed,
                'text-destructive',
                'bg-destructive/5'
              )}

              {renderChecklistSection(
                'Claim Restrictions',
                AlertTriangle,
                claimItems,
                claimsPassed,
                'text-amber-500',
                'bg-amber-500/5'
              )}
            </div>
          </ScrollArea>

          {/* Reviewer confirmation */}
          {isReviewMode && (
            <div className={cn(
              'pt-3 border-t',
              reviewerConfirmed 
                ? 'border-emerald-500/30' 
                : 'border-border'
            )}>
              <div className="flex items-start gap-2">
                <Checkbox
                  id="reviewer-confirm"
                  checked={reviewerConfirmed}
                  onCheckedChange={(checked) => setReviewerConfirmed(!!checked)}
                  disabled={!allPassed}
                />
                <div className="space-y-1">
                  <Label 
                    htmlFor="reviewer-confirm"
                    className={cn(
                      'text-sm font-medium cursor-pointer',
                      !allPassed && 'text-muted-foreground'
                    )}
                  >
                    Tôi đã xác nhận nội dung tuân thủ Industry Rules
                  </Label>
                  {!allPassed && (
                    <p className="text-xs text-destructive">
                      Vui lòng check tất cả các quy tắc trước khi xác nhận
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
