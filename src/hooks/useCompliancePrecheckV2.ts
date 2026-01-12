/**
 * useCompliancePrecheckV2 - Pre-generation compliance checking
 * 
 * Uses resolved rules from jurisdiction profiles to validate topics
 * BEFORE content generation, preventing wasted API calls.
 */

import { useCallback, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useResolvedRules } from './useJurisdictionProfile';
import type { ResolvedRules, RiskLevel } from '@/types/industryParkV2';

// ============== TYPES ==============

export interface ComplianceIssue {
  type: 'forbidden_term' | 'claim_restriction' | 'forbidden_pattern' | 'high_risk_keyword';
  term: string;
  reason: string;
  severity: 'error' | 'warning';
  suggestion?: string;
  alternative?: string;
}

export interface PreCheckResult {
  passed: boolean;
  issues: ComplianceIssue[];
  suggestedTopic?: string;
  riskLevel: RiskLevel;
  riskScore: number;
}

// ============== HELPERS ==============

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

function containsForbiddenTerm(topic: string, term: string): boolean {
  const normalizedTopic = normalizeVietnamese(topic);
  const normalizedTerm = normalizeVietnamese(term);
  
  try {
    const wordBoundaryRegex = new RegExp(`\\b${escapeRegex(normalizedTerm)}\\b`, 'i');
    if (wordBoundaryRegex.test(normalizedTopic)) return true;
    
    const originalRegex = new RegExp(`\\b${escapeRegex(term.toLowerCase())}\\b`, 'i');
    if (originalRegex.test(topic.toLowerCase())) return true;
  } catch {
    return normalizedTopic.includes(normalizedTerm);
  }
  
  return false;
}

// ============== SCORING ==============

const DEFAULT_WEIGHTS = {
  forbidden_term_match: 50,
  forbidden_pattern_match: 30,
  claim_restriction_match: 20,
  high_risk_keyword_match: 15,
};

const DEFAULT_THRESHOLDS = {
  low: 0,
  medium: 30,
  high: 60,
  blocked: 80,
};

function calculateRiskLevel(score: number, thresholds: typeof DEFAULT_THRESHOLDS): RiskLevel {
  if (score >= thresholds.blocked) return 'blocked';
  if (score >= thresholds.high) return 'high';
  if (score >= thresholds.medium) return 'medium';
  return 'low';
}

// ============== MAIN HOOK ==============

/**
 * Pre-generation compliance precheck hook using v2 jurisdiction profiles
 */
export function useCompliancePrecheckV2(
  brandTemplateId: string | null | undefined,
  jurisdictionCode: string = 'VN'
) {
  const [isChecking, setIsChecking] = useState(false);
  const [lastResult, setLastResult] = useState<PreCheckResult | null>(null);
  
  const { rules, isLoading, error } = useResolvedRules(brandTemplateId, jurisdictionCode);

  // Memoize weights and thresholds
  const weights = useMemo(() => ({
    ...DEFAULT_WEIGHTS,
    ...(rules?.risk_guidelines?.scoring_weights || {}),
  }), [rules]);

  const thresholds = useMemo(() => ({
    ...DEFAULT_THRESHOLDS,
    ...(rules?.risk_guidelines?.risk_thresholds || {}),
  }), [rules]);

  // All forbidden terms for quick access
  const allForbiddenTerms = useMemo(() => [
    ...(rules?.terminology.forbidden_terms || []),
    ...(rules?.terminology.forbidden_words_local || []),
  ], [rules]);

  /**
   * Quick check - for real-time validation (no scoring, just term matching)
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
   * Full compliance check with risk scoring
   */
  const fullCheck = useCallback((topic: string): PreCheckResult => {
    const issues: ComplianceIssue[] = [];
    let riskScore = 0;
    
    if (!topic || topic.trim().length === 0 || !rules) {
      return { passed: true, issues: [], riskLevel: 'low', riskScore: 0 };
    }

    // 1. Check forbidden terms (CRITICAL - blocked)
    for (const term of rules.terminology.forbidden_terms) {
      if (containsForbiddenTerm(topic, term)) {
        issues.push({
          type: 'forbidden_term',
          term,
          reason: `Từ "${term}" bị cấm trong ngành ${rules.names?.vi || rules.industry_code}`,
          severity: 'error',
          suggestion: `Thay thế "${term}" bằng từ ngữ an toàn hơn`,
        });
        riskScore += weights.forbidden_term_match;
      }
    }

    // 2. Check local forbidden words (CRITICAL - blocked)
    for (const word of rules.terminology.forbidden_words_local) {
      if (containsForbiddenTerm(topic, word)) {
        issues.push({
          type: 'forbidden_term',
          term: word,
          reason: `Từ "${word}" không được sử dụng tại ${rules.jurisdiction_code}`,
          severity: 'error',
          suggestion: `Loại bỏ hoặc thay thế "${word}"`,
        });
        riskScore += weights.forbidden_term_match;
      }
    }

    // 3. Check forbidden patterns (CRITICAL - blocked)
    for (const pattern of rules.argument_patterns.forbidden_patterns) {
      const patternClean = pattern.replace(/\[.*?\]/g, '');
      if (topic.toLowerCase().includes(patternClean.toLowerCase())) {
        issues.push({
          type: 'forbidden_pattern',
          term: pattern,
          reason: `Lập luận "${pattern}" bị cấm sử dụng`,
          severity: 'error',
          suggestion: 'Thay đổi cách tiếp cận topic',
        });
        riskScore += weights.forbidden_pattern_match;
      }
    }

    // 4. Check claim restrictions (warnings with alternatives)
    for (const restriction of rules.claim_restrictions) {
      const claimWords = restriction.claim.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      const matchCount = claimWords.filter(word => topic.toLowerCase().includes(word)).length;
      
      if (claimWords.length > 0 && matchCount / claimWords.length > 0.5) {
        issues.push({
          type: 'claim_restriction',
          term: restriction.claim,
          reason: `Topic có thể vi phạm quy định: "${restriction.claim}"`,
          severity: 'warning',
          suggestion: `Điều chỉnh để tránh claim quá mạnh`,
          alternative: restriction.alternative,
        });
        riskScore += weights.claim_restriction_match;
      }
    }

    // 5. Check high-risk keywords (warnings)
    for (const keyword of rules.risk_guidelines.high_risk_keywords) {
      if (containsForbiddenTerm(topic, keyword)) {
        issues.push({
          type: 'high_risk_keyword',
          term: keyword,
          reason: `Từ khóa "${keyword}" có rủi ro cao`,
          severity: 'warning',
          suggestion: `Cân nhắc thay thế "${keyword}" để giảm rủi ro`,
        });
        riskScore += weights.high_risk_keyword_match;
      }
    }

    const riskLevel = calculateRiskLevel(riskScore, thresholds);
    const errorCount = issues.filter(i => i.severity === 'error').length;

    const result: PreCheckResult = {
      passed: errorCount === 0,
      issues,
      riskLevel,
      riskScore,
    };

    setLastResult(result);
    return result;
  }, [rules, weights, thresholds]);

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
          issues: issues.map(i => ({ 
            type: i.type, 
            term: i.term, 
            reason: i.reason,
            alternative: i.alternative,
          })),
          industryCode: rules?.industry_code,
          jurisdictionCode: rules?.jurisdiction_code,
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
  }, [rules]);

  return {
    quickCheck,
    fullCheck,
    suggestCompliantTopic,
    isChecking,
    isLoading,
    error,
    lastResult,
    allForbiddenTerms,
    rules,
    hasRules: !!rules,
  };
}

