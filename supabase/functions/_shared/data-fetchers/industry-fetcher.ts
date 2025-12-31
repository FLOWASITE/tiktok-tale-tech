// ============================================
// Industry Memory Fetcher
// ============================================

import { IndustryMemory } from "../types/chat-types.ts";

/**
 * Fetch industry memory from database with language fallback
 */
export async function fetchIndustryMemory(
  supabase: any,
  industryTemplateId: string,
  languageCode: string = 'vi'
): Promise<IndustryMemory | null> {
  try {
    // First try with requested language
    const { data: template, error } = await supabase
      .from('industry_templates')
      .select(`
        id, code, version, target_audience, is_active,
        compliance_rules, claim_restrictions, forbidden_terms,
        brand_voice, channel_settings, metadata,
        argument_patterns, system_rules, preferred_words, forbidden_words,
        industry_template_translations!inner (
          name, language_code
        )
      `)
      .eq('id', industryTemplateId)
      .eq('is_active', true)
      .eq('industry_template_translations.language_code', languageCode)
      .maybeSingle();

    if (error) {
      console.error('Error fetching industry memory:', error);
      return null;
    }

    // If no result with requested language, try fallback to English
    if (!template) {
      const { data: fallbackTemplate, error: fallbackError } = await supabase
        .from('industry_templates')
        .select(`
          id, code, version, target_audience, is_active,
          compliance_rules, claim_restrictions, forbidden_terms,
          brand_voice, channel_settings, metadata,
          argument_patterns, system_rules, preferred_words, forbidden_words,
          industry_template_translations!inner (
            name, language_code
          )
        `)
        .eq('id', industryTemplateId)
        .eq('is_active', true)
        .eq('industry_template_translations.language_code', 'en')
        .maybeSingle();

      if (fallbackError || !fallbackTemplate) {
        console.log('No industry template found for:', industryTemplateId);
        return null;
      }

      return {
        id: fallbackTemplate.id,
        code: fallbackTemplate.code,
        name: fallbackTemplate.industry_template_translations?.[0]?.name || fallbackTemplate.code,
        version: fallbackTemplate.version,
        target_audience: fallbackTemplate.target_audience || 'both',
        compliance_rules: fallbackTemplate.compliance_rules || [],
        claim_restrictions: fallbackTemplate.claim_restrictions || [],
        forbidden_terms: fallbackTemplate.forbidden_terms || [],
        brand_voice: fallbackTemplate.brand_voice || {},
        channel_settings: fallbackTemplate.channel_settings,
        metadata: fallbackTemplate.metadata,
        argument_patterns: fallbackTemplate.argument_patterns,
        system_rules: fallbackTemplate.system_rules || [],
        preferred_words: fallbackTemplate.preferred_words || [],
        forbidden_words: fallbackTemplate.forbidden_words || [],
      };
    }

    return {
      id: template.id,
      code: template.code,
      name: template.industry_template_translations?.[0]?.name || template.code,
      version: template.version,
      target_audience: template.target_audience || 'both',
      compliance_rules: template.compliance_rules || [],
      claim_restrictions: template.claim_restrictions || [],
      forbidden_terms: template.forbidden_terms || [],
      brand_voice: template.brand_voice || {},
      channel_settings: template.channel_settings,
      metadata: template.metadata,
      argument_patterns: template.argument_patterns,
      system_rules: template.system_rules || [],
      preferred_words: template.preferred_words || [],
      forbidden_words: template.forbidden_words || [],
    };
  } catch (error) {
    console.error('Error in fetchIndustryMemory:', error);
    return null;
  }
}
