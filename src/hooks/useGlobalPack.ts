/**
 * useGlobalPack - v2 Hook for fetching Global Pack data
 * 
 * Provides access to industry_global_packs with translations and jurisdiction profiles.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { JurisdictionCode } from '@/types/industryParkV2';

// ============== TYPES ==============

export interface GlobalPackData {
  id: string;
  industryCode: string;
  categoryId: string;
  targetAudience: 'B2B' | 'B2C' | 'both';
  isActive: boolean;
  version: string;
  globalBrandVoice: Record<string, unknown>;
  globalTerminology: Record<string, unknown>;
  globalComplianceRules: unknown[];
  globalClaimRestrictions: unknown[];
  globalArgumentPatterns: Record<string, unknown>;
  globalSystemRules: string[];
  riskGuidelines: Record<string, unknown>;
  relatedIndustries: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TranslationData {
  id: string;
  globalPackId: string;
  languageCode: string;
  name: string;
  shortName: string | null;
  preferredTerms: string[];
  forbiddenTerms: string[];
  glossary: Record<string, string>;
}

export interface ProfileData {
  id: string;
  globalPackId: string;
  jurisdictionCode: string;
  resolvedRules: Record<string, unknown>;
  validityStatus: 'current' | 'superseded' | 'pending';
  lastVerifiedDate: string | null;
  disclaimer: string | null;
}

export interface GlobalPackWithDetails {
  pack: GlobalPackData;
  translations: Record<string, TranslationData>;
  profiles: ProfileData[];
}

export interface GlobalPackListItem {
  id: string;
  industryCode: string;
  categoryId: string;
  targetAudience: 'B2B' | 'B2C' | 'both';
  isActive: boolean;
  version: string;
  name: string; // From translation
  profileCount: number;
  isPopular: boolean;
  popularSortOrder: number | null;
}

// ============== FETCH FUNCTIONS ==============

async function fetchGlobalPack(
  packId: string,
  languageCode: string = 'vi'
): Promise<GlobalPackWithDetails | null> {
  // Fetch global pack with all related data
  const { data, error } = await supabase
    .from('industry_global_packs')
    .select(`
      *,
      industry_pack_translations (*),
      industry_jurisdiction_profiles (*)
    `)
    .eq('id', packId)
    .single();

  if (error) {
    console.error('Failed to fetch global pack:', error);
    return null;
  }

  if (!data) return null;

  // Parse pack data
  const pack: GlobalPackData = {
    id: data.id,
    industryCode: data.industry_code,
    categoryId: data.category_id,
    targetAudience: data.target_audience as 'B2B' | 'B2C' | 'both',
    isActive: data.is_active ?? true,
    version: data.version || '1.0',
    globalBrandVoice: (data.global_brand_voice as Record<string, unknown>) || {},
    globalTerminology: (data.global_terminology as Record<string, unknown>) || {},
    globalComplianceRules: (data.global_compliance_rules as unknown[]) || [],
    globalClaimRestrictions: (data.global_claim_restrictions as unknown[]) || [],
    globalArgumentPatterns: (data.global_argument_patterns as Record<string, unknown>) || {},
    globalSystemRules: (data.global_system_rules as string[]) || [],
    riskGuidelines: (data.risk_guidelines as Record<string, unknown>) || {},
    relatedIndustries: data.related_industries || [],
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };

  // Parse translations into a map
  const translations: Record<string, TranslationData> = {};
  const translationRows = (data.industry_pack_translations || []) as Array<{
    id: string;
    global_pack_id: string;
    language_code: string;
    name: string;
    short_name: string | null;
    preferred_terms: string[];
    forbidden_terms: string[];
    glossary: Record<string, string>;
  }>;

  translationRows.forEach(t => {
    translations[t.language_code] = {
      id: t.id,
      globalPackId: t.global_pack_id,
      languageCode: t.language_code,
      name: t.name,
      shortName: t.short_name,
      preferredTerms: t.preferred_terms || [],
      forbiddenTerms: t.forbidden_terms || [],
      glossary: (t.glossary as Record<string, string>) || {},
    };
  });

  // Parse profiles
  const profileRows = (data.industry_jurisdiction_profiles || []) as Array<{
    id: string;
    global_pack_id: string;
    jurisdiction_code: string;
    resolved_rules: Record<string, unknown>;
    validity_status: string;
    last_verified_date: string | null;
    disclaimer: string | null;
  }>;

  const profiles: ProfileData[] = profileRows.map(p => ({
    id: p.id,
    globalPackId: p.global_pack_id,
    jurisdictionCode: p.jurisdiction_code,
    resolvedRules: p.resolved_rules || {},
    validityStatus: p.validity_status as 'current' | 'superseded' | 'pending',
    lastVerifiedDate: p.last_verified_date,
    disclaimer: p.disclaimer,
  }));

  return { pack, translations, profiles };
}

async function fetchGlobalPacksList(
  filters?: {
    categoryId?: string;
    isActive?: boolean;
    search?: string;
  },
  languageCode: string = 'vi'
): Promise<GlobalPackListItem[]> {
  let query = supabase
    .from('industry_global_packs')
    .select(`
      id,
      industry_code,
      category_id,
      target_audience,
      is_active,
      version,
      industry_pack_translations!inner (name),
      industry_jurisdiction_profiles (id)
    `)
    .eq('industry_pack_translations.language_code', languageCode);

  if (filters?.categoryId) {
    query = query.eq('category_id', filters.categoryId);
  }
  if (filters?.isActive !== undefined) {
    query = query.eq('is_active', filters.isActive);
  }
  if (filters?.search) {
    query = query.ilike('industry_code', `%${filters.search}%`);
  }

  const { data, error } = await query.order('industry_code');

  if (error) {
    console.error('Failed to fetch global packs list:', error);
    return [];
  }

  return (data || []).map(row => {
    const translations = row.industry_pack_translations as unknown as { name: string }[];
    const profiles = row.industry_jurisdiction_profiles as unknown as { id: string }[];
    
    return {
      id: row.id,
      industryCode: row.industry_code,
      categoryId: row.category_id,
      targetAudience: row.target_audience as 'B2B' | 'B2C' | 'both',
      isActive: row.is_active ?? true,
      version: row.version || '1.0',
      name: translations[0]?.name || row.industry_code,
      profileCount: profiles?.length || 0,
    };
  });
}

async function fetchGlobalPackByIndustryCode(
  industryCode: string,
  languageCode: string = 'vi'
): Promise<GlobalPackWithDetails | null> {
  const { data, error } = await supabase
    .from('industry_global_packs')
    .select('id')
    .eq('industry_code', industryCode)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !data) {
    console.error('Failed to find global pack by code:', industryCode, error);
    return null;
  }

  return fetchGlobalPack(data.id, languageCode);
}

// ============== HOOKS ==============

/**
 * Fetch a single global pack with all details
 */
