/**
 * useRiskScoring - v2 Hook for client-side risk assessment
 * 
 * Uses the resolved_rules from jurisdiction profiles to calculate
 * risk scores for content before generation or publishing.
 */

import { useCallback, useState, useMemo } from 'react';
import { useResolvedRules } from './useJurisdictionProfile';
import { 
  calculateRiskScore, 
  validateClaimRestrictions, 
  validateArgumentPatterns,
  getRiskLevelColor,
  getRiskLevelLabel,
} from '@/utils/jurisdictionResolver';
import type { ResolvedRules } from '@/types/industryParkV2';

// ============== TYPES ==============

export interface RiskCheckResult {
  score: number;
  level: 'low' | 'medium' | 'high' | 'blocked';
  violations: {
    type: string;
    match: string;
    context?: string;
  }[];
  summary: string;
  color: string;
  label: string;
}

export interface ContentValidation {
  isValid: boolean;
  riskResult: RiskCheckResult;
  claimViolations: { claim: string; alternative: string }[];
  patternScore: number;
  matchedValidPatterns: string[];
  matchedForbiddenPatterns: string[];
}

// ============== HOOK ==============

/**
 * Main risk scoring hook for content validation
 */
export function useRiskScoring(
  brandTemplateId: string | null | undefined,
  jurisdictionCode: string = 'VN'
) {
  const [lastResult, setLastResult] = useState<RiskCheckResult | null>(null);
  const { rules, isLoading, error, isStale } = useResolvedRules(
    brandTemplateId,
    jurisdictionCode
  );

  const checkRisk = useCallback((content: string): RiskCheckResult | null => {
    if (!rules) return null;

    const result = calculateRiskScore(
      content,
      rules.risk_guidelines,
      rules.terminology,
      rules.argument_patterns
    );

    const riskResult: RiskCheckResult = {
      score: result.score,
      level: result.level,
      violations: result.violations.map(v => ({
        type: v.type,
        match: v.match,
        context: v.context,
      })),
      summary: result.summary,
      color: getRiskLevelColor(result.level),
      label: getRiskLevelLabel(result.level),
    };

    setLastResult(riskResult);
    return riskResult;
  }, [rules]);

  const validateContent = useCallback((content: string): ContentValidation | null => {
    if (!rules) return null;
    const riskResult = checkRisk(content);
    if (!riskResult) return null;

    const claimCheck = validateClaimRestrictions(content, rules.claim_restrictions);
    const patternCheck = validateArgumentPatterns(content, rules.argument_patterns);

    return {
      isValid: riskResult.level !== 'blocked' && claimCheck.valid && patternCheck.matchedForbidden.length === 0,
      riskResult,
      claimViolations: claimCheck.violations,
      patternScore: patternCheck.score,
      matchedValidPatterns: patternCheck.matchedValid,
      matchedForbiddenPatterns: patternCheck.matchedForbidden,
    };
  }, [rules, checkRisk]);

  const hasBlockingViolations = useCallback((content: string): boolean => {
    return checkRisk(content)?.level === 'blocked';
  }, [checkRisk]);

  const forbiddenTerms = useMemo(() => rules?.terminology?.forbidden_terms || [], [rules]);
  const preferredTerms = useMemo(() => rules?.terminology?.preferred_terms || [], [rules]);
  const complianceRules = useMemo(() => rules?.compliance_rules || [], [rules]);

  return {
    isLoading, error, isStale, hasRules: !!rules, lastResult,
    checkRisk, validateContent, hasBlockingViolations,
    forbiddenTerms, preferredTerms, complianceRules, rules,
  };
}

export function useQuickRiskCheck() {
  const [isChecking, setIsChecking] = useState(false);

  const checkWithRules = useCallback(async (content: string, rules: ResolvedRules): Promise<RiskCheckResult> => {
    setIsChecking(true);
    try {
      const result = calculateRiskScore(content, rules.risk_guidelines, rules.terminology, rules.argument_patterns);
      return {
        score: result.score,
        level: result.level,
        violations: result.violations.map(v => ({ type: v.type, match: v.match, context: v.context })),
        summary: result.summary,
        color: getRiskLevelColor(result.level),
        label: getRiskLevelLabel(result.level),
      };
    } finally {
      setIsChecking(false);
    }
  }, []);

  return { isChecking, checkWithRules };
}

export function useBatchRiskValidation(brandTemplateId: string | null | undefined, jurisdictionCode: string = 'VN') {
  const { rules, isLoading } = useResolvedRules(brandTemplateId, jurisdictionCode);
  const [results, setResults] = useState<Map<string, RiskCheckResult>>(new Map());

  const validateBatch = useCallback((contents: { id: string; content: string }[]): Map<string, RiskCheckResult> => {
    if (!rules) return new Map();
    const newResults = new Map<string, RiskCheckResult>();
    contents.forEach(({ id, content }) => {
      const result = calculateRiskScore(content, rules.risk_guidelines, rules.terminology, rules.argument_patterns);
      newResults.set(id, {
        score: result.score,
        level: result.level,
        violations: result.violations.map(v => ({ type: v.type, match: v.match, context: v.context })),
        summary: result.summary,
        color: getRiskLevelColor(result.level),
        label: getRiskLevelLabel(result.level),
      });
    });
    setResults(newResults);
    return newResults;
  }, [rules]);

  return { isLoading, hasRules: !!rules, results, validateBatch, getResult: (id: string) => results.get(id), clearResults: () => setResults(new Map()) };
}
