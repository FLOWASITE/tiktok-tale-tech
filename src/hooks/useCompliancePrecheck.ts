/**
 * Hook for pre-generation compliance checking
 * Phase 2: Pre-generation Compliance Check
 */

import { useCallback, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ComplianceIssue {
  type: 'forbidden_term' | 'claim_restriction' | 'category_prohibited' | 'tone_mismatch';
  term: string;
  reason: string;
  severity: 'error' | 'warning';
  suggestion?: string;
}

export interface PreCheckResult {
  passed: boolean;
  issues: ComplianceIssue[];
  suggestedTopic?: string;
  riskLevel: 'low' | 'medium' | 'high' | 'blocked';
}

// Vietnamese diacritics normalization for matching
function normalizeVietnamese(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Check if topic contains forbidden term (with fuzzy matching)
function containsForbiddenTerm(topic: string, term: string): boolean {
  const normalizedTopic = normalizeVietnamese(topic);
  const normalizedTerm = normalizeVietnamese(term);
  
  // Exact word boundary match
  try {
    const wordBoundaryRegex = new RegExp(`\\b${escapeRegex(normalizedTerm)}\\b`, 'i');
    if (wordBoundaryRegex.test(normalizedTopic)) {
      return true;
    }
    
    // Check original (with diacritics) as well
    const originalWordBoundaryRegex = new RegExp(`\\b${escapeRegex(term.toLowerCase())}\\b`, 'i');
    if (originalWordBoundaryRegex.test(topic.toLowerCase())) {
      return true;
    }
  } catch {
    // Fallback to simple includes if regex fails
    return normalizedTopic.includes(normalizedTerm) || topic.toLowerCase().includes(term.toLowerCase());
  }
  
  return false;
}

export interface UseCompliancePrecheckOptions {
  industryForbiddenTerms?: string[];
  industryClaimRestrictions?: string[];
  industryForbiddenPatterns?: string[];
  brandForbiddenWords?: string[];
  brandComplianceRules?: string[];
}

export function useCompliancePrecheck(options: UseCompliancePrecheckOptions = {}) {
  const [isChecking, setIsChecking] = useState(false);
  const [lastResult, setLastResult] = useState<PreCheckResult | null>(null);

  // Memoize forbidden terms for quick check
  const allForbiddenTerms = useMemo(() => {
    const terms = new Set<string>();
    options.industryForbiddenTerms?.forEach(t => terms.add(t));
    options.brandForbiddenWords?.forEach(t => terms.add(t));
    return Array.from(terms);
  }, [options.industryForbiddenTerms, options.brandForbiddenWords]);

  /**
   * Quick check for real-time validation (no AI, just regex)
   */
  const quickCheck = useCallback((topic: string): { hasIssues: boolean; terms: string[] } => {
    const foundTerms: string[] = [];
    
    for (const term of allForbiddenTerms) {
      if (containsForbiddenTerm(topic, term)) {
        foundTerms.push(term);
      }
    }

    return {
      hasIssues: foundTerms.length > 0,
      terms: foundTerms,
    };
  }, [allForbiddenTerms]);

  /**
   * Full compliance check with all rules
   */
  const fullCheck = useCallback((topic: string): PreCheckResult => {
    const issues: ComplianceIssue[] = [];
    
    if (!topic || topic.trim().length === 0) {
      return { passed: true, issues: [], riskLevel: 'low' };
    }

    // 1. Check industry forbidden terms (CRITICAL - blocked)
    if (options.industryForbiddenTerms?.length) {
      for (const term of options.industryForbiddenTerms) {
        if (containsForbiddenTerm(topic, term)) {
          issues.push({
            type: 'forbidden_term',
            term,
            reason: `Từ "${term}" bị cấm trong ngành này`,
            severity: 'error',
            suggestion: `Thay thế "${term}" bằng từ ngữ an toàn hơn`,
          });
        }
      }
    }

    // 2. Check brand forbidden words
    if (options.brandForbiddenWords?.length) {
      for (const term of options.brandForbiddenWords) {
        if (containsForbiddenTerm(topic, term)) {
          issues.push({
            type: 'forbidden_term',
            term,
            reason: `Từ "${term}" không phù hợp với brand voice`,
            severity: 'warning',
            suggestion: `Cân nhắc thay thế "${term}"`,
          });
        }
      }
    }

    // 3. Check claim restrictions
    if (options.industryClaimRestrictions?.length) {
      for (const restriction of options.industryClaimRestrictions) {
        const restrictionWords = restriction.toLowerCase().split(/\s+/).filter(w => w.length > 2);
        const matchCount = restrictionWords.filter(word => topic.toLowerCase().includes(word)).length;
        
        if (restrictionWords.length > 0 && matchCount / restrictionWords.length > 0.5) {
          issues.push({
            type: 'claim_restriction',
            term: restriction,
            reason: `Topic có thể vi phạm quy định: "${restriction}"`,
            severity: 'warning',
            suggestion: `Điều chỉnh topic để tránh claim quá mạnh`,
          });
        }
      }
    }

    // 4. Check forbidden argument patterns
    if (options.industryForbiddenPatterns?.length) {
      for (const pattern of options.industryForbiddenPatterns) {
        if (topic.toLowerCase().includes(pattern.toLowerCase())) {
          issues.push({
            type: 'category_prohibited',
            term: pattern,
            reason: `Lập luận "${pattern}" bị cấm sử dụng`,
            severity: 'error',
            suggestion: `Thay đổi cách tiếp cận topic`,
          });
        }
      }
    }

    // Calculate risk level
    const errorCount = issues.filter(i => i.severity === 'error').length;
    const warningCount = issues.filter(i => i.severity === 'warning').length;
    
    let riskLevel: PreCheckResult['riskLevel'];
    if (errorCount > 0) {
      riskLevel = 'blocked';
    } else if (warningCount >= 2) {
      riskLevel = 'high';
    } else if (warningCount === 1) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'low';
    }

    const result: PreCheckResult = {
      passed: errorCount === 0,
      issues,
      riskLevel,
    };

    setLastResult(result);
    return result;
  }, [options]);

  /**
   * Get AI-suggested compliant topic
   */
  const suggestCompliantTopic = useCallback(async (
    topic: string,
    issues: ComplianceIssue[]
  ): Promise<string | null> => {
    if (issues.length === 0) return null;

    setIsChecking(true);

    try {
      const { data, error } = await supabase.functions.invoke('topic-ai', {
        body: {
          action: 'suggest_compliant',
          topic,
          issues: issues.map(i => ({ type: i.type, term: i.term, reason: i.reason })),
        },
      });

      if (error) {
        console.error('Error suggesting compliant topic:', error);
        return null;
      }

      return data?.suggestedTopic || null;
    } catch (error) {
      console.error('Error suggesting compliant topic:', error);
      return null;
    } finally {
      setIsChecking(false);
    }
  }, []);

  return {
    quickCheck,
    fullCheck,
    suggestCompliantTopic,
    isChecking,
    lastResult,
    allForbiddenTerms,
  };
}
