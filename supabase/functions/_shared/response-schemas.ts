/**
 * Response Schemas for AI Cache Validation
 * 
 * These schemas validate AI responses BEFORE caching to prevent
 * corrupted or malformed data from being stored.
 * 
 * IMPORTANT: Only cache responses that pass schema validation.
 */

// ============================================
// Multi-Channel Response Schema
// ============================================

export interface MultiChannelResponse {
  facebook_content?: string;
  instagram_content?: string;
  linkedin_content?: string;
  twitter_content?: string;
  tiktok_content?: string;
  threads_content?: string;
  youtube_content?: string;
  email_content?: string;
  zalo_oa_content?: string;
  telegram_content?: string;
  website_content?: string;
  google_maps_content?: string;
}

export function validateMultiChannelResponse(data: unknown): data is MultiChannelResponse {
  if (!data || typeof data !== 'object') return false;
  
  const record = data as Record<string, unknown>;
  const validKeys = [
    'facebook_content', 'instagram_content', 'linkedin_content', 
    'twitter_content', 'tiktok_content', 'threads_content',
    'youtube_content', 'email_content', 'zalo_oa_content',
    'telegram_content', 'website_content', 'google_maps_content'
  ];
  
  // All values should be strings or undefined
  for (const key of Object.keys(record)) {
    if (!validKeys.includes(key)) continue;
    const value = record[key];
    if (value !== undefined && value !== null && typeof value !== 'string') {
      return false;
    }
  }
  
  // At least one channel should have content
  return validKeys.some(key => typeof record[key] === 'string' && record[key].length > 0);
}

export function normalizeMultiChannelResponse(raw: unknown): MultiChannelResponse | null {
  if (!raw || typeof raw !== 'object') return null;
  
  const record = raw as Record<string, unknown>;
  const result: MultiChannelResponse = {};
  
  const channelMappings: Record<string, keyof MultiChannelResponse> = {
    'facebook': 'facebook_content',
    'facebook_content': 'facebook_content',
    'instagram': 'instagram_content',
    'instagram_content': 'instagram_content',
    'linkedin': 'linkedin_content',
    'linkedin_content': 'linkedin_content',
    'twitter': 'twitter_content',
    'twitter_content': 'twitter_content',
    'tiktok': 'tiktok_content',
    'tiktok_content': 'tiktok_content',
    'threads': 'threads_content',
    'threads_content': 'threads_content',
    'youtube': 'youtube_content',
    'youtube_content': 'youtube_content',
    'email': 'email_content',
    'email_content': 'email_content',
    'zalo_oa': 'zalo_oa_content',
    'zalo_oa_content': 'zalo_oa_content',
    'telegram': 'telegram_content',
    'telegram_content': 'telegram_content',
    'website': 'website_content',
    'website_content': 'website_content',
    'google_maps': 'google_maps_content',
    'google_maps_content': 'google_maps_content',
  };
  
  for (const [key, value] of Object.entries(record)) {
    const normalizedKey = channelMappings[key.toLowerCase()];
    if (normalizedKey && typeof value === 'string' && value.trim()) {
      result[normalizedKey] = value.trim();
    }
  }
  
  return Object.keys(result).length > 0 ? result : null;
}

// ============================================
// Sample Text Response Schema
// ============================================

export interface ChannelRules {
  minLength?: number;
  maxLength: number;
  emojiAllowed: boolean;
  maxEmoji: number;
  hashtagAllowed: boolean;
  maxHashtag: number;
  ctaRequired: boolean;
  hookRequired: boolean;
}

export interface SampleTextResponse {
  samples: Record<string, string>;
  rulesUsed?: Record<string, ChannelRules>;
}

export function validateSampleTextResponse(data: unknown): data is SampleTextResponse {
  if (!data || typeof data !== 'object') return false;
  
  const record = data as Record<string, unknown>;
  
  if (!record.samples || typeof record.samples !== 'object') return false;
  
  const samples = record.samples as Record<string, unknown>;
  for (const value of Object.values(samples)) {
    if (typeof value !== 'string') return false;
  }
  
  return Object.keys(samples).length > 0;
}

// ============================================
// Brand Voice Response Schema
// ============================================

