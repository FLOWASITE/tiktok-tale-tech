/**
 * Industry Park v2.1 - TypeScript Types
 * "Pragmatic Global" Architecture
 */

// ===========================================
// Core Types
// ===========================================

// Industry Level Types
export type IndustryLevel = 'core' | 'sub';

export interface IndustryGlobalPack {
  id: string;
  industry_code: string;
  category_id: string | null;
  parent_pack_id: string | null;  // For sub-industry linkage
  industry_level: IndustryLevel;   // 'core' or 'sub'
  sort_order: number;              // UI ordering
  target_audience: TargetAudience;
  global_brand_voice: BrandVoiceBase;
  global_terminology: GlobalTerminology;
  global_compliance_rules: ComplianceRule[];
  global_claim_restrictions: ClaimRestriction[];
  global_argument_patterns: ArgumentPatterns;
  global_system_rules: string[];
  risk_guidelines: RiskGuidelines;
  related_industries: string[];
  is_active: boolean;
  version: string;
  created_at: string;
  updated_at: string;
}

// Helper type for hierarchical display (Core with nested Subs)
export interface IndustryPackWithChildren extends IndustryGlobalPack {
  children: IndustryGlobalPack[];
}

export interface JurisdictionProfile {
  id: string;
  global_pack_id: string;
  jurisdiction_code: string;
  resolved_rules: ResolvedRules;
  validity_status: ValidityStatus;
  last_verified_date: string | null;
  disclaimer: string | null;
  created_at: string;
  updated_at: string;
}

export interface IndustryPackTranslation {
  id: string;
  global_pack_id: string;
  language_code: string;
  name: string;
  short_name: string | null;
  preferred_terms: string[];
  forbidden_terms: string[];
  glossary: Record<string, string>;
  created_at: string;
  updated_at: string;
}

// ===========================================
// Resolved Rules (Pre-computed, used by AI)
// ===========================================

export interface ResolvedRules {
  industry_code: string;
  jurisdiction_code: string;
  names: Record<string, string>; // { vi: "...", en: "...", zh: "..." }
  target_audience: TargetAudience;
  brand_voice: BrandVoiceBase;
  terminology: ResolvedTerminology;
  compliance_rules: ComplianceRule[];
  claim_restrictions: ClaimRestriction[];
  argument_patterns: ArgumentPatterns;
  system_rules: string[];
  key_regulations: KeyRegulation[];
  industry_trends: string[];
  risk_guidelines: RiskGuidelines;
  related_industries: string[];
  disclaimer: string;
}

// ===========================================
// Sub-Types
// ===========================================

export type TargetAudience = 'B2B' | 'B2C' | 'both';
export type ValidityStatus = 'current' | 'superseded' | 'pending';
export type RiskLevel = 'low' | 'medium' | 'high' | 'blocked';
export type ComplianceSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface BrandVoiceBase {
  tone_of_voice?: string[];
  formality_level?: 'formal' | 'semi-formal' | 'casual';
  language_style?: string[];
  cta_policy?: 'aggressive' | 'moderate' | 'subtle';
  allow_emoji?: boolean;
  emoji_policy?: string;
}

export interface GlobalTerminology {
  forbidden_terms_global: string[];
  preferred_terms: Record<string, string[]>; // { vi: [...], en: [...] }
  forbidden_words_by_lang: Record<string, string[]>;
}

export interface ResolvedTerminology {
  forbidden_terms: string[];
  preferred_terms: string[];
  forbidden_words_local: string[];
}

export interface ComplianceRule {
  rule: string;
  category?: string;
  severity?: ComplianceSeverity;
  effective_date?: string;
  source?: string;
}

export interface ClaimRestriction {
  claim: string;
  alternative: string;
  reason?: string;
  severity?: ComplianceSeverity;
}

export interface ArgumentPatterns {
  valid_patterns: string[];
  forbidden_patterns: string[];
}

export interface KeyRegulation {
  name: string;
  effective_date: string;
  summary: string;
  source_url?: string;
  validity_status: ValidityStatus;
  last_verified_date?: string;
}

export interface RiskGuidelines {
  high_risk_keywords: string[];
  scoring_weights: RiskScoringWeights;
  risk_thresholds: RiskThresholds;
}

