import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

/**
 * Industry Memory Types - Unified interface for v1 and v2.1
 */
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
    cta_policy?: 'soft' | 'medium' | 'hard';
  };
  channel_settings: Record<string, {
    risk_level: 'low' | 'medium' | 'high';
    notes: string;
  }>;
  // Extended metadata
  metadata: {
    applies_to: string[];
    legal_basis: string[];
  };
  // Argument patterns for AI reasoning
  argument_patterns: {
    valid_patterns: string[];
    forbidden_patterns: string[];
  };
  // System rules (highest priority)
  system_rules: string[];
  // Translation fields
  name: string;
  brand_positioning: string | null;
  preferred_words: string[];
  forbidden_words: string[]; // Soft suggestions
  // V2.1 specific fields
  jurisdiction_code?: string;
  disclaimer?: string;
  industry_level?: 'core' | 'sub';
  // Source tracking (for debugging)
  _source?: 'v2.1' | 'v1-legacy';
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
 * Fetch from v2.1 architecture (industry_jurisdiction_profiles)
 */
async function fetchFromV2(
  globalPackId: string, 
  jurisdictionCode: string = 'VN'
): Promise<IndustryMemory | null> {
  try {
    // Fetch jurisdiction profile with resolved_rules
    const { data: profile, error } = await supabase
      .from('industry_jurisdiction_profiles')
      .select(`
        id,
        global_pack_id,
        jurisdiction_code,
        resolved_rules,
        disclaimer,
        validity_status,
        industry_global_packs!inner (
          id,
          industry_code,
          industry_level,
          target_audience,
          version
        )
      `)
      .eq('global_pack_id', globalPackId)
      .eq('jurisdiction_code', jurisdictionCode)
      .maybeSingle();

    if (error || !profile) {
      // Try fallback to VN if different jurisdiction not found
      if (jurisdictionCode !== 'VN') {
        console.log(`[v2.1] Profile not found for ${jurisdictionCode}, trying VN fallback`);
        return fetchFromV2(globalPackId, 'VN');
      }
      console.warn(`[v2.1] No profile found for global_pack_id: ${globalPackId}`);
      return null;
    }

    const resolvedRules = (profile.resolved_rules || {}) as Record<string, any>;
    const globalPack = (profile as any).industry_global_packs;

    // Map resolved_rules to IndustryMemory interface
    return {
      id: globalPackId,
      code: resolvedRules.industry_code || globalPack?.industry_code || '',
      version: globalPack?.version || '1.0',
      target_audience: (resolvedRules.target_audience || globalPack?.target_audience || 'both') as 'B2B' | 'B2C' | 'both',
      
      // Compliance rules from resolved
      compliance_rules: Array.isArray(resolvedRules.compliance_rules)
        ? resolvedRules.compliance_rules.map((r: any) => typeof r === 'string' ? r : r.rule || '')
        : [],
      claim_restrictions: Array.isArray(resolvedRules.claim_restrictions)
        ? resolvedRules.claim_restrictions.map((c: any) => typeof c === 'string' ? c : c.claim || '')
        : [],
      forbidden_terms: resolvedRules.terminology?.forbidden_terms || [],
      
      // Brand voice
      brand_voice: resolvedRules.brand_voice || {},
      channel_settings: {},
      
      // Metadata
      metadata: {
        applies_to: resolvedRules.metadata?.applies_to || [],
        legal_basis: resolvedRules.metadata?.legal_basis || [],
      },
      argument_patterns: resolvedRules.argument_patterns || { valid_patterns: [], forbidden_patterns: [] },
      system_rules: resolvedRules.system_rules || [],
      
      // Names from resolved
      name: resolvedRules.names?.vi || resolvedRules.names?.en || resolvedRules.industry_code || globalPack?.industry_code || '',
      brand_positioning: null,
      preferred_words: resolvedRules.terminology?.preferred_terms || [],
      forbidden_words: resolvedRules.terminology?.forbidden_words_local || [],
      
      // V2.1 specific
      jurisdiction_code: jurisdictionCode,
      disclaimer: profile.disclaimer || resolvedRules.disclaimer,
      industry_level: globalPack?.industry_level,
      _source: 'v2.1',
    };
  } catch (err) {
    console.error('[v2.1] Error fetching from jurisdiction profile:', err);
    return null;
  }
}

