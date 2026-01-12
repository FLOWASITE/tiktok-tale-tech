// ============================================
// Industry Park v2.1 - Edge Function Types
// Shared types for backend Edge Functions
// ============================================

/**
 * ResolvedRules - Pre-computed, merged rules for a jurisdiction
 * This is the main type used by AI generation functions
 */
export interface ResolvedRulesV2 {
  industry_code: string;
  jurisdiction_code: string;
  names: Record<string, string>;
  target_audience: 'B2B' | 'B2C' | 'both';
  brand_voice: BrandVoiceV2;
  terminology: TerminologyV2;
  compliance_rules: ComplianceRuleV2[];
  claim_restrictions: ClaimRestrictionV2[];
  argument_patterns: ArgumentPatternsV2;
  system_rules: string[];
  key_regulations: KeyRegulationV2[];
  industry_trends: string[];
  risk_guidelines: RiskGuidelinesV2;
  related_industries: string[];
  disclaimer: string;
}

export interface BrandVoiceV2 {
  tone_of_voice?: string[];
  formality_level?: 'formal' | 'semi-formal' | 'casual';
  language_style?: string[];
  cta_policy?: 'aggressive' | 'moderate' | 'subtle';
  allow_emoji?: boolean;
  emoji_policy?: string;
}

export interface TerminologyV2 {
  forbidden_terms: string[];
  preferred_terms: string[];
  forbidden_words_local: string[];
}

export interface ComplianceRuleV2 {
  rule: string;
  category?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  effective_date?: string;
  source?: string;
}

export interface ClaimRestrictionV2 {
  claim: string;
  alternative: string;
  reason?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

export interface ArgumentPatternsV2 {
  valid_patterns: string[];
  forbidden_patterns: string[];
}

export interface KeyRegulationV2 {
  name: string;
  effective_date: string;
  summary: string;
  source_url?: string;
  validity_status: 'current' | 'superseded' | 'pending';
  last_verified_date?: string;
}

export interface RiskGuidelinesV2 {
  high_risk_keywords: string[];
  scoring_weights: {
    forbidden_term_match?: number;
    claim_restriction_match?: number;
    forbidden_pattern_match?: number;
    high_risk_keyword_match?: number;
  };
  risk_thresholds: {
    low?: number;
    medium?: number;
    high?: number;
    blocked?: number;
  };
}

/**
 * Risk scoring result from compliance check
 */
export interface RiskScoringResultV2 {
  score: number;
  level: 'low' | 'medium' | 'high' | 'blocked';
  violations: RiskViolationV2[];
  summary: string;
}

export interface RiskViolationV2 {
  type: 'forbidden_term' | 'claim_restriction' | 'forbidden_pattern' | 'high_risk_keyword';
  match: string;
  context?: string;
  points: number;
}

/**
 * Global Pack (for admin/management purposes)
 */
export interface GlobalPackV2 {
  id: string;
  industry_code: string;
  category_id: string | null;
  target_audience: 'B2B' | 'B2C' | 'both';
  global_brand_voice: BrandVoiceV2;
  global_terminology: {
    forbidden_terms_global: string[];
    preferred_terms: Record<string, string[]>;
    forbidden_words_by_lang: Record<string, string[]>;
  };
  global_compliance_rules: ComplianceRuleV2[];
  global_claim_restrictions: ClaimRestrictionV2[];
  global_argument_patterns: ArgumentPatternsV2;
  global_system_rules: string[];
  risk_guidelines: RiskGuidelinesV2;
  related_industries: string[];
  is_active: boolean;
  version: string;
}

/**
 * Jurisdiction Profile
 */
export interface JurisdictionProfileV2 {
  id: string;
  global_pack_id: string;
  jurisdiction_code: string;
  resolved_rules: ResolvedRulesV2;
  validity_status: 'current' | 'superseded' | 'pending';
  last_verified_date: string | null;
  disclaimer: string | null;
}

/**
 * Backward compatibility - Convert v2 to v1 IndustryMemory format
 */
export function convertToLegacyIndustryMemory(resolved: ResolvedRulesV2): {
  id: string;
  code: string;
  name: string;
  version: string;
  target_audience: string;
  compliance_rules: Array<string | { rule: string; level?: string }>;
  claim_restrictions: Array<string | { claim: string; reason?: string }>;
  forbidden_terms: string[];
  brand_voice: Record<string, any>;
  argument_patterns?: { valid_patterns?: string[]; forbidden_patterns?: string[] };
  system_rules?: string[];
  preferred_words?: string[];
  forbidden_words?: string[];
} {
  return {
    id: resolved.industry_code, // Use code as ID for compatibility
    code: resolved.industry_code,
    name: resolved.names?.vi || resolved.names?.en || resolved.industry_code,
    version: '2.1',
    target_audience: resolved.target_audience,
    compliance_rules: resolved.compliance_rules.map(r => ({
      rule: r.rule,
      level: r.severity,
    })),
    claim_restrictions: resolved.claim_restrictions.map(c => ({
      claim: c.claim,
      reason: c.alternative,
    })),
    forbidden_terms: [
      ...resolved.terminology.forbidden_terms,
      ...resolved.terminology.forbidden_words_local,
    ],
    brand_voice: resolved.brand_voice,
    argument_patterns: resolved.argument_patterns,
    system_rules: resolved.system_rules,
    preferred_words: resolved.terminology.preferred_terms,
    forbidden_words: resolved.terminology.forbidden_words_local,
  };
}