export interface RiskScoringWeights {
  forbidden_term_match?: number;
  claim_restriction_match?: number;
  forbidden_pattern_match?: number;
  high_risk_keyword_match?: number;
}

export interface RiskThresholds {
  low?: number;
  medium?: number;
  high?: number;
  blocked?: number;
}

// ===========================================
// Risk Scoring Result
// ===========================================

export interface RiskScoringResult {
  score: number;
  level: RiskLevel;
  violations: RiskViolation[];
  summary: string;
}

export interface RiskViolation {
  type: 'forbidden_term' | 'claim_restriction' | 'forbidden_pattern' | 'high_risk_keyword';
  match: string;
  context?: string;
  points: number;
}

// ===========================================
// API Response Types
// ===========================================

export interface FetchProfileResponse {
  profile: JurisdictionProfile | null;
  resolvedRules: ResolvedRules | null;
  translations: Record<string, IndustryPackTranslation>;
}

export interface GlobalPackWithProfiles extends IndustryGlobalPack {
  jurisdiction_profiles: JurisdictionProfile[];
  translations: IndustryPackTranslation[];
}

// ===========================================
// Form/Editor Types
// ===========================================

export interface GlobalPackFormData {
  industry_code: string;
  category_id: string | null;
  parent_pack_id: string | null;   // For sub-industry linkage
  parent_pack_code?: string;       // Helper for CSV import (resolved to parent_pack_id)
  industry_level: IndustryLevel;   // 'core' or 'sub'
  sort_order: number;              // UI ordering
  target_audience: TargetAudience;
  global_brand_voice: BrandVoiceBase;
  global_terminology: GlobalTerminology;
  global_compliance_rules: ComplianceRule[];
  global_claim_restrictions: ClaimRestriction[];
  global_argument_patterns: ArgumentPatterns;
  global_system_rules: string[];
  risk_guidelines: RiskGuidelines;
  related_industries: string[];
  is_active: boolean;
}

export interface JurisdictionProfileFormData {
  jurisdiction_code: string;
  validity_status: ValidityStatus;
  last_verified_date: string | null;
  disclaimer: string;
  // Override fields
  local_compliance_rules?: ComplianceRule[];
  local_claim_restrictions?: ClaimRestriction[];
  key_regulations?: KeyRegulation[];
  industry_trends?: string[];
}

// ===========================================
// Jurisdiction Codes
// ===========================================

export const SUPPORTED_JURISDICTIONS = [
  { code: 'VN', name: 'Việt Nam', flag: '🇻🇳' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'EU', name: 'European Union', flag: '🇪🇺' },
  { code: 'GLOBAL', name: 'Global (Default)', flag: '🌐' },
] as const;

export type JurisdictionCode = typeof SUPPORTED_JURISDICTIONS[number]['code'];

// ===========================================
// Default Values
// ===========================================

export const DEFAULT_RISK_THRESHOLDS: RiskThresholds = {
  low: 0,
  medium: 30,
  high: 60,
  blocked: 80,
};

export const DEFAULT_SCORING_WEIGHTS: RiskScoringWeights = {
  forbidden_term_match: 50,
  claim_restriction_match: 30,
  forbidden_pattern_match: 20,
  high_risk_keyword_match: 15,
};

export const EMPTY_RESOLVED_RULES: ResolvedRules = {
  industry_code: '',
  jurisdiction_code: 'VN',
  names: {},
  target_audience: 'both',
  brand_voice: {},
  terminology: {
    forbidden_terms: [],
    preferred_terms: [],
    forbidden_words_local: [],
  },
  compliance_rules: [],
  claim_restrictions: [],
  argument_patterns: { valid_patterns: [], forbidden_patterns: [] },
  system_rules: [],
  key_regulations: [],
  industry_trends: [],
  risk_guidelines: {
    high_risk_keywords: [],
    scoring_weights: DEFAULT_SCORING_WEIGHTS,
    risk_thresholds: DEFAULT_RISK_THRESHOLDS,
  },
  related_industries: [],
  disclaimer: 'Thông tin chỉ mang tính tham khảo.',
};
