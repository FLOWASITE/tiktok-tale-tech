// ============================================
// Industry Park v2.1 - Risk Scoring Engine
// Real-time content risk assessment
// ============================================

import { 
  ResolvedRulesV2, 
  RiskGuidelinesV2, 
  RiskScoringResultV2, 
  RiskViolationV2,
  TerminologyV2,
  ArgumentPatternsV2,
  ClaimRestrictionV2
} from "../types/industry-v2-types.ts";

const DEFAULT_WEIGHTS = {
  forbidden_term_match: 50,
  claim_restriction_match: 30,
  forbidden_pattern_match: 20,
  high_risk_keyword_match: 15,
};

const DEFAULT_THRESHOLDS = {
  low: 0,
  medium: 30,
  high: 60,
  blocked: 80,
};

/**
 * Calculate risk score for content based on industry rules
 */
export function calculateRiskScore(
  content: string,
  resolvedRules: ResolvedRulesV2
): RiskScoringResultV2 {
  const violations: RiskViolationV2[] = [];
  
  const weights = {
    ...DEFAULT_WEIGHTS,
    ...(resolvedRules.risk_guidelines?.scoring_weights || {}),
  };
  
  const thresholds = {
    ...DEFAULT_THRESHOLDS,
    ...(resolvedRules.risk_guidelines?.risk_thresholds || {}),
  };

  const contentLower = content.toLowerCase();
  const contentNormalized = normalizeVietnamese(contentLower);

  // 1. Check forbidden terms
  checkForbiddenTerms(
    contentLower,
    contentNormalized,
    resolvedRules.terminology,
    weights.forbidden_term_match,
    violations
  );

  // 2. Check high-risk keywords
  checkHighRiskKeywords(
    contentLower,
    contentNormalized,
    resolvedRules.risk_guidelines,
    weights.high_risk_keyword_match,
    violations
  );

  // 3. Check claim restrictions
  checkClaimRestrictions(
    contentLower,
    resolvedRules.claim_restrictions,
    weights.claim_restriction_match,
    violations
  );

  // 4. Check forbidden patterns
  checkForbiddenPatterns(
    content,
    resolvedRules.argument_patterns,
    weights.forbidden_pattern_match,
    violations
  );

  // Calculate total score
  const score = violations.reduce((sum, v) => sum + v.points, 0);

  // Determine risk level
  let level: 'low' | 'medium' | 'high' | 'blocked' = 'low';
  if (score >= thresholds.blocked) {
    level = 'blocked';
  } else if (score >= thresholds.high) {
    level = 'high';
  } else if (score >= thresholds.medium) {
    level = 'medium';
  }

  // Generate summary
  const summary = generateSummary(violations, level, score);

  return { score, level, violations, summary };
}

/**
 * Quick check if content has any critical violations
 */
export function hasBlockingViolations(
  content: string,
  resolvedRules: ResolvedRulesV2
): boolean {
  const result = calculateRiskScore(content, resolvedRules);
  return result.level === 'blocked';
}

/**
 * Get list of forbidden terms found in content
 */
export function findForbiddenTerms(
  content: string,
  resolvedRules: ResolvedRulesV2
): string[] {
  const contentLower = content.toLowerCase();
  const contentNormalized = normalizeVietnamese(contentLower);
  const found: string[] = [];

  const allForbidden = [
    ...(resolvedRules.terminology?.forbidden_terms || []),
    ...(resolvedRules.terminology?.forbidden_words_local || []),
  ];

  for (const term of allForbidden) {
    const termLower = term.toLowerCase();
    const termNormalized = normalizeVietnamese(termLower);
    
    if (contentLower.includes(termLower) || contentNormalized.includes(termNormalized)) {
      found.push(term);
    }
  }

  return found;
}

// === Private Helper Functions ===

