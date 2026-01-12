// =============================================
// INDUSTRY PERSONA V2 TYPES
// Linked to Global Packs (Industry Park v2.1)
// =============================================

import type { TargetAudience } from './industryParkV2';

// ===========================================
// Core Types
// ===========================================

export interface IndustryPersonaV2 {
  id: string;
  global_pack_id: string;
  
  // Basic info
  name: string;
  description: string | null;
  avatar_url: string | null;
  is_active: boolean;
  sort_order: number;
  
  // Demographics
  age_range: string | null;
  gender: string | null;
  income_level: string | null;
  education_level: string | null;
  occupation: string | null;
  location_type: string | null;
  family_status: string | null;
  
  // Psychographics
  values: string[];
  interests: string[];
  lifestyle: string | null;
  personality_traits: string[];
  
  // Buying behavior
  buying_motivation: string[];
  decision_factors: string[];
  price_sensitivity: string | null;
  purchase_frequency: string | null;
  preferred_channels: string[];
  
  // Digital behavior
  device_usage: DeviceUsage;
  tech_savviness: string | null;
  social_platforms: string[];
  content_consumption: string[];
  
  // AI Enhancement fields
  communication_style: string | null;
  response_tone_hints: string[];
  content_preferences: ContentPreferencesV2;
  
  // Journey & Pain points
  journey_stages: JourneyStage[];
  pain_points: string[];
  goals: string[];
  objections: string[];
  
  // Country/Jurisdiction variants
  country_variants: CountryVariants;
  
  // Metadata
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface IndustryPersonaTranslationV2 {
  id: string;
  persona_id: string;
  language_code: string;
  
  // Translated fields
  name: string;
  description: string | null;
  lifestyle: string | null;
  pain_points: string[];
  goals: string[];
  objections: string[];
  
  // Metadata
  created_at: string;
  updated_at: string;
}

// ===========================================
// Sub-Types
// ===========================================

export interface DeviceUsage {
  mobile_primary?: boolean;
  desktop_usage?: 'high' | 'medium' | 'low';
  tablet_usage?: 'high' | 'medium' | 'low';
}

export interface ContentPreferencesV2 {
  format?: 'short' | 'medium' | 'long';
  visual?: boolean;
  storytelling?: boolean;
  data_driven?: boolean;
  emotional?: boolean;
  practical?: boolean;
}

export interface JourneyStage {
  stage: string;
  touchpoints: string[];
  emotions: string[];
  actions: string[];
  pain_points?: string[];
}

export interface CountryVariants {
  [jurisdictionCode: string]: Partial<{
    income_level: string;
    occupation: string;
    pain_points: string[];
    goals: string[];
    preferred_channels: string[];
    lifestyle: string;
  }>;
}

// ===========================================
// Persona with Global Pack info (for display)
// ===========================================

export interface IndustryPersonaWithPack extends IndustryPersonaV2 {
  global_pack?: {
    id: string;
    industry_code: string;
    target_audience: TargetAudience;
  };
  translations?: IndustryPersonaTranslationV2[];
}

// ===========================================
// Resolved Persona (for AI generation)
// ===========================================

export interface ResolvedPersona {
  id: string;
  name: string;
  description: string | null;
  
  // Merged demographics
  age_range: string | null;
  gender: string | null;
  income_level: string | null;
  occupation: string | null;
  
  // Merged psychographics
  pain_points: string[];
  goals: string[];
  objections: string[];
  values: string[];
  interests: string[];
  
  // AI hints
  communication_style: string | null;
  response_tone_hints: string[];
  content_preferences: ContentPreferencesV2;
  
  // Journey
  journey_stages: JourneyStage[];
}

// ===========================================
// Form/Editor Types
// ===========================================

export interface IndustryPersonaFormData {
  global_pack_id: string;
  name: string;
  description: string;
  avatar_url: string;
  is_active: boolean;
  sort_order: number;
  
  // Demographics
  age_range: string;
  gender: string;
  income_level: string;
  education_level: string;
  occupation: string;
  location_type: string;
  family_status: string;
  
  // Psychographics
  values: string[];
  interests: string[];
  lifestyle: string;
  personality_traits: string[];
  
  // Buying behavior
  buying_motivation: string[];
  decision_factors: string[];
  price_sensitivity: string;
  purchase_frequency: string;
  preferred_channels: string[];
  
  // Digital behavior
  device_usage: DeviceUsage;
  tech_savviness: string;
  social_platforms: string[];
  content_consumption: string[];
  
  // AI Enhancement
  communication_style: string;
  response_tone_hints: string[];
  content_preferences: ContentPreferencesV2;
  
  // Journey & Pain points
  journey_stages: JourneyStage[];
  pain_points: string[];
  goals: string[];
  objections: string[];
  