/**
 * Standalone precheck function for edge functions
 * Uses resolved rules directly without React hooks
 */
export function preCheckComplianceV2(
  topic: string,
  rules: ResolvedRules
): PreCheckResult {
  const issues: ComplianceIssue[] = [];
  let riskScore = 0;

  const weights = {
    ...DEFAULT_WEIGHTS,
    ...(rules.risk_guidelines?.scoring_weights || {}),
  };

  const thresholds = {
    ...DEFAULT_THRESHOLDS,
    ...(rules.risk_guidelines?.risk_thresholds || {}),
  };

  if (!topic || topic.trim().length === 0) {
    return { passed: true, issues: [], riskLevel: 'low', riskScore: 0 };
  }

  // Check forbidden terms
  for (const term of rules.terminology.forbidden_terms) {
    if (containsForbiddenTerm(topic, term)) {
      issues.push({
        type: 'forbidden_term',
        term,
        reason: `Từ "${term}" bị cấm`,
        severity: 'error',
      });
      riskScore += weights.forbidden_term_match;
    }
  }

  // Check local forbidden words
  for (const word of rules.terminology.forbidden_words_local) {
    if (containsForbiddenTerm(topic, word)) {
      issues.push({
        type: 'forbidden_term',
        term: word,
        reason: `Từ "${word}" không được phép`,
        severity: 'error',
      });
      riskScore += weights.forbidden_term_match;
    }
  }

  // Check forbidden patterns
  for (const pattern of rules.argument_patterns.forbidden_patterns) {
    const patternClean = pattern.replace(/\[.*?\]/g, '');
    if (topic.toLowerCase().includes(patternClean.toLowerCase())) {
      issues.push({
        type: 'forbidden_pattern',
        term: pattern,
        reason: `Pattern "${pattern}" bị cấm`,
        severity: 'error',
      });
      riskScore += weights.forbidden_pattern_match;
    }
  }

  // Check claim restrictions
  for (const restriction of rules.claim_restrictions) {
    const claimLower = restriction.claim.toLowerCase();
    if (topic.toLowerCase().includes(claimLower)) {
      issues.push({
        type: 'claim_restriction',
        term: restriction.claim,
        reason: `Claim vi phạm quy định`,
        severity: 'warning',
        alternative: restriction.alternative,
      });
      riskScore += weights.claim_restriction_match;
    }
  }

  // Check high-risk keywords
  for (const keyword of rules.risk_guidelines.high_risk_keywords) {
    if (containsForbiddenTerm(topic, keyword)) {
      issues.push({
        type: 'high_risk_keyword',
        term: keyword,
        reason: `Từ khóa rủi ro cao`,
        severity: 'warning',
      });
      riskScore += weights.high_risk_keyword_match;
    }
  }

  const riskLevel = calculateRiskLevel(riskScore, thresholds);
  const errorCount = issues.filter(i => i.severity === 'error').length;

  return {
    passed: errorCount === 0,
    issues,
    riskLevel,
    riskScore,
  };
}
