/**
 * IndustryComplianceChecklistV2 - Compliance checklist for v2 jurisdiction profiles
 * 
 * Displays compliance rules, forbidden terms, and claim restrictions
 * from resolved jurisdiction rules with auto-verification.
 */

import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  CheckCircle2, 
  XCircle, 
  ChevronDown, 
  AlertTriangle,
  ShieldCheck,
  Ban,
  Scale,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ResolvedRules, ComplianceRule, ClaimRestriction } from '@/types/industryParkV2';

// ============== TYPES ==============

interface ChecklistItem {
  id: string;
  type: 'compliance' | 'forbidden' | 'claim';
  text: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  passed: boolean | null; // null = unchecked
  alternative?: string;
}

interface ComplianceResult {
  industryCode: string;
  jurisdictionCode: string;
  checklistItems: ChecklistItem[];
  allPassed: boolean;
  reviewerConfirmed: boolean;
}

interface IndustryComplianceChecklistV2Props {
  resolvedRules: ResolvedRules;
  contentText?: string;
  onComplianceChange?: (result: ComplianceResult) => void;
  isReviewMode?: boolean;
  className?: string;
}

// ============== HELPERS ==============

function containsTerm(content: string, term: string): boolean {
  if (!content || !term) return false;
  const normalizedContent = content.toLowerCase();
  const normalizedTerm = term.toLowerCase();
  return normalizedContent.includes(normalizedTerm);
}

// ============== COMPONENT ==============

