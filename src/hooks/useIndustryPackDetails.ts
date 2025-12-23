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
}

/**
 * Hook to fetch full details of an Industry Pack including new fields
 */
export function useIndustryPackDetails(packId: string | null, languageCode: string = 'vi') {
  return useQuery({
    queryKey: ['industry-pack-details', packId, languageCode],
    queryFn: async (): Promise<IndustryPackDetails | null> => {
      if (!packId) return null;

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
        console.error('Error fetching pack details:', error);
        throw error;
      }

      if (!data) return null;

      // Cast to access all fields
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
      };
    },
    enabled: !!packId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