export interface BrandVoiceResponse {
  tone_of_voice?: string[];
  language_style?: string[];
  preferred_words?: string[];
  forbidden_words?: string[];
  formality_level?: string;
  brand_positioning?: string;
  allow_emoji?: boolean;
  pronoun_suggestion?: string;
  reasoning?: string;
}

export function validateBrandVoiceResponse(data: unknown): data is BrandVoiceResponse {
  if (!data || typeof data !== 'object') return false;
  
  const record = data as Record<string, unknown>;
  
  // Check arrays are arrays of strings
  const arrayFields = ['tone_of_voice', 'language_style', 'preferred_words', 'forbidden_words'];
  for (const field of arrayFields) {
    const value = record[field];
    if (value !== undefined && !Array.isArray(value)) return false;
    if (Array.isArray(value) && !value.every(v => typeof v === 'string')) return false;
  }
  
  // Check string fields
  const stringFields = ['formality_level', 'brand_positioning', 'pronoun_suggestion', 'reasoning'];
  for (const field of stringFields) {
    const value = record[field];
    if (value !== undefined && typeof value !== 'string') return false;
  }
  
  // Check boolean
  if (record.allow_emoji !== undefined && typeof record.allow_emoji !== 'boolean') return false;
  
  return true;
}

// ============================================
// Script Response Schema
// ============================================

export interface ScriptPrompt {
  slideNumber?: number;
  promptNumber?: number;
  characterMovement?: string;
  dialogue: string;
  voiceTone?: string;
}

export interface ScriptResponse {
  prompts: ScriptPrompt[];
  metadata?: {
    duration?: number;
    videoType?: string;
    characterType?: string;
  };
}

export function validateScriptResponse(data: unknown): data is ScriptResponse {
  if (!data || typeof data !== 'object') return false;
  
  const record = data as Record<string, unknown>;
  
  // Can be prompts array or raw content string
  if (Array.isArray(record.prompts)) {
    for (const prompt of record.prompts) {
      if (!prompt || typeof prompt !== 'object') return false;
      const p = prompt as ScriptPrompt;
      if (!p.dialogue && typeof p.dialogue !== 'string') return false;
    }
    return record.prompts.length > 0;
  }
  
  // If not structured, check for content field
  if (typeof record.content === 'string' && record.content.length > 0) {
    return true;
  }
  
  return false;
}

// ============================================
// Carousel Response Schema
// ============================================

export interface CarouselSlide {
  slideNumber: number;
  objective?: string;
  textContent: string;
  designStyle?: string;
  colorLayout?: string;
  aspectRatio?: string;
  technicalRequirements?: string;
  fullPrompt: string;
}

export interface CarouselResponse {
  slides: CarouselSlide[];
  captionSuggestion?: string;
  ctaSuggestion?: string;
}

export function validateCarouselResponse(data: unknown): data is CarouselResponse {
  if (!data || typeof data !== 'object') return false;
  
  const record = data as Record<string, unknown>;
  
  if (!Array.isArray(record.slides)) return false;
  
  for (const slide of record.slides) {
    if (!slide || typeof slide !== 'object') return false;
    const s = slide as CarouselSlide;
    if (typeof s.slideNumber !== 'number') return false;
    // textContent can be string or structured object with headline
    if (typeof s.textContent === 'string') {
      // OK — legacy string
    } else if (s.textContent && typeof s.textContent === 'object' && typeof (s.textContent as any).headline === 'string') {
      // OK — structured object
    } else {
      return false;
    }
    if (typeof s.fullPrompt !== 'string') return false;
  }
  
  return record.slides.length > 0;
}

// ============================================
// Generic Validation Helper
// ============================================

export type ResponseValidator<T> = (data: unknown) => data is T;

export function createValidatedResponse<T>(
  raw: unknown,
  validator: ResponseValidator<T>,
  normalizer?: (data: unknown) => T | null
): T | null {
  // Try normalizer first if provided
  if (normalizer) {
    const normalized = normalizer(raw);
    if (normalized && validator(normalized)) {
      return normalized;
    }
  }
  
  // Direct validation
  if (validator(raw)) {
    return raw;
  }
  
  return null;
}