function checkForbiddenTerms(
  contentLower: string,
  contentNormalized: string,
  terminology: TerminologyV2,
  points: number,
  violations: RiskViolationV2[]
): void {
  const forbiddenTerms = terminology?.forbidden_terms || [];
  const forbiddenLocal = terminology?.forbidden_words_local || [];

  for (const term of forbiddenTerms) {
    const termLower = term.toLowerCase();
    const termNormalized = normalizeVietnamese(termLower);
    
    if (contentLower.includes(termLower) || contentNormalized.includes(termNormalized)) {
      violations.push({
        type: 'forbidden_term',
        match: term,
        points,
      });
    }
  }

  for (const term of forbiddenLocal) {
    const termLower = term.toLowerCase();
    const termNormalized = normalizeVietnamese(termLower);
    
    if (contentLower.includes(termLower) || contentNormalized.includes(termNormalized)) {
      violations.push({
        type: 'forbidden_term',
        match: term,
        context: 'local',
        points,
      });
    }
  }
}

function checkHighRiskKeywords(
  contentLower: string,
  contentNormalized: string,
  riskGuidelines: RiskGuidelinesV2,
  points: number,
  violations: RiskViolationV2[]
): void {
  const keywords = riskGuidelines?.high_risk_keywords || [];

  for (const keyword of keywords) {
    const kwLower = keyword.toLowerCase();
    const kwNormalized = normalizeVietnamese(kwLower);
    
    if (contentLower.includes(kwLower) || contentNormalized.includes(kwNormalized)) {
      violations.push({
        type: 'high_risk_keyword',
        match: keyword,
        points,
      });
    }
  }
}

function checkClaimRestrictions(
  contentLower: string,
  claimRestrictions: ClaimRestrictionV2[],
  points: number,
  violations: RiskViolationV2[]
): void {
  for (const restriction of claimRestrictions || []) {
    const claimLower = restriction.claim.toLowerCase();
    
    if (contentLower.includes(claimLower)) {
      violations.push({
        type: 'claim_restriction',
        match: restriction.claim,
        context: restriction.alternative,
        points,
      });
    }
  }
}

function checkForbiddenPatterns(
  content: string,
  argumentPatterns: ArgumentPatternsV2,
  points: number,
  violations: RiskViolationV2[]
): void {
  const forbiddenPatterns = argumentPatterns?.forbidden_patterns || [];

  for (const pattern of forbiddenPatterns) {
    // Convert pattern placeholders to regex
    const patternRegex = pattern
      .replace(/\[.*?\]/g, '.*?')
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\\\.\\\*\\\?/g, '.*?');

    try {
      const regex = new RegExp(patternRegex, 'i');
      if (regex.test(content)) {
        violations.push({
          type: 'forbidden_pattern',
          match: pattern,
          points,
        });
      }
    } catch {
      // Skip invalid regex patterns
    }
  }
}

function generateSummary(
  violations: RiskViolationV2[],
  level: 'low' | 'medium' | 'high' | 'blocked',
  score: number
): string {
  if (violations.length === 0) {
    return 'Nội dung tuân thủ tốt, không phát hiện vi phạm.';
  }

  const counts = {
    forbidden_term: 0,
    high_risk_keyword: 0,
    claim_restriction: 0,
    forbidden_pattern: 0,
  };

  for (const v of violations) {
    counts[v.type]++;
  }

  const parts: string[] = [];
  if (counts.forbidden_term > 0) parts.push(`${counts.forbidden_term} từ cấm`);
  if (counts.high_risk_keyword > 0) parts.push(`${counts.high_risk_keyword} từ khóa rủi ro`);
  if (counts.claim_restriction > 0) parts.push(`${counts.claim_restriction} claim vi phạm`);
  if (counts.forbidden_pattern > 0) parts.push(`${counts.forbidden_pattern} pattern cấm`);

  const levelLabels = {
    low: 'Rủi ro thấp',
    medium: 'Rủi ro trung bình',
    high: 'Rủi ro cao',
    blocked: 'Bị chặn',
  };

  return `${levelLabels[level]} (${score} điểm): Phát hiện ${parts.join(', ')}.`;
}

/**
 * Normalize Vietnamese text for comparison
 * Removes diacritics for fuzzy matching
 */
function normalizeVietnamese(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}
