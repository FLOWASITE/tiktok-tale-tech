/**
 * useIndustryParkV2 - Consolidated exports for Industry Park v2 hooks
 * 
 * This file provides a single import point for all v2 industry hooks.
 */

// ============== RE-EXPORTS ==============

// Global Pack hooks
export {
  useGlobalPack,
  useGlobalPackByCode,
  useGlobalPacksList,
  useGlobalPackForBrand,
  useUpdateGlobalPack,
} from './useGlobalPack';
export type {
  GlobalPackWithDetails,
  GlobalPackListItem,
  GlobalPackData,
  TranslationData,
  ProfileData,
} from './useGlobalPack';

// Jurisdiction Profile hooks
export {
  useJurisdictionProfile,
  useJurisdictionProfileForBrand,
  useAvailableJurisdictions,
  useRegenerateProfile,
  useResolvedRules,
} from './useJurisdictionProfile';
export type {
  JurisdictionProfileData,
  GlobalPackInfo,
  ProfileWithGlobalPack,
} from './useJurisdictionProfile';

// Risk Scoring hooks
export {
  useRiskScoring,
  useQuickRiskCheck,
  useBatchRiskValidation,
} from './useRiskScoring';
export type {
  RiskCheckResult,
  ContentValidation,
} from './useRiskScoring';

// ============== TYPES RE-EXPORTS ==============

export type {
  ResolvedRules,
  BrandVoiceBase,
  GlobalTerminology,
  ResolvedTerminology,
  ComplianceRule,
  ClaimRestriction,
  ArgumentPatterns,
  KeyRegulation,
  RiskGuidelines,
  RiskScoringResult,
  RiskViolation,
  JurisdictionCode,
  TargetAudience,
  ValidityStatus,
} from '@/types/industryParkV2';

export {
  SUPPORTED_JURISDICTIONS,
  DEFAULT_RISK_THRESHOLDS,
  DEFAULT_SCORING_WEIGHTS,
  EMPTY_RESOLVED_RULES,
} from '@/types/industryParkV2';

// ============== UTILS RE-EXPORTS ==============

export {
  calculateRiskScore,
  resolveForJurisdiction,
  validateClaimRestrictions,
  validateArgumentPatterns,
  getRiskLevelColor,
  getRiskLevelLabel,
  getJurisdictionName,
  getJurisdictionFlag,
  getSuggestedTerms,
  getComplianceWarnings,
} from '@/utils/jurisdictionResolver';

// ============== BRAND SELECTION HOOK ==============

export {
  useGlobalPacksForBrandSelection,
  fetchGlobalPackDetailsForBrand,
} from './useGlobalPacksForBrandSelection';
export type { GlobalPackForSelection } from './useGlobalPacksForBrandSelection';
