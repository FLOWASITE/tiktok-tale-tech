import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface IndustryPackDetails {
  id: string;
  code: string;
  version: string;
  status: 'draft' | 'stable' | 'deprecated';
  target_audience: 'B2B' | 'B2C' | 'both';
  brand_voice: {
    tone_of_voice?: string[];
    formality_level?: string;
    language_style?: string[];
    allow_emoji?: boolean;
    cta_policy?: 'soft' | 'medium' | 'hard';
  };
  channel_settings: Record<string, {
    risk_level: 'low' | 'medium' | 'high';
    notes: string;
  }>;
  compliance_rules: Array<{ rule: string; severity: string }>;
  claim_restrictions: Array<{ claim: string; alternative: string | null }>;
  forbidden_terms: string[];
  // NEW fields
  metadata: {
    applies_to: string[];
    legal_basis: string[];
  };
  argument_patterns: {
    valid_patterns: string[];
    forbidden_patterns: string[];
  };
  system_rules: string[];
  // Translation
  name: string;
  short_name: string | null;
  preferred_words: string[];
  forbidden_words: string[];
  // V2.1 specific
  industry_level?: 'core' | 'sub';
  jurisdiction_code?: string;
  _source?: 'v2.1' | 'v1-legacy';
}

/**
 * Fetch from v2.1 architecture (industry_global_packs + jurisdiction_profiles)
 */
async function fetchFromV2(packId: string, languageCode: string = 'vi'): Promise<IndustryPackDetails | null> {
  try {
    // Fetch global pack with translations
    const { data: pack, error } = await supabase
      .from('industry_global_packs')
      .select(`
        id,
        industry_code,
        industry_level,
        target_audience,
        version,
        status,
        global_brand_voice,
        global_compliance_rules,
        global_claim_restrictions,
        global_terminology,
        global_argument_patterns,
        global_system_rules,
        industry_pack_translations (
          language_code,
          name,
          short_name,
          preferred_terms,
          forbidden_terms
        )
      `)
      .eq('id', packId)
      .maybeSingle();

    if (error || !pack) {
      return null;
    }

    const rawPack = pack as any;
    const translations = rawPack.industry_pack_translations || [];
    const translation = translations.find((t: any) => t.language_code === languageCode) 
      || translations.find((t: any) => t.language_code === 'vi')
      || translations[0];

    return {
      id: rawPack.id,
      code: rawPack.industry_code,
      version: rawPack.version || '1.0',
      status: rawPack.status || 'stable',
      target_audience: rawPack.target_audience || 'both',
      brand_voice: rawPack.global_brand_voice || {},
      channel_settings: {},
      compliance_rules: rawPack.global_compliance_rules || [],
      claim_restrictions: rawPack.global_claim_restrictions || [],
      forbidden_terms: rawPack.global_terminology?.forbidden_terms_global || [],
      metadata: { applies_to: [], legal_basis: [] },
      argument_patterns: rawPack.global_argument_patterns || { valid_patterns: [], forbidden_patterns: [] },
      system_rules: rawPack.global_system_rules || [],
      name: translation?.name || rawPack.industry_code,
      short_name: translation?.short_name || null,
      preferred_words: translation?.preferred_terms || [],
      forbidden_words: translation?.forbidden_terms || [],
      industry_level: rawPack.industry_level,
      _source: 'v2.1',
    };
  } catch (err) {
    console.error('[v2.1] Error fetching pack details:', err);
    return null;
  }
}

/**
 * Fetch from v1 architecture (industry_templates) - LEGACY
 */
async function fetchFromV1(packId: string, languageCode: string = 'vi'): Promise<IndustryPackDetails | null> {
  console.warn(`[v1-legacy] Using deprecated industry_templates for pack: ${packId}`);

  try {
    const { data, error } = await supabase
      .from('industry_templates')
      .select(`
        id,
        code,
        version,
        status,
        target_audience,
        brand_voice,
        channel_settings,
        compliance_rules,
        claim_restrictions,
        forbidden_terms,
        metadata,
        argument_patterns,
        system_rules,
        industry_template_translations!inner (
          name,
          short_name,
          preferred_words,
          forbidden_words
        )
      `)
      .eq('id', packId)
      .eq('industry_template_translations.language_code', languageCode)
      .single();

    if (error) {
      // Try fallback to 'en'
      if (languageCode !== 'en') {
        return fetchFromV1(packId, 'en');
      }
      console.error('Error fetching pack details:', error);
      return null;
    }

    if (!data) return null;

    const rawData = data as any;
    const translation = rawData.industry_template_translations?.[0];

    return {
      id: rawData.id,
      code: rawData.code,
      version: rawData.version || '1.0',
      status: rawData.status,
      target_audience: rawData.target_audience,
      brand_voice: rawData.brand_voice || {},
      channel_settings: rawData.channel_settings || {},
      compliance_rules: rawData.compliance_rules || [],
      claim_restrictions: rawData.claim_restrictions || [],
      forbidden_terms: rawData.forbidden_terms || [],
      metadata: rawData.metadata || { applies_to: [], legal_basis: [] },
      argument_patterns: rawData.argument_patterns || { valid_patterns: [], forbidden_patterns: [] },
      system_rules: rawData.system_rules || [],
      name: translation?.name || rawData.code,
      short_name: translation?.short_name || null,
      preferred_words: translation?.preferred_words || [],
      forbidden_words: translation?.forbidden_words || [],
      _source: 'v1-legacy',
    };
  } catch (err) {
    console.error('[v1-legacy] Error fetching pack details:', err);
    return null;
  }
}

/**
 * Hook to fetch full details of an Industry Pack
 * Uses DUAL-PATH: tries v2.1 first, falls back to v1
 */
export function useIndustryPackDetails(packId: string | null, languageCode: string = 'vi') {
  return useQuery({
    queryKey: ['industry-pack-details', packId, languageCode],
    queryFn: async (): Promise<IndustryPackDetails | null> => {
      if (!packId) return null;

      // Try v2.1 first (industry_global_packs)
      const v2Result = await fetchFromV2(packId, languageCode);
      if (v2Result) {
        return v2Result;
      }

      // Fallback to v1 (industry_templates)
      return fetchFromV1(packId, languageCode);
    },
    enabled: !!packId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to fetch pack details specifically by global_pack_id (v2.1)
 */
export function useGlobalPackDetails(globalPackId: string | null, languageCode: string = 'vi') {
  return useQuery({
    queryKey: ['global-pack-details', globalPackId, languageCode],
    queryFn: async (): Promise<IndustryPackDetails | null> => {
      if (!globalPackId) return null;
      return fetchFromV2(globalPackId, languageCode);
    },
    enabled: !!globalPackId,
    staleTime: 2 * 60 * 1000,
  });
}
