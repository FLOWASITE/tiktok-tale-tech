import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  checkPolicies, 
  generateComplianceReport,
  PolicyCheckResult,
  ComplianceReport,
  PolicyIssue
} from '@/types/adCopyPolicy';
import type { AdCopyVariation } from '@/types/adCopy';

interface FixSuggestion {
  suggestion: string;
  explanation: string;
}

export function useAdCopyPolicyChecker() {
  const { toast } = useToast();
  const [isChecking, setIsChecking] = useState(false);
  const [isSuggestingFix, setIsSuggestingFix] = useState(false);

  // Check single field
  const checkField = useCallback((
    text: string,
    field: string,
    platform: string
  ): PolicyCheckResult => {
    return checkPolicies(text, field, platform);
  }, []);

  // Generate full report for all variations
  const generateReport = useCallback((
    variations: AdCopyVariation[],
    platform: string
  ): ComplianceReport => {
    setIsChecking(true);
    
    const variationData = variations.map(v => ({
      primary_text: v.primary_text || undefined,
      headline: v.headline || undefined,
      description: v.description || undefined,
    }));
    
    const report = generateComplianceReport(variationData, platform);
    setIsChecking(false);
    
    return report;
  }, []);

  // Get AI fix suggestion
  const suggestFix = useCallback(async (
    text: string,
    field: string,
    platform: string,
    issues: PolicyIssue[]
  ): Promise<FixSuggestion | null> => {
    if (!text || issues.length === 0) return null;
    
    setIsSuggestingFix(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('suggest-ad-fix', {
        body: {
          text,
          field,
          platform,
          issues: issues.map(i => ({
            ruleId: i.ruleId,
            ruleName: i.ruleName,
            message: i.message,
            severity: i.severity,
            fixHint: i.fixHint,
          })),
        },
      });
      
      if (error) throw error;
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      return {
        suggestion: data.suggestion,
        explanation: data.explanation,
      };
    } catch (error) {
      console.error('Suggest fix error:', error);
      const message = error instanceof Error ? error.message : 'Không thể tạo gợi ý';
      toast({
        title: 'Lỗi AI',
        description: message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsSuggestingFix(false);
    }
  }, [toast]);

  return {
    checkField,
    generateReport,
    suggestFix,
    isChecking,
    isSuggestingFix,
  };
}