/**
 * Fetch from v1 architecture (industry_templates) - LEGACY
 */
async function fetchFromV1(
  industryTemplateId: string,
  languageCode: string = 'vi'
): Promise<IndustryMemory | null> {
  console.warn(`[v1-legacy] Using deprecated industry_templates for: ${industryTemplateId}`);
  
  try {
    const fetchWithLanguage = async (lang: string) => {
      return await supabase
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
            brand_positioning,
            preferred_words,
            forbidden_words
          )
        `)
        .eq('id', industryTemplateId)
        .eq('status', 'stable')
        .eq('industry_template_translations.language_code', lang)
        .maybeSingle();
    };

    let { data, error } = await fetchWithLanguage(languageCode);

    // Fallback to 'en' if not found
    if (!data && languageCode !== 'en') {
      const fallbackResult = await fetchWithLanguage('en');
      data = fallbackResult.data;
      error = fallbackResult.error;
    }

    if (error || !data) {
      if (error?.code === 'PGRST116' || !data) {
        console.warn(`[v1-legacy] Industry Memory ${industryTemplateId} not found or not stable`);
      }
      return null;
    }

    const rawData = data as any;
    const translation = rawData.industry_template_translations?.[0];
    
    const complianceRules: string[] = Array.isArray(rawData.compliance_rules) 
      ? rawData.compliance_rules.map((r: unknown) => typeof r === 'string' ? r : (r as { rule: string }).rule)
      : [];
    
    const claimRestrictions: string[] = Array.isArray(rawData.claim_restrictions)
      ? rawData.claim_restrictions.map((c: unknown) => typeof c === 'string' ? c : (c as { claim: string }).claim)
      : [];

    return {
      id: rawData.id,
      code: rawData.code,
      version: rawData.version || '1.0',
      target_audience: rawData.target_audience as 'B2B' | 'B2C' | 'both',
      compliance_rules: complianceRules,
      claim_restrictions: claimRestrictions,
      forbidden_terms: rawData.forbidden_terms || [],
      brand_voice: rawData.brand_voice || {},
      channel_settings: rawData.channel_settings || {},
      metadata: rawData.metadata || { applies_to: [], legal_basis: [] },
      argument_patterns: rawData.argument_patterns || { valid_patterns: [], forbidden_patterns: [] },
      system_rules: rawData.system_rules || [],
      name: translation?.name || rawData.code,
      brand_positioning: translation?.brand_positioning || null,
      preferred_words: translation?.preferred_words || [],
      forbidden_words: translation?.forbidden_words || [],
      _source: 'v1-legacy',
    };
  } catch (err) {
    console.error('[v1-legacy] Error fetching Industry Memory:', err);
    return null;
  }
}

/**
 * Hook for fetching and merging Industry Memory
 * 
 * PRIORITY CASCADE (CRITICAL):
 * 1. Industry Memory (LOCKED - cannot be overridden)
 * 2. Brand Voice (customizable, but cannot violate Industry)
 * 3. Channel Rules
 * 4. System Defaults
 * 
 * DUAL-PATH FETCHING (v2.1 Migration):
 * 1. Check global_pack_id first (v2.1 - preferred)
 * 2. Fallback to industry_template_id (v1 - legacy)
 */
export function useIndustryMemory() {
  /**
   * Fetch Industry Memory - tries v2.1 first, falls back to v1
   */
  const fetchIndustryMemory = useCallback(async (
    industryTemplateId: string,
    languageCode: string = 'vi'
  ): Promise<IndustryMemory | null> => {
    // This is a direct fetch by ID - use v1 path
    // For v2.1, use fetchIndustryMemoryV2 instead
    return fetchFromV1(industryTemplateId, languageCode);
  }, []);

  /**
   * Merge Industry Memory with Brand Voice
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
      ].filter((v, i, a) => a.indexOf(v) === i),
      
      // ✅ Merged: Industry + Brand
      preferred_words: [
        ...industryMemory.preferred_words,
        ...(brandVoice.preferred_words || []),
      ].filter((v, i, a) => a.indexOf(v) === i),
      
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
   */
  const validateBrandAgainstIndustry = useCallback((
    industryMemory: IndustryMemory,
    brandPreferredWords: string[]
  ): { term: string; reason?: string }[] => {
    const conflicts: { term: string; reason?: string }[] = [];
    const forbiddenTerms = industryMemory.forbidden_terms;
    
    brandPreferredWords.forEach(word => {
      const matchedTerm = forbiddenTerms.find(term => 
        word.toLowerCase().includes(term.toLowerCase())
      );
      
      if (matchedTerm) {
        conflicts.push({
          term: word,
          reason: `Vi phạm từ cấm ngành "${matchedTerm}" theo quy định ${industryMemory.name}`,
        });
      }
    });
    
    return conflicts;
  }, []);

  /**
   * Detect Industry violations in generated content
   */
  const detectContentViolations = useCallback((
    content: string,
    industryMemory: IndustryMemory
  ): { term: string; context: string }[] => {
    const violations: { term: string; context: string }[] = [];
    
    industryMemory.forbidden_terms.forEach(term => {
      const regex = new RegExp(term, 'gi');
      if (regex.test(content)) {
        const match = content.match(new RegExp(`.{0,30}${term}.{0,30}`, 'gi'));
        violations.push({
          term,
          context: match?.[0] || term,
        });
      }
    });
    
    return violations;
  }, []);

  return {
    fetchIndustryMemory,
    mergeWithBrandVoice,
    validateBrandAgainstIndustry,
    detectContentViolations,
  };
}

/**
 * Hook to fetch IndustryMemory for a given brand template ID
 * Uses DUAL-PATH: v2.1 (global_pack_id) → v1 fallback (industry_template_id)
 */
export function useIndustryMemoryForBrand(
  brandTemplateId?: string | null,
  jurisdictionCode: string = 'VN'
) {
  return useQuery({
    queryKey: ['industryMemory', 'brand', brandTemplateId, jurisdictionCode],
    queryFn: async () => {
      if (!brandTemplateId) return null;

      // Fetch brand template to get pack IDs
      const { data: brandData, error: brandError } = await supabase
        .from('brand_templates')
        .select('global_pack_id, industry_template_id')
        .eq('id', brandTemplateId)
        .single();

      if (brandError || !brandData) {
        console.error('Failed to fetch brand template:', brandError);
        return null;
      }

      // TRY V2.1 FIRST (global_pack_id)
      if (brandData.global_pack_id) {
        const v2Result = await fetchFromV2(brandData.global_pack_id, jurisdictionCode);
        if (v2Result) {
          console.log(`[useIndustryMemoryForBrand] Using v2.1 path for brand ${brandTemplateId}`);
          return v2Result;
        }
      }

      // FALLBACK TO V1 (industry_template_id)
      if (brandData.industry_template_id) {
        console.log(`[useIndustryMemoryForBrand] Falling back to v1 for brand ${brandTemplateId}`);
        return fetchFromV1(brandData.industry_template_id);
      }

      return null;
    },
    enabled: !!brandTemplateId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch IndustryMemory directly by industry_template_id (v1)
 * Used by Carousel, Script viewers that store industry_template_id directly
 */
export function useIndustryMemoryById(industryTemplateId?: string | null) {
  return useQuery({
    queryKey: ['industryMemory', 'direct', industryTemplateId],
    queryFn: async () => {
      if (!industryTemplateId) return null;
      return fetchFromV1(industryTemplateId);
    },
    enabled: !!industryTemplateId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * NEW: Hook to fetch IndustryMemory by global_pack_id (v2.1)
 * Preferred for new implementations
 */
export function useIndustryMemoryByGlobalPack(
  globalPackId?: string | null,
  jurisdictionCode: string = 'VN'
) {
  return useQuery({
    queryKey: ['industryMemory', 'v2', globalPackId, jurisdictionCode],
    queryFn: async () => {
      if (!globalPackId) return null;
      return fetchFromV2(globalPackId, jurisdictionCode);
    },
    enabled: !!globalPackId,
    staleTime: 5 * 60 * 1000,
  });
}
