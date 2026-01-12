/**
 * Industry Park v2.1 - Jurisdiction Resolver Utilities
 * Functions for resolving and computing jurisdiction-specific rules
 */

import {
  ResolvedRules,
  ResolvedTerminology,
  RiskGuidelines,
  RiskScoringResult,
  RiskViolation,
  RiskLevel,
  DEFAULT_RISK_THRESHOLDS,
  DEFAULT_SCORING_WEIGHTS,
  IndustryGlobalPack,
  IndustryPackTranslation,
  JurisdictionProfile,
  ComplianceRule,
  ClaimRestriction,
  ArgumentPatterns,
  KeyRegulation,
} from '@/types/industryParkV2';

// ===========================================
// Risk Scoring
// ===========================================

/**
 * Calculate risk score for content based on risk guidelines
 */
export function calculateRiskScore(
  content: string,
  riskGuidelines: RiskGuidelines,
  terminology: ResolvedTerminology,
  argumentPatterns?: ArgumentPatterns
): RiskScoringResult {
  const violations: RiskViolation[] = [];
  const weights = { ...DEFAULT_SCORING_WEIGHTS, ...riskGuidelines.scoring_weights };
  const thresholds = { ...DEFAULT_RISK_THRESHOLDS, ...riskGuidelines.risk_thresholds };
  
  const contentLower = content.toLowerCase();
  
  // Check forbidden terms
  terminology.forbidden_terms.forEach((term) => {
    if (contentLower.includes(term.toLowerCase())) {
      violations.push({
        type: 'forbidden_term',
        match: term,
        points: weights.forbidden_term_match || 50,
      });
    }
  });
  
  // Check local forbidden words
  terminology.forbidden_words_local.forEach((word) => {
    if (contentLower.includes(word.toLowerCase())) {
      violations.push({
        type: 'forbidden_term',
        match: word,
        context: 'local',
        points: weights.forbidden_term_match || 50,
      });
    }
  });
  
  // Check high-risk keywords
  riskGuidelines.high_risk_keywords.forEach((keyword) => {
    if (contentLower.includes(keyword.toLowerCase())) {
      violations.push({
        type: 'high_risk_keyword',
        match: keyword,
        points: weights.high_risk_keyword_match || 15,
      });
    }
  });
  
  // Check forbidden patterns
  if (argumentPatterns?.forbidden_patterns) {
    argumentPatterns.forbidden_patterns.forEach((pattern) => {
      // Simple pattern matching (can be extended with regex)
      const patternLower = pattern.toLowerCase().replace(/\[.*?\]/g, '.*');
      try {
        const regex = new RegExp(patternLower, 'i');
        if (regex.test(content)) {
          violations.push({
            type: 'forbidden_pattern',
            match: pattern,
            points: weights.forbidden_pattern_match || 20,
          });
        }
      } catch {
        // Invalid regex, skip
      }
    });
  }
  
  // Calculate total score
  const score = violations.reduce((sum, v) => sum + v.points, 0);
  
  // Determine risk level
  let level: RiskLevel = 'low';
  if (score >= (thresholds.blocked || 80)) {
    level = 'blocked';
  } else if (score >= (thresholds.high || 60)) {
    level = 'high';
  } else if (score >= (thresholds.medium || 30)) {
    level = 'medium';
  }
  
  // Generate summary
  const summary = generateRiskSummary(violations, level);
  
  return { score, level, violations, summary };
}

/**
 * Generate human-readable risk summary
 */
function generateRiskSummary(violations: RiskViolation[], level: RiskLevel): string {
  if (violations.length === 0) {
    return 'Nội dung tuân thủ tốt, không phát hiện vi phạm.';
  }
  
  const forbiddenCount = violations.filter(v => v.type === 'forbidden_term').length;
  const keywordCount = violations.filter(v => v.type === 'high_risk_keyword').length;
  const patternCount = violations.filter(v => v.type === 'forbidden_pattern').length;
  
  const parts: string[] = [];
  if (forbiddenCount > 0) parts.push(`${forbiddenCount} từ cấm`);
  if (keywordCount > 0) parts.push(`${keywordCount} từ khóa rủi ro`);
  if (patternCount > 0) parts.push(`${patternCount} mẫu câu vi phạm`);
  
  const levelText = {
    low: 'Rủi ro thấp',
    medium: 'Rủi ro trung bình',
    high: 'Rủi ro cao',
    blocked: 'Bị chặn',
  };
  
  return `${levelText[level]}: Phát hiện ${parts.join(', ')}.`;
}

// ===========================================
// Profile Resolution (for manual merge if needed)
// ===========================================

/**
 * Merge global pack with jurisdiction-specific overrides
 * Note: This is mainly for preview/editing. Production uses pre-computed resolved_rules
 */
