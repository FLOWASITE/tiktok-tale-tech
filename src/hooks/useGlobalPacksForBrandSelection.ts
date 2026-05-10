/**
 * useGlobalPacksForBrandSelection - Hook for selecting industry in brand form
 * 
 * Uses v2.1 architecture (industry_global_packs) instead of legacy industry_templates.
 * Returns data formatted for BrandFormQuickStart component.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface GlobalPackForSelection {
  id: string;
  code: string; // industry_code
  name: string;
  shortName: string | null;
  targetAudience: 'B2B' | 'B2C' | 'both';
  categoryId: string | null;
  categoryCode: string | null;
  brandVoice: {
    tone_of_voice: string[];
    formality_level: string;
    language_style: string[];
    allow_emoji: boolean;
  };
  brandPositioning: string | null;
  preferredTerms: string[];
  forbiddenTerms: string[];
  isActive: boolean;
  version: string;
  industryLevel: 'core' | 'sub';
  parentPackId: string | null;
  /** Search aliases (synonyms) for fuzzy matching */
  aliases: string[];
}

interface UseGlobalPacksOptions {
  languageCode?: string;
  categoryId?: string;
  includeSubIndustries?: boolean;
  enabled?: boolean;
}

async function fetchGlobalPacksForSelection(
  options: UseGlobalPacksOptions
): Promise<GlobalPackForSelection[]> {
  const { languageCode = 'vi', categoryId, includeSubIndustries = true } = options;

  let query = supabase
    .from('industry_global_packs')
    .select(`
      id,
      industry_code,
      target_audience,
      category_id,
      global_brand_voice,
      is_active,
      version,
      industry_level,
      parent_pack_id,
      sort_order,
      industry_categories (
        code
      ),
      industry_pack_translations!inner (
        name,
        short_name,
        preferred_terms,
        forbidden_terms
      ),
      industry_search_aliases (
        alias,
        language_code
      )
    `)
    .eq('is_active', true)
    .eq('industry_pack_translations.language_code', languageCode)
    .order('sort_order')
    .order('industry_code');

  // Filter by category if provided
  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  // Optionally exclude sub-industries
  if (!includeSubIndustries) {
    query = query.eq('industry_level', 'core');
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch global packs for selection:', error);
    return [];
  }

  return (data || []).map(pack => {
    const translation = (pack.industry_pack_translations as unknown as Array<{
      name: string;
      short_name: string | null;
      preferred_terms: string[];
      forbidden_terms: string[];
    }>)?.[0];

    const brandVoice = pack.global_brand_voice as {
      tone_of_voice?: string[];
      formality_level?: string;
      language_style?: string[];
      allow_emoji?: boolean;
    } | null;

    const category = pack.industry_categories as unknown as { code: string } | null;

    return {
      id: pack.id,
      code: pack.industry_code,
      name: translation?.name || pack.industry_code,
      shortName: translation?.short_name || null,
      targetAudience: pack.target_audience as 'B2B' | 'B2C' | 'both',
      categoryId: pack.category_id,
      categoryCode: category?.code || null,
      brandVoice: {
        tone_of_voice: Array.isArray(brandVoice?.tone_of_voice) ? brandVoice!.tone_of_voice! : [],
        formality_level: typeof brandVoice?.formality_level === 'string' ? brandVoice.formality_level : 'professional',
        language_style: Array.isArray(brandVoice?.language_style) ? brandVoice!.language_style! : [],
        allow_emoji: typeof brandVoice?.allow_emoji === 'boolean' ? brandVoice.allow_emoji : false,
      },
      brandPositioning: null, // Will be fetched from jurisdiction profile if needed
      preferredTerms: translation?.preferred_terms || [],
      forbiddenTerms: translation?.forbidden_terms || [],
      isActive: pack.is_active ?? true,
      version: pack.version || '1.0',
      industryLevel: (pack.industry_level as 'core' | 'sub') || 'core',
      parentPackId: pack.parent_pack_id,
    };
  });
}

/**
 * Main hook for fetching global packs for brand industry selection
 */
export function useGlobalPacksForBrandSelection(options: UseGlobalPacksOptions = {}) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: ['globalPacksForSelection', options.languageCode, options.categoryId, options.includeSubIndustries],
    queryFn: () => fetchGlobalPacksForSelection(options),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Get a specific global pack by ID with full details for applying to brand
 */
export async function fetchGlobalPackDetailsForBrand(
  globalPackId: string,
  jurisdictionCode: string = 'VN',
  languageCode: string = 'vi'
): Promise<{
  pack: GlobalPackForSelection;
  resolvedRules: Record<string, unknown> | null;
  disclaimer: string | null;
} | null> {
  // Fetch pack with translation and jurisdiction profile
  const { data: packData, error: packError } = await supabase
    .from('industry_global_packs')
    .select(`
      id,
      industry_code,
      target_audience,
      category_id,
      global_brand_voice,
      is_active,
      version,
      industry_level,
      parent_pack_id,
      industry_categories (code),
      industry_pack_translations!inner (
        name,
        short_name,
        preferred_terms,
        forbidden_terms
      )
    `)
    .eq('id', globalPackId)
    .eq('industry_pack_translations.language_code', languageCode)
    .single();

  if (packError || !packData) {
    console.error('Failed to fetch global pack details:', packError);
    return null;
  }

  // Fetch jurisdiction profile for resolved rules
  const { data: profileData } = await supabase
    .from('industry_jurisdiction_profiles')
    .select('resolved_rules, disclaimer')
    .eq('global_pack_id', globalPackId)
    .eq('jurisdiction_code', jurisdictionCode)
    .eq('validity_status', 'current')
    .maybeSingle();

  const translation = (packData.industry_pack_translations as unknown as Array<{
    name: string;
    short_name: string | null;
    preferred_terms: string[];
    forbidden_terms: string[];
  }>)?.[0];

  const brandVoice = packData.global_brand_voice as {
    tone_of_voice?: string[];
    formality_level?: string;
    language_style?: string[];
    allow_emoji?: boolean;
  } | null;

  const category = packData.industry_categories as unknown as { code: string } | null;

  const resolvedRules = profileData?.resolved_rules as Record<string, unknown> | null;

  // Extract brand_positioning from resolved_rules if available
  const brandPositioning = resolvedRules?.brand_voice 
    ? (resolvedRules.brand_voice as Record<string, unknown>)?.positioning as string || null
    : null;

  return {
    pack: {
      id: packData.id,
      code: packData.industry_code,
      name: translation?.name || packData.industry_code,
      shortName: translation?.short_name || null,
      targetAudience: packData.target_audience as 'B2B' | 'B2C' | 'both',
      categoryId: packData.category_id,
      categoryCode: category?.code || null,
      brandVoice: {
        tone_of_voice: brandVoice?.tone_of_voice || [],
        formality_level: brandVoice?.formality_level || 'professional',
        language_style: brandVoice?.language_style || [],
        allow_emoji: brandVoice?.allow_emoji ?? false,
      },
      brandPositioning,
      preferredTerms: translation?.preferred_terms || [],
      forbiddenTerms: translation?.forbidden_terms || [],
      isActive: packData.is_active ?? true,
      version: packData.version || '1.0',
      industryLevel: (packData.industry_level as 'core' | 'sub') || 'core',
      parentPackId: packData.parent_pack_id,
    },
    resolvedRules,
    disclaimer: profileData?.disclaimer || null,
  };
}
