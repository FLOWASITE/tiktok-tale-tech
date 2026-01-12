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

// Industry Personas V2 hooks
export {
  useIndustryPersonasV2,
  useIndustryPersonaV2,
  useIndustryPersonaTranslationsV2,
  useAllIndustryPersonasV2,
  useCreateIndustryPersonaV2,
  useUpdateIndustryPersonaV2,
  useDeleteIndustryPersonaV2,
  useBulkCreateIndustryPersonasV2,
  useResolvedPersonas,
  useIndustryPersonasLegacy,
  useIndustryPersonasDualPath,
  useIndustryPersonasCount,
  industryPersonaV2Keys,
} from './useIndustryPersonasV2';

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

// Industry Personas V2 types
export type {
  IndustryPersonaV2,
  IndustryPersonaTranslationV2,
  IndustryPersonaWithPack,
  IndustryPersonaFormData,
  ResolvedPersona,
  DeviceUsage,
  ContentPreferencesV2,
  JourneyStage,
  CountryVariants,
} from '@/types/industryPersonaV2';

export {
  GENDER_OPTIONS,
  INCOME_LEVEL_OPTIONS,
  EDUCATION_LEVEL_OPTIONS,
  TECH_SAVVINESS_OPTIONS,
  PRICE_SENSITIVITY_OPTIONS,
  PURCHASE_FREQUENCY_OPTIONS,
  LOCATION_TYPE_OPTIONS,
  FAMILY_STATUS_OPTIONS,
  COMMUNICATION_STYLES_V2,
  RESPONSE_TONE_OPTIONS,
  getDefaultContentPreferencesV2,
  createEmptyIndustryPersonaV2,
  resolvePersonaForJurisdiction,
} from '@/types/industryPersonaV2';

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
