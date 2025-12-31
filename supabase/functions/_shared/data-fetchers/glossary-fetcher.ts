// ============================================
// Industry Glossary Fetcher
// ============================================

import { GlossaryTerm } from "../types/chat-types.ts";

/**
 * Fetch industry glossary terms from database with language fallback
 */
export async function fetchIndustryGlossary(
  supabase: any,
  industryTemplateId: string,
  languageCode: string = 'vi',
  limit: number = 30
): Promise<GlossaryTerm[]> {
  try {
    const { data, error } = await supabase
      .from('industry_glossary')
      .select(`
        term, abbreviation, category, is_preferred, related_terms,
        industry_glossary_translations!inner (
          definition, example_usage, language_code
        )
      `)
      .eq('industry_template_id', industryTemplateId)
      .eq('is_active', true)
      .eq('industry_glossary_translations.language_code', languageCode)
      .order('is_preferred', { ascending: false })
      .order('sort_order', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Error fetching industry glossary:', error);
      return [];
    }

    if (!data?.length) {
      // Fallback to English if no results
      const { data: fallbackData } = await supabase
        .from('industry_glossary')
        .select(`
          term, abbreviation, category, is_preferred, related_terms,
          industry_glossary_translations!inner (
            definition, example_usage, language_code
          )
        `)
        .eq('industry_template_id', industryTemplateId)
        .eq('is_active', true)
        .eq('industry_glossary_translations.language_code', 'en')
        .order('is_preferred', { ascending: false })
        .order('sort_order', { ascending: true })
        .limit(limit);

      if (fallbackData?.length) {
        return fallbackData.map((g: any) => ({
          term: g.term,
          abbreviation: g.abbreviation,
          category: g.category,
          definition: g.industry_glossary_translations?.[0]?.definition || '',
          example_usage: g.industry_glossary_translations?.[0]?.example_usage,
          is_preferred: g.is_preferred,
          related_terms: g.related_terms || [],
        }));
      }
      return [];
    }

    return data.map((g: any) => ({
      term: g.term,
      abbreviation: g.abbreviation,
      category: g.category,
      definition: g.industry_glossary_translations?.[0]?.definition || '',
      example_usage: g.industry_glossary_translations?.[0]?.example_usage,
      is_preferred: g.is_preferred,
      related_terms: g.related_terms || [],
    }));
  } catch (error) {
    console.error('Error in fetchIndustryGlossary:', error);
    return [];
  }
}