export function resolveForJurisdiction(
  globalPack: IndustryGlobalPack,
  jurisdictionOverrides: Partial<{
    local_compliance_rules: ComplianceRule[];
    local_claim_restrictions: ClaimRestriction[];
    key_regulations: KeyRegulation[];
    industry_trends: string[];
    disclaimer: string;
  }>,
  translations: Record<string, IndustryPackTranslation>,
  jurisdictionCode: string = 'VN'
): ResolvedRules {
  // Build names from translations
  const names: Record<string, string> = {};
  Object.entries(translations).forEach(([lang, trans]) => {
    names[lang] = trans.name;
  });
  
  // Merge terminology
  const terminology: ResolvedTerminology = {
    forbidden_terms: globalPack.global_terminology.forbidden_terms_global || [],
    preferred_terms: globalPack.global_terminology.preferred_terms?.[jurisdictionCode] || 
                     translations['vi']?.preferred_terms || [],
    forbidden_words_local: globalPack.global_terminology.forbidden_words_by_lang?.[jurisdictionCode] ||
                           translations['vi']?.forbidden_terms || [],
  };
  
  // Merge compliance rules
  const compliance_rules = [
    ...globalPack.global_compliance_rules,
    ...(jurisdictionOverrides.local_compliance_rules || []),
  ];
  
  // Merge claim restrictions
  const claim_restrictions = [
    ...globalPack.global_claim_restrictions,
    ...(jurisdictionOverrides.local_claim_restrictions || []),
  ];
  
  return {
    industry_code: globalPack.industry_code,
    jurisdiction_code: jurisdictionCode,
    names,
    target_audience: globalPack.target_audience,
    brand_voice: globalPack.global_brand_voice,
    terminology,
    compliance_rules,
    claim_restrictions,
    argument_patterns: globalPack.global_argument_patterns,
    system_rules: globalPack.global_system_rules,
    key_regulations: jurisdictionOverrides.key_regulations || [],
    industry_trends: jurisdictionOverrides.industry_trends || [],
    risk_guidelines: globalPack.risk_guidelines,
    related_industries: globalPack.related_industries,
    disclaimer: jurisdictionOverrides.disclaimer || 
                'Thông tin chỉ mang tính tham khảo. Vui lòng kiểm tra nguồn chính thức.',
  };
}

// ===========================================
// Validation Utilities
// ===========================================

/**
 * Validate content against claim restrictions
 */
export function validateClaimRestrictions(
  content: string,
  claimRestrictions: ClaimRestriction[]
): { valid: boolean; violations: { claim: string; alternative: string }[] } {
  const violations: { claim: string; alternative: string }[] = [];
  const contentLower = content.toLowerCase();
  
  claimRestrictions.forEach((restriction) => {
    if (contentLower.includes(restriction.claim.toLowerCase())) {
      violations.push({
        claim: restriction.claim,
        alternative: restriction.alternative,
      });
    }
  });
  
  return {
    valid: violations.length === 0,
    violations,
  };
}

/**
 * Check if content follows valid argument patterns
 */
export function validateArgumentPatterns(
  content: string,
  patterns: ArgumentPatterns
): { score: number; matchedValid: string[]; matchedForbidden: string[] } {
  const matchedValid: string[] = [];
  const matchedForbidden: string[] = [];
  
  // Check valid patterns (simple contains check)
  patterns.valid_patterns.forEach((pattern) => {
    const patternClean = pattern.replace(/\[.*?\]/g, '');
    if (content.includes(patternClean.trim())) {
      matchedValid.push(pattern);
    }
  });
  
  // Check forbidden patterns
  patterns.forbidden_patterns.forEach((pattern) => {
    const patternClean = pattern.replace(/\[.*?\]/g, '');
    if (content.includes(patternClean.trim())) {
      matchedForbidden.push(pattern);
    }
  });
  
  // Score: +10 for each valid, -20 for each forbidden
  const score = matchedValid.length * 10 - matchedForbidden.length * 20;
  
  return { score, matchedValid, matchedForbidden };
}

// ===========================================
// Display Helpers
// ===========================================

/**
 * Get risk level badge color
 */
export function getRiskLevelColor(level: RiskLevel): string {
  const colors = {
    low: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    blocked: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };
  return colors[level];
}

/**
 * Get risk level label in Vietnamese
 */
export function getRiskLevelLabel(level: RiskLevel): string {
  const labels = {
    low: 'Thấp',
    medium: 'Trung bình',
    high: 'Cao',
    blocked: 'Chặn',
  };
  return labels[level];
}

/**
 * Get jurisdiction display name
 */
export function getJurisdictionName(code: string): string {
  const names: Record<string, string> = {
    VN: 'Việt Nam',
    SG: 'Singapore',
    TH: 'Thailand',
    ID: 'Indonesia',
    MY: 'Malaysia',
    PH: 'Philippines',
    US: 'United States',
    EU: 'European Union',
    GLOBAL: 'Global',
  };
  return names[code] || code;
}

/**
 * Get jurisdiction flag emoji
 */
export function getJurisdictionFlag(code: string): string {
  const flags: Record<string, string> = {
    VN: '🇻🇳',
    SG: '🇸🇬',
    TH: '🇹🇭',
    ID: '🇮🇩',
    MY: '🇲🇾',
    PH: '🇵🇭',
    US: '🇺🇸',
    EU: '🇪🇺',
    GLOBAL: '🌐',
  };
  return flags[code] || '🏳️';
}

// ===========================================
// Content Enrichment
// ===========================================

/**
 * Get suggested terms from resolved rules
 */
export function getSuggestedTerms(
  resolvedRules: ResolvedRules,
  count: number = 5
): string[] {
  return resolvedRules.terminology.preferred_terms.slice(0, count);
}

/**
 * Get key compliance warnings for display
 */
export function getComplianceWarnings(
  resolvedRules: ResolvedRules,
  severity: 'high' | 'critical' = 'high'
): ComplianceRule[] {
  return resolvedRules.compliance_rules.filter(
    (rule) => rule.severity === severity || rule.severity === 'critical'
  );
}
