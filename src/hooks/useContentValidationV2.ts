/**
 * useContentValidationV2 - Content validation against resolved jurisdiction rules
 * 
 * Uses pre-computed resolved_rules from industry_jurisdiction_profiles
 * for consistent validation across all content types.
 */

import { useCallback, useMemo } from 'react';
import { useResolvedRules } from './useJurisdictionProfile';
import type { ResolvedRules, RiskLevel } from '@/types/industryParkV2';

// ============== TYPES ==============

export interface ContentViolation {
  term: string;
  type: 'forbidden_term' | 'forbidden_word' | 'forbidden_pattern' | 'high_risk_keyword' | 'claim_restriction';
  severity: 'error' | 'warning';
  channel?: string;
  context: string;
  alternative?: string;
}

export interface ValidationResult {
  isValid: boolean;
  hasErrors: boolean;
  hasWarnings: boolean;
  violations: ContentViolation[];
  errorCount: number;
  warningCount: number;
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

function containsTerm(content: string, term: string): boolean {
  if (!content || !term) return false;
  
  const normalizedContent = normalizeVietnamese(content);
  const normalizedTerm = normalizeVietnamese(term);
  
  try {
    const regex = new RegExp(`\\b${escapeRegex(normalizedTerm)}\\b`, 'gi');
    if (regex.test(normalizedContent)) return true;
    
    // Also check original with diacritics
    const originalRegex = new RegExp(`\\b${escapeRegex(term.toLowerCase())}\\b`, 'gi');
    if (originalRegex.test(content.toLowerCase())) return true;
  } catch {
    // Fallback to simple includes
    return normalizedContent.includes(normalizedTerm);
  }
  
  return false;
}

function extractContext(content: string, term: string): string {
  const lowerContent = content.toLowerCase();
  const lowerTerm = term.toLowerCase();
  const index = lowerContent.indexOf(lowerTerm);
  
  if (index === -1) return '';
  
  const start = Math.max(0, index - 25);
  const end = Math.min(content.length, index + term.length + 25);
  
  let snippet = content.substring(start, end);
  if (start > 0) snippet = '...' + snippet;
  if (end < content.length) snippet = snippet + '...';
  
  return snippet;
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
 * Content validation hook using v2 jurisdiction profiles
 */
export function useContentValidationV2(
  brandTemplateId: string | null | undefined,
  jurisdictionCode: string = 'VN'
) {
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

  /**
   * Validate a single piece of content
   */
  const validateContent = useCallback((
    content: string,
    channel?: string
  ): ValidationResult => {
    const violations: ContentViolation[] = [];
    let riskScore = 0;

    if (!content || !rules) {
      return {
        isValid: true,
        hasErrors: false,
        hasWarnings: false,
        violations: [],
        errorCount: 0,
        warningCount: 0,
        riskLevel: 'low',
        riskScore: 0,
      };
    }

    // 1. Check forbidden terms (CRITICAL - errors)
    rules.terminology.forbidden_terms.forEach((term) => {
      if (containsTerm(content, term)) {
        violations.push({
          term,
          type: 'forbidden_term',
          severity: 'error',
          channel,
          context: extractContext(content, term),
        });
        riskScore += weights.forbidden_term_match;
      }
    });

    // 2. Check local forbidden words (CRITICAL - errors)
    rules.terminology.forbidden_words_local.forEach((word) => {
      if (containsTerm(content, word)) {
        violations.push({
          term: word,
          type: 'forbidden_word',
          severity: 'error',
          channel,
          context: extractContext(content, word),
        });
        riskScore += weights.forbidden_term_match;
      }
    });

    // 3. Check forbidden patterns (CRITICAL - errors)
    rules.argument_patterns.forbidden_patterns.forEach((pattern) => {
      const patternClean = pattern.replace(/\[.*?\]/g, '.*');
      try {
        const regex = new RegExp(patternClean, 'i');
        if (regex.test(content)) {
          violations.push({
            term: pattern,
            type: 'forbidden_pattern',
            severity: 'error',
            channel,
            context: extractContext(content, pattern.replace(/\[.*?\]/g, '')),
          });
          riskScore += weights.forbidden_pattern_match;
        }
      } catch {
        // Invalid regex, skip
      }
    });

    // 4. Check claim restrictions (warnings with alternatives)
    rules.claim_restrictions.forEach((restriction) => {
      if (containsTerm(content, restriction.claim)) {
        violations.push({
          term: restriction.claim,
          type: 'claim_restriction',
          severity: 'warning',
          channel,
          context: extractContext(content, restriction.claim),
          alternative: restriction.alternative,
        });
        riskScore += weights.claim_restriction_match;
      }
    });

    // 5. Check high-risk keywords (warnings)
    rules.risk_guidelines.high_risk_keywords.forEach((keyword) => {
      if (containsTerm(content, keyword)) {
        violations.push({
          term: keyword,
          type: 'high_risk_keyword',
          severity: 'warning',
          channel,
          context: extractContext(content, keyword),
        });
        riskScore += weights.high_risk_keyword_match;
      }
    });

    const errorCount = violations.filter(v => v.severity === 'error').length;
    const warningCount = violations.filter(v => v.severity === 'warning').length;
    const riskLevel = calculateRiskLevel(riskScore, thresholds);

    return {
      isValid: errorCount === 0,
      hasErrors: errorCount > 0,
      hasWarnings: warningCount > 0,
      violations,
      errorCount,
      warningCount,
      riskLevel,
      riskScore,
    };
  }, [rules, weights, thresholds]);

  /**
   * Validate multiple channel contents at once
   */
  const validateMultiChannelContent = useCallback((
    channelContents: Record<string, string | null | undefined>
  ): ValidationResult => {
    const allViolations: ContentViolation[] = [];
    let totalRiskScore = 0;

    for (const [channel, content] of Object.entries(channelContents)) {
      if (content) {
        const result = validateContent(content, channel);
        allViolations.push(...result.violations);
        totalRiskScore = Math.max(totalRiskScore, result.riskScore);
      }
    }

    // Deduplicate violations by term+type
    const uniqueViolations = allViolations.reduce((acc, violation) => {
      const key = `${violation.term}-${violation.type}`;
      if (!acc.find(v => `${v.term}-${v.type}` === key)) {
        acc.push(violation);
      }
      return acc;
    }, [] as ContentViolation[]);

    const errorCount = uniqueViolations.filter(v => v.severity === 'error').length;
    const warningCount = uniqueViolations.filter(v => v.severity === 'warning').length;
    const riskLevel = calculateRiskLevel(totalRiskScore, thresholds);

    return {
      isValid: errorCount === 0,
      hasErrors: errorCount > 0,
      hasWarnings: warningCount > 0,
      violations: uniqueViolations,
      errorCount,
      warningCount,
      riskLevel,
      riskScore: totalRiskScore,
    };
  }, [validateContent, thresholds]);

  /**
   * Quick check - returns just forbidden terms found (for real-time UI)
   */
  const quickCheck = useCallback((text: string): { hasIssues: boolean; terms: string[] } => {
    if (!text || !rules) {
      return { hasIssues: false, terms: [] };
    }

    const foundTerms: string[] = [];
    const allForbidden = [
      ...rules.terminology.forbidden_terms,
      ...rules.terminology.forbidden_words_local,
    ];

    for (const term of allForbidden) {
      if (containsTerm(text, term)) {
        foundTerms.push(term);
      }
    }

    return {
      hasIssues: foundTerms.length > 0,
      terms: foundTerms,
    };
  }, [rules]);

  // Expose useful data
  const forbiddenTerms = useMemo(() => [
    ...(rules?.terminology.forbidden_terms || []),
    ...(rules?.terminology.forbidden_words_local || []),
  ], [rules]);

  const preferredTerms = useMemo(() => 
    rules?.terminology.preferred_terms || [], 
  [rules]);

  const claimRestrictions = useMemo(() => 
    rules?.claim_restrictions || [], 
  [rules]);

  return {
    validateContent,
    validateMultiChannelContent,
    quickCheck,
    rules,
    hasRules: !!rules,
    isLoading,
    error,
    forbiddenTerms,
    preferredTerms,
    claimRestrictions,
  };
}
