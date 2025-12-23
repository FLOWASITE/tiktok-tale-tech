import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
// Note: Some columns may not be in generated types yet after recent migrations

export interface IndustryMemory {
  id: string;
  code: string;
  version: string;
  target_audience: 'B2B' | 'B2C' | 'both';
  // Compliance (LOCKED - cannot be overridden)
  compliance_rules: string[];
  claim_restrictions: string[];
  forbidden_terms: string[]; // Hard-locked from industry
  // Brand Voice baseline
  brand_voice: {
    tone_of_voice?: string[];
    formality_level?: string;
    language_style?: string[];
    allow_emoji?: boolean;
  };
  channel_settings: Record<string, unknown>;
  // Translation fields
  name: string;
  brand_positioning: string | null;
  preferred_words: string[];
  forbidden_words: string[]; // Soft suggestions
}

export interface MergedIndustryRules {
  // LOCKED from Industry (cannot be overridden)
  forbidden_terms: string[];
  compliance_rules: string[];
  claim_restrictions: string[];
  // Merged (Industry + Brand)
  forbidden_words: string[];
  preferred_words: string[];
  // Brand Voice (Industry baseline + Brand customization)
  tone_of_voice: string[];
  formality_level: string;
  language_style: string[];
  allow_emoji: boolean;
}

interface BrandVoice {
  brand_positioning?: string | null;
  tone_of_voice?: string[] | null;
  formality_level?: string | null;
  language_style?: string[] | null;
  preferred_words?: string[] | null;
  forbidden_words?: string[] | null;
  allow_emoji?: boolean;
}

/**
 * Hook for fetching and merging Industry Memory
 * 
 * PRIORITY CASCADE (CRITICAL):
 * 1. Industry Memory (LOCKED - cannot be overridden)
 * 2. Brand Voice (customizable, but cannot violate Industry)
 * 3. Channel Rules
 * 4. System Defaults
 */
export function useIndustryMemory() {
  /**
   * Fetch Industry Memory from database
   */
  const fetchIndustryMemory = useCallback(async (
    industryTemplateId: string,
    languageCode: string = 'vi'
  ): Promise<IndustryMemory | null> => {
    try {
      // Note: version, compliance_rules, claim_restrictions, forbidden_terms 
      // are new columns that may not be in generated types yet
      const { data, error } = await supabase
        .from('industry_templates')
        .select(`
          id,
          code,
          target_audience,
          brand_voice,
          channel_settings,
          industry_template_translations!inner (
            name,
            brand_positioning,
            preferred_words,
            forbidden_words
          )
        `)
        .eq('id', industryTemplateId)
        .eq('industry_template_translations.language_code', languageCode)
        .single();

      if (error || !data) {
        console.error('Failed to fetch Industry Memory:', error);
        return null;
      }

      // Cast to access new columns not in types yet
      const rawData = data as unknown as {
        id: string;
        code: string;
        target_audience: string;
        brand_voice: IndustryMemory['brand_voice'];
        channel_settings: Record<string, unknown>;
        version?: string;
        compliance_rules?: string[];
        claim_restrictions?: string[];
        industry_template_translations: Array<{
          name: string;
          brand_positioning: string | null;
          preferred_words: string[];
          forbidden_words: string[];
          forbidden_terms?: string[];
        }>;
      };

      const translation = rawData.industry_template_translations?.[0];

      return {
        id: rawData.id,
        code: rawData.code,
        version: rawData.version || '1.0',
        target_audience: rawData.target_audience as 'B2B' | 'B2C' | 'both',
        compliance_rules: rawData.compliance_rules || [],
        claim_restrictions: rawData.claim_restrictions || [],
        forbidden_terms: translation?.forbidden_terms || [],
        brand_voice: rawData.brand_voice || {},
        channel_settings: rawData.channel_settings || {},
        name: translation?.name || rawData.code,
        brand_positioning: translation?.brand_positioning || null,
        preferred_words: translation?.preferred_words || [],
        forbidden_words: translation?.forbidden_words || [],
      };
    } catch (err) {
      console.error('Error fetching Industry Memory:', err);
      return null;
    }
  }, []);

  /**
   * Merge Industry Memory with Brand Voice
   * 
   * CRITICAL: Industry Memory is LAW - cannot be overridden
   * - forbidden_terms: ONLY from Industry
   * - compliance_rules: ONLY from Industry
   * - claim_restrictions: ONLY from Industry
   * - forbidden_words: Union of Industry + Brand
   * - preferred_words: Union of Industry + Brand
   * - Brand Voice: Industry baseline + Brand customization
   */
  const mergeWithBrandVoice = useCallback((
    industryMemory: IndustryMemory,
    brandVoice: BrandVoice
  ): MergedIndustryRules => {
    return {
      // ⛔ LOCKED from Industry - CANNOT be overridden
      forbidden_terms: industryMemory.forbidden_terms,
      compliance_rules: industryMemory.compliance_rules,
      claim_restrictions: industryMemory.claim_restrictions,
      
      // ⚠️ Merged: Industry + Brand
      forbidden_words: [
        ...industryMemory.forbidden_words,
        ...(brandVoice.forbidden_words || []),
      ].filter((v, i, a) => a.indexOf(v) === i), // Unique
      
      // ✅ Merged: Industry + Brand
      preferred_words: [
        ...industryMemory.preferred_words,
        ...(brandVoice.preferred_words || []),
      ].filter((v, i, a) => a.indexOf(v) === i), // Unique
      
      // Brand Voice: Industry baseline + Brand customization
      tone_of_voice: brandVoice.tone_of_voice?.length 
        ? brandVoice.tone_of_voice 
        : industryMemory.brand_voice.tone_of_voice || [],
      formality_level: brandVoice.formality_level 
        || industryMemory.brand_voice.formality_level 
        || 'professional',
      language_style: brandVoice.language_style?.length 
        ? brandVoice.language_style 
        : industryMemory.brand_voice.language_style || [],
      allow_emoji: brandVoice.allow_emoji ?? industryMemory.brand_voice.allow_emoji ?? true,
    };
  }, []);

  /**
   * Validate Brand against Industry constraints
   * Returns list of conflicts
   */
  const validateBrandAgainstIndustry = useCallback((
    industryMemory: IndustryMemory,
    brandPreferredWords: string[]
  ): string[] => {
    const conflicts: string[] = [];
    
    // Check if brand preferred_words contains industry forbidden_terms
    const forbiddenTerms = industryMemory.forbidden_terms;
    
    const violatingWords = brandPreferredWords.filter(word => 
      forbiddenTerms.some(term => 
        word.toLowerCase().includes(term.toLowerCase())
      )
    );
    
    if (violatingWords.length > 0) {
      conflicts.push(`Từ ưa thích của Brand chứa từ cấm ngành: ${violatingWords.join(', ')}`);
    }
    
    return conflicts;
  }, []);

  return {
    fetchIndustryMemory,
    mergeWithBrandVoice,
    validateBrandAgainstIndustry,
  };
}