  // Country variants
  country_variants: CountryVariants;
}

// ===========================================
// Constants
// ===========================================

export const GENDER_OPTIONS = [
  { value: 'male', label: 'Nam' },
  { value: 'female', label: 'Nữ' },
  { value: 'all', label: 'Tất cả' },
] as const;

export const INCOME_LEVEL_OPTIONS = [
  { value: 'low', label: 'Thấp' },
  { value: 'medium', label: 'Trung bình' },
  { value: 'high', label: 'Cao' },
  { value: 'very_high', label: 'Rất cao' },
] as const;

export const EDUCATION_LEVEL_OPTIONS = [
  { value: 'high_school', label: 'THPT' },
  { value: 'college', label: 'Cao đẳng' },
  { value: 'bachelor', label: 'Đại học' },
  { value: 'master', label: 'Thạc sĩ' },
  { value: 'doctorate', label: 'Tiến sĩ' },
] as const;

export const TECH_SAVVINESS_OPTIONS = [
  { value: 'low', label: 'Cơ bản' },
  { value: 'medium', label: 'Trung bình' },
  { value: 'high', label: 'Thành thạo' },
  { value: 'expert', label: 'Chuyên gia' },
] as const;

export const PRICE_SENSITIVITY_OPTIONS = [
  { value: 'very_sensitive', label: 'Rất nhạy giá' },
  { value: 'sensitive', label: 'Nhạy giá' },
  { value: 'moderate', label: 'Bình thường' },
  { value: 'low', label: 'Ít quan tâm giá' },
  { value: 'none', label: 'Không quan tâm giá' },
] as const;

export const PURCHASE_FREQUENCY_OPTIONS = [
  { value: 'one_time', label: 'Một lần' },
  { value: 'rare', label: 'Hiếm khi' },
  { value: 'occasional', label: 'Thỉnh thoảng' },
  { value: 'regular', label: 'Thường xuyên' },
  { value: 'frequent', label: 'Rất thường xuyên' },
] as const;

export const LOCATION_TYPE_OPTIONS = [
  { value: 'urban', label: 'Thành thị' },
  { value: 'suburban', label: 'Ngoại ô' },
  { value: 'rural', label: 'Nông thôn' },
] as const;

export const FAMILY_STATUS_OPTIONS = [
  { value: 'single', label: 'Độc thân' },
  { value: 'married_no_kids', label: 'Kết hôn, chưa có con' },
  { value: 'married_with_kids', label: 'Có gia đình' },
  { value: 'empty_nest', label: 'Con đã trưởng thành' },
] as const;

export const COMMUNICATION_STYLES_V2 = [
  { value: 'direct', label: 'Trực tiếp', description: 'Đi thẳng vào vấn đề' },
  { value: 'emotional', label: 'Cảm xúc', description: 'Kết nối qua câu chuyện' },
  { value: 'analytical', label: 'Phân tích', description: 'Dựa trên data và logic' },
  { value: 'consultative', label: 'Tư vấn', description: 'Hỏi đáp, tìm hiểu nhu cầu' },
  { value: 'storytelling', label: 'Kể chuyện', description: 'Dùng narrative' },
] as const;

export const RESPONSE_TONE_OPTIONS = [
  { value: 'empathetic', label: 'Đồng cảm' },
  { value: 'solution-oriented', label: 'Hướng giải pháp' },
  { value: 'authoritative', label: 'Chuyên gia' },
  { value: 'friendly', label: 'Thân thiện' },
  { value: 'urgent', label: 'Khẩn cấp' },
  { value: 'reassuring', label: 'Trấn an' },
  { value: 'motivating', label: 'Động viên' },
  { value: 'educational', label: 'Giáo dục' },
] as const;

// ===========================================
// Helper Functions
// ===========================================

export const getDefaultContentPreferencesV2 = (): ContentPreferencesV2 => ({
  format: 'medium',
  visual: true,
  storytelling: false,
  data_driven: false,
  emotional: false,
  practical: true,
});

export const createEmptyIndustryPersonaV2 = (globalPackId: string): Omit<IndustryPersonaV2, 'id' | 'created_at' | 'updated_at'> => ({
  global_pack_id: globalPackId,
  name: '',
  description: null,
  avatar_url: null,
  is_active: true,
  sort_order: 0,
  
  // Demographics
  age_range: null,
  gender: null,
  income_level: null,
  education_level: null,
  occupation: null,
  location_type: null,
  family_status: null,
  
  // Psychographics
  values: [],
  interests: [],
  lifestyle: null,
  personality_traits: [],
  
  // Buying behavior
  buying_motivation: [],
  decision_factors: [],
  price_sensitivity: null,
  purchase_frequency: null,
  preferred_channels: [],
  
  // Digital behavior
  device_usage: {},
  tech_savviness: null,
  social_platforms: [],
  content_consumption: [],
  
  // AI Enhancement
  communication_style: null,
  response_tone_hints: [],
  content_preferences: getDefaultContentPreferencesV2(),
  
  // Journey
  journey_stages: [],
  pain_points: [],
  goals: [],
  objections: [],
  
  // Country variants
  country_variants: {},
  
  // Metadata
  created_by: null,
});

/**
 * Resolve persona with country-specific overrides
 */
export const resolvePersonaForJurisdiction = (
  persona: IndustryPersonaV2,
  jurisdictionCode: string
): ResolvedPersona => {
  const countryOverrides = persona.country_variants?.[jurisdictionCode] || {};
  
  return {
    id: persona.id,
    name: persona.name,
    description: persona.description,
    
    // Apply country overrides
    age_range: persona.age_range,
    gender: persona.gender,
    income_level: countryOverrides.income_level || persona.income_level,
    occupation: countryOverrides.occupation || persona.occupation,
    
    // Merge arrays with overrides
    pain_points: countryOverrides.pain_points?.length 
      ? countryOverrides.pain_points 
      : persona.pain_points,
    goals: countryOverrides.goals?.length 
      ? countryOverrides.goals 
      : persona.goals,
    objections: persona.objections,
    values: persona.values,
    interests: persona.interests,
    
    // AI hints
    communication_style: persona.communication_style,
    response_tone_hints: persona.response_tone_hints,
    content_preferences: persona.content_preferences,
    
    journey_stages: persona.journey_stages,
  };
};