export function useGlobalPack(
  packId: string | null | undefined,
  languageCode: string = 'vi'
) {
  return useQuery({
    queryKey: ['globalPack', packId, languageCode],
    queryFn: () => fetchGlobalPack(packId!, languageCode),
    enabled: !!packId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Fetch global pack by its industry code
 */
export function useGlobalPackByCode(
  industryCode: string | null | undefined,
  languageCode: string = 'vi'
) {
  return useQuery({
    queryKey: ['globalPack', 'code', industryCode, languageCode],
    queryFn: () => fetchGlobalPackByIndustryCode(industryCode!, languageCode),
    enabled: !!industryCode,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Fetch list of global packs with optional filters
 */
export function useGlobalPacksList(
  filters?: {
    categoryId?: string;
    isActive?: boolean;
    search?: string;
  },
  languageCode: string = 'vi'
) {
  return useQuery({
    queryKey: ['globalPacksList', filters, languageCode],
    queryFn: () => fetchGlobalPacksList(filters, languageCode),
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Fetch global pack for a specific brand
 */
export function useGlobalPackForBrand(
  brandTemplateId: string | null | undefined,
  languageCode: string = 'vi'
) {
  return useQuery({
    queryKey: ['globalPack', 'brand', brandTemplateId, languageCode],
    queryFn: async () => {
      if (!brandTemplateId) return null;

      // First get the global_pack_id from brand
      const { data: brandData, error: brandError } = await supabase
        .from('brand_templates')
        .select('global_pack_id')
        .eq('id', brandTemplateId)
        .single();

      if (brandError || !brandData?.global_pack_id) {
        return null;
      }

      return fetchGlobalPack(brandData.global_pack_id, languageCode);
    },
    enabled: !!brandTemplateId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Mutation to update a global pack
 */
export function useUpdateGlobalPack() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      packId,
      updates,
    }: {
      packId: string;
      updates: Record<string, unknown>;
    }) => {
      const { data, error } = await supabase
        .from('industry_global_packs')
        .update({
          ...(updates as any),
          updated_at: new Date().toISOString(),
        })
        .eq('id', packId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['globalPack', variables.packId],
      });
      queryClient.invalidateQueries({
        queryKey: ['globalPacksList'],
      });
    },
  });
}