export function IndustryComplianceChecklistV2({
  resolvedRules,
  contentText = '',
  onComplianceChange,
  isReviewMode = false,
  className,
}: IndustryComplianceChecklistV2Props) {
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [reviewerConfirmed, setReviewerConfirmed] = useState(false);

  // Build checklist from resolved rules
  useEffect(() => {
    const items: ChecklistItem[] = [];

    // 1. Compliance rules
    resolvedRules.compliance_rules.forEach((rule, idx) => {
      items.push({
        id: `compliance-${idx}`,
        type: 'compliance',
        text: typeof rule === 'string' ? rule : rule.rule,
        severity: typeof rule === 'object' ? rule.severity : undefined,
        passed: null,
      });
    });

    // 2. Forbidden terms (auto-check against content)
    const allForbidden = [
      ...resolvedRules.terminology.forbidden_terms,
      ...resolvedRules.terminology.forbidden_words_local,
    ];
    
    allForbidden.forEach((term, idx) => {
      const found = contentText ? containsTerm(contentText, term) : null;
      items.push({
        id: `forbidden-${idx}`,
        type: 'forbidden',
        text: term,
        severity: 'critical',
        passed: found === null ? null : !found, // passed if NOT found
      });
    });

    // 3. Claim restrictions (auto-check against content)
    resolvedRules.claim_restrictions.forEach((restriction, idx) => {
      const found = contentText ? containsTerm(contentText, restriction.claim) : null;
      items.push({
        id: `claim-${idx}`,
        type: 'claim',
        text: restriction.claim,
        severity: restriction.severity || 'high',
        passed: found === null ? null : !found,
        alternative: restriction.alternative,
      });
    });

    setChecklist(items);
  }, [resolvedRules, contentText]);

  // Notify parent of changes
  useEffect(() => {
    if (onComplianceChange) {
      const allPassed = checklist.every(item => item.passed === true);
      onComplianceChange({
        industryCode: resolvedRules.industry_code,
        jurisdictionCode: resolvedRules.jurisdiction_code,
        checklistItems: checklist,
        allPassed,
        reviewerConfirmed,
      });
    }
  }, [checklist, reviewerConfirmed, resolvedRules, onComplianceChange]);

  // Toggle item
  const handleItemToggle = useCallback((id: string) => {
    if (!isReviewMode) return;
    
    setChecklist(prev => prev.map(item => 
      item.id === id 
        ? { ...item, passed: item.passed === true ? false : true }
        : item
    ));
  }, [isReviewMode]);

  // Auto-verify all
  const handleAutoVerify = useCallback(() => {
    setChecklist(prev => prev.map(item => {
      if (item.type === 'forbidden' || item.type === 'claim') {
        const found = contentText ? containsTerm(contentText, item.text) : false;
        return { ...item, passed: !found };
      }
      return item;
    }));
  }, [contentText]);

  // Summary counts
  const complianceItems = checklist.filter(i => i.type === 'compliance');
  const forbiddenItems = checklist.filter(i => i.type === 'forbidden');
  const claimItems = checklist.filter(i => i.type === 'claim');
  
  const passedCount = checklist.filter(i => i.passed === true).length;
  const failedCount = checklist.filter(i => i.passed === false).length;
  const uncheckedCount = checklist.filter(i => i.passed === null).length;
  const allPassed = failedCount === 0 && uncheckedCount === 0;

  // Render section
  const renderSection = (
    title: string,
    icon: typeof ShieldCheck,
    items: ChecklistItem[],
    colorClass: string
  ) => {
    if (items.length === 0) return null;
    
    const Icon = icon;
    const sectionPassed = items.filter(i => i.passed === true).length;
    const sectionFailed = items.filter(i => i.passed === false).length;
    
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Icon className={cn("h-4 w-4", colorClass)} />
          <span>{title}</span>
          <Badge variant="outline" className="ml-auto text-xs">
            {sectionPassed}/{items.length}
          </Badge>
        </div>
        <div className="space-y-1 pl-6">
          {items.map(item => (
            <div 
              key={item.id}
              className={cn(
                "flex items-start gap-2 p-2 rounded text-sm",
                item.passed === false && "bg-red-50 dark:bg-red-950/20",
                item.passed === true && "bg-green-50 dark:bg-green-950/20",
                item.passed === null && "bg-muted/50",
              )}
            >
              <Checkbox
                id={item.id}
                checked={item.passed === true}
                disabled={!isReviewMode}
                onCheckedChange={() => handleItemToggle(item.id)}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <label 
                  htmlFor={item.id}
                  className={cn(
                    "cursor-pointer",
                    item.passed === false && "text-red-700 dark:text-red-400",
                    item.passed === true && "text-green-700 dark:text-green-400 line-through",
                  )}
                >
                  {item.text}
                </label>
                {item.alternative && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    💡 Thay bằng: {item.alternative}
                  </p>
                )}
              </div>
              {item.severity && item.severity !== 'low' && (
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-xs shrink-0",
                    item.severity === 'critical' && "border-red-500 text-red-500",
                    item.severity === 'high' && "border-orange-500 text-orange-500",
                    item.severity === 'medium' && "border-yellow-500 text-yellow-500",
                  )}
                >
                  {item.severity}
                </Badge>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Collapsible 
      open={isOpen} 
      onOpenChange={setIsOpen}
      className={cn("border rounded-lg", className)}
    >
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between p-4 h-auto"
        >
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-full",
              allPassed ? "bg-green-100 dark:bg-green-900/30" : "bg-yellow-100 dark:bg-yellow-900/30"
            )}>
              {allPassed ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              )}
            </div>
            <div className="text-left">
              <p className="font-medium">
                Compliance Checklist - {resolvedRules.names?.vi || resolvedRules.industry_code}
              </p>
              <p className="text-sm text-muted-foreground">
                {resolvedRules.jurisdiction_code} • {passedCount} đạt, {failedCount} vi phạm, {uncheckedCount} chưa kiểm
              </p>
            </div>
          </div>
          <ChevronDown className={cn(
            "h-5 w-5 transition-transform",
            isOpen && "rotate-180"
          )} />
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <div className="p-4 pt-0 space-y-4">
          {/* Auto-verify button */}
          {contentText && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAutoVerify}
              >
                <RefreshCw className="h-3 w-3 mr-2" />
                Tự động kiểm tra
              </Button>
            </div>
          )}

          {/* Sections */}
          {renderSection('Quy định tuân thủ', ShieldCheck, complianceItems, 'text-blue-500')}
          {renderSection('Từ ngữ cấm', Ban, forbiddenItems, 'text-red-500')}
          {renderSection('Giới hạn claim', Scale, claimItems, 'text-orange-500')}

          {/* Reviewer confirmation */}
          {isReviewMode && (
            <div className="pt-4 border-t">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="reviewer-confirm"
                  checked={reviewerConfirmed}
                  onCheckedChange={(checked) => setReviewerConfirmed(checked === true)}
                  disabled={!allPassed}
                />
                <label 
                  htmlFor="reviewer-confirm"
                  className={cn(
                    "text-sm",
                    !allPassed && "text-muted-foreground"
                  )}
                >
                  Tôi xác nhận đã kiểm tra và nội dung tuân thủ tất cả quy định
                </label>
              </div>
              {!allPassed && (
                <p className="text-xs text-muted-foreground mt-1 pl-6">
                  Vui lòng giải quyết tất cả vi phạm trước khi xác nhận
                </p>
              )}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
