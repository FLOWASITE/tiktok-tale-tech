/**
 * useJurisdictionProfile - v2 Hook for fetching resolved jurisdiction rules
 * 
 * This replaces useIndustryMemory for the new multi-jurisdiction architecture.
 * Fetches pre-computed resolved_rules from industry_jurisdiction_profiles.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { 
  ResolvedRules, 
  JurisdictionCode,
} from '@/types/industryParkV2';

// ============== TYPES ==============

export interface JurisdictionProfileData {
  id: string;
  globalPackId: string;
  jurisdictionCode: string;
  resolvedRules: ResolvedRules;
  validityStatus: 'current' | 'superseded' | 'pending';
  lastVerifiedDate: string | null;
  disclaimer: string | null;
}

export interface GlobalPackInfo {
  id: string;
  industryCode: string;
  categoryId: string;
  targetAudience: 'B2B' | 'B2C' | 'both';
  version: string;
}

export interface ProfileWithGlobalPack extends JurisdictionProfileData {
  globalPack: GlobalPackInfo;
}

// ============== FETCH FUNCTIONS ==============

async function fetchProfileByGlobalPackAndJurisdiction(
  globalPackId: string,
  jurisdictionCode: string = 'VN'
): Promise<ProfileWithGlobalPack | null> {
  const { data, error } = await supabase
    .from('industry_jurisdiction_profiles')
    .select(`
      id,
      global_pack_id,
      jurisdiction_code,
      resolved_rules,
      validity_status,
      last_verified_date,
      disclaimer,
      industry_global_packs (
        id,
        industry_code,
        category_id,
        target_audience,
        version
      )
    `)
    .eq('global_pack_id', globalPackId)
    .eq('jurisdiction_code', jurisdictionCode)
    .eq('validity_status', 'current')
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch jurisdiction profile:', error);
    return null;
  }

  if (!data) return null;

  const globalPack = data.industry_global_packs as unknown as {
    id: string;
    industry_code: string;
    category_id: string;
    target_audience: 'B2B' | 'B2C' | 'both';
    version: string;
  };

  return {
    id: data.id,
    globalPackId: data.global_pack_id,
    jurisdictionCode: data.jurisdiction_code,
    resolvedRules: data.resolved_rules as unknown as ResolvedRules,
    validityStatus: data.validity_status as 'current' | 'superseded' | 'pending',
    lastVerifiedDate: data.last_verified_date,
    disclaimer: data.disclaimer,
    globalPack: {
      id: globalPack.id,
      industryCode: globalPack.industry_code,
      categoryId: globalPack.category_id,
      targetAudience: globalPack.target_audience,
      version: globalPack.version || '1.0',
    },
  };
}

async function fetchProfileForBrand(
  brandTemplateId: string,
  jurisdictionCode: string = 'VN'
): Promise<ProfileWithGlobalPack | null> {
  // First get the global_pack_id from brand_templates
  const { data: brandData, error: brandError } = await supabase
    .from('brand_templates')
    .select('global_pack_id')
    .eq('id', brandTemplateId)
    .single();

  if (brandError || !brandData?.global_pack_id) {
    console.warn('Brand has no global_pack_id:', brandTemplateId);
    return null;
  }

  return fetchProfileByGlobalPackAndJurisdiction(
    brandData.global_pack_id,
    jurisdictionCode
  );
}

async function fetchAvailableJurisdictions(
  globalPackId: string
): Promise<{ code: string; name: string; isValid: boolean }[]> {
  const { data, error } = await supabase
    .from('industry_jurisdiction_profiles')
    .select('jurisdiction_code, validity_status')
    .eq('global_pack_id', globalPackId);

  if (error || !data) {
    console.error('Failed to fetch jurisdictions:', error);
    return [];
  }

  // Map jurisdiction codes to names
  const jurisdictionNames: Record<string, string> = {
    VN: 'Việt Nam',
    US: 'United States',
    SG: 'Singapore',
    GLOBAL: 'Global (Default)',
    TH: 'Thailand',
    MY: 'Malaysia',
    ID: 'Indonesia',
    PH: 'Philippines',
    EU: 'European Union',
  };

  return data.map(row => ({
    code: row.jurisdiction_code,
    name: jurisdictionNames[row.jurisdiction_code] || row.jurisdiction_code,
    isValid: row.validity_status === 'current',
  }));
}

// ============== HOOKS ==============

/**
 * Fetch jurisdiction profile by global pack ID and jurisdiction code
 */
export function useJurisdictionProfile(
  globalPackId: string | null | undefined,
  jurisdictionCode: string = 'VN'
) {
  return useQuery({
    queryKey: ['jurisdictionProfile', globalPackId, jurisdictionCode],
    queryFn: () => fetchProfileByGlobalPackAndJurisdiction(globalPackId!, jurisdictionCode),
    enabled: !!globalPackId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Fetch jurisdiction profile for a brand template
 * Automatically resolves global_pack_id from brand_templates
 */
export function useJurisdictionProfileForBrand(
  brandTemplateId: string | null | undefined,
  jurisdictionCode: string = 'VN'
) {
  return useQuery({
    queryKey: ['jurisdictionProfile', 'brand', brandTemplateId, jurisdictionCode],
    queryFn: () => fetchProfileForBrand(brandTemplateId!, jurisdictionCode),
    enabled: !!brandTemplateId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Get list of available jurisdictions for a global pack
 */
export function useAvailableJurisdictions(globalPackId: string | null | undefined) {
  return useQuery({
    queryKey: ['availableJurisdictions', globalPackId],
    queryFn: () => fetchAvailableJurisdictions(globalPackId!),
    enabled: !!globalPackId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Mutation hook to trigger profile regeneration
 */
export function useRegenerateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      globalPackId, 
      jurisdictionCode 
    }: { 
      globalPackId: string; 
      jurisdictionCode: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('regenerate-profiles', {
        body: { 
          globalPackId, 
          jurisdictionCode,
          action: 'regenerate' 
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: ['jurisdictionProfile', variables.globalPackId],
      });
      queryClient.invalidateQueries({
        queryKey: ['availableJurisdictions', variables.globalPackId],
      });
    },
  });
}

/**
 * Helper hook to get just the resolved rules (most common use case)
 */
export function useResolvedRules(
  brandTemplateId: string | null | undefined,
  jurisdictionCode: string = 'VN'
): {
  rules: ResolvedRules | null;
  isLoading: boolean;
  error: Error | null;
  isStale: boolean;
} {
  const { data, isLoading, error } = useJurisdictionProfileForBrand(
    brandTemplateId,
    jurisdictionCode
  );

  return {
    rules: data?.resolvedRules ?? null,
    isLoading,
    error: error as Error | null,
    isStale: data?.validityStatus === 'superseded',
  };
}
