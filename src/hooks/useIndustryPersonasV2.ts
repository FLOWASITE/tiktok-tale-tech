/**
 * useIndustryPersonasV2 - CRUD hooks for Industry Personas linked to Global Packs
 * Part of Industry Park v2.1 Architecture
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { 
  IndustryPersonaV2, 
  IndustryPersonaTranslationV2,
  IndustryPersonaWithPack,
  IndustryPersonaFormData,
  ResolvedPersona,
  DeviceUsage,
  ContentPreferencesV2,
  JourneyStage,
  CountryVariants,
} from '@/types/industryPersonaV2';
import { resolvePersonaForJurisdiction } from '@/types/industryPersonaV2';
import type { Json } from '@/integrations/supabase/types';

// ===========================================
// Query Keys
// ===========================================

export const industryPersonaV2Keys = {
  all: ['industry-personas-v2'] as const,
  lists: () => [...industryPersonaV2Keys.all, 'list'] as const,
  list: (globalPackId: string) => [...industryPersonaV2Keys.lists(), globalPackId] as const,
  details: () => [...industryPersonaV2Keys.all, 'detail'] as const,
  detail: (id: string) => [...industryPersonaV2Keys.details(), id] as const,
  translations: (personaId: string) => [...industryPersonaV2Keys.all, 'translations', personaId] as const,
};

// ===========================================
// Type Converters (Supabase Json -> Our Types)
// ===========================================

const parseDeviceUsage = (json: Json | null): DeviceUsage => {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return {};
  return json as unknown as DeviceUsage;
};

const parseContentPreferences = (json: Json | null): ContentPreferencesV2 => {
  if (!json || typeof json !== 'object' || Array.isArray(json)) {
    return { format: 'medium', visual: true, practical: true };
  }
  return json as unknown as ContentPreferencesV2;
};

const parseJourneyStages = (json: Json | null): JourneyStage[] => {
  if (!json || !Array.isArray(json)) return [];
  return json as unknown as JourneyStage[];
};

const parseCountryVariants = (json: Json | null): CountryVariants => {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return {};
  return json as unknown as CountryVariants;
};

const convertDbRowToPersona = (row: Record<string, unknown>): IndustryPersonaV2 => ({
  id: row.id as string,
  global_pack_id: row.global_pack_id as string,
  name: row.name as string,
  description: row.description as string | null,
  avatar_url: row.avatar_url as string | null,
  is_active: row.is_active as boolean,
  sort_order: row.sort_order as number,
  age_range: row.age_range as string | null,
  gender: row.gender as string | null,
  income_level: row.income_level as string | null,
  education_level: row.education_level as string | null,
  occupation: row.occupation as string | null,
  location_type: row.location_type as string | null,
  family_status: row.family_status as string | null,
  values: (row.values as string[]) || [],
  interests: (row.interests as string[]) || [],
  lifestyle: row.lifestyle as string | null,
  personality_traits: (row.personality_traits as string[]) || [],
  buying_motivation: (row.buying_motivation as string[]) || [],
  decision_factors: (row.decision_factors as string[]) || [],
  price_sensitivity: row.price_sensitivity as string | null,
  purchase_frequency: row.purchase_frequency as string | null,
  preferred_channels: (row.preferred_channels as string[]) || [],
  device_usage: parseDeviceUsage(row.device_usage as Json),
  tech_savviness: row.tech_savviness as string | null,
  social_platforms: (row.social_platforms as string[]) || [],
  content_consumption: (row.content_consumption as string[]) || [],
  communication_style: row.communication_style as string | null,
  response_tone_hints: (row.response_tone_hints as string[]) || [],
  content_preferences: parseContentPreferences(row.content_preferences as Json),
  journey_stages: parseJourneyStages(row.journey_stages as Json),
  pain_points: (row.pain_points as string[]) || [],
  goals: (row.goals as string[]) || [],
  objections: (row.objections as string[]) || [],
  country_variants: parseCountryVariants(row.country_variants as Json),
  created_at: row.created_at as string,
  updated_at: row.updated_at as string,
  created_by: row.created_by as string | null,
});

const convertDbRowToPersonaWithPack = (row: Record<string, unknown>): IndustryPersonaWithPack => ({
  ...convertDbRowToPersona(row),
  global_pack: row.global_pack as IndustryPersonaWithPack['global_pack'],
});

// ===========================================
// Fetch Personas by Global Pack
// ===========================================

export const useIndustryPersonasV2 = (globalPackId: string | undefined) => {
  return useQuery({
    queryKey: industryPersonaV2Keys.list(globalPackId || ''),
    queryFn: async (): Promise<IndustryPersonaV2[]> => {
      if (!globalPackId) return [];
      
      const { data, error } = await supabase
        .from('industry_personas_v2')
        .select('*')
        .eq('global_pack_id', globalPackId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return (data || []).map(row => convertDbRowToPersona(row as Record<string, unknown>));
    },
    enabled: !!globalPackId,
  });
};

// ===========================================
// Fetch Single Persona with Details
// ===========================================

export const useIndustryPersonaV2 = (personaId: string | undefined) => {
  return useQuery({
    queryKey: industryPersonaV2Keys.detail(personaId || ''),
    queryFn: async (): Promise<IndustryPersonaWithPack | null> => {
      if (!personaId) return null;
      
      const { data, error } = await supabase
        .from('industry_personas_v2')
        .select(`
          *,
          global_pack:industry_global_packs(id, industry_code, target_audience)
        `)
        .eq('id', personaId)
        .single();
      
      if (error) throw error;
      return convertDbRowToPersonaWithPack(data as Record<string, unknown>);
    },
    enabled: !!personaId,
  });
};

// ===========================================
// Fetch Translations for Persona
// ===========================================

export const useIndustryPersonaTranslationsV2 = (personaId: string | undefined) => {
  return useQuery({
    queryKey: industryPersonaV2Keys.translations(personaId || ''),
    queryFn: async (): Promise<IndustryPersonaTranslationV2[]> => {
      if (!personaId) return [];
      
      const { data, error } = await supabase
        .from('industry_persona_translations_v2')
        .select('*')
        .eq('persona_id', personaId);
      
      if (error) throw error;
      return (data || []) as IndustryPersonaTranslationV2[];
    },
    enabled: !!personaId,
  });
};

// ===========================================
// Fetch All Personas (Admin)
// ===========================================

export const useAllIndustryPersonasV2 = () => {
  return useQuery({
    queryKey: industryPersonaV2Keys.lists(),
    queryFn: async (): Promise<IndustryPersonaWithPack[]> => {
      const { data, error } = await supabase
        .from('industry_personas_v2')
        .select(`
          *,
          global_pack:industry_global_packs(id, industry_code, target_audience)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []).map(row => convertDbRowToPersonaWithPack(row as Record<string, unknown>));
    },
  });
};

// ===========================================
// Create Persona
// ===========================================

export const useCreateIndustryPersonaV2 = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (formData: IndustryPersonaFormData): Promise<IndustryPersonaV2> => {
      const { data: user } = await supabase.auth.getUser();
      
      const insertData = {
        global_pack_id: formData.global_pack_id,
        name: formData.name,
        description: formData.description || null,
        avatar_url: formData.avatar_url || null,
        is_active: formData.is_active,
        sort_order: formData.sort_order,
        age_range: formData.age_range || null,
        gender: formData.gender || null,
        income_level: formData.income_level || null,
        education_level: formData.education_level || null,
        occupation: formData.occupation || null,
        location_type: formData.location_type || null,
        family_status: formData.family_status || null,
        values: formData.values,
        interests: formData.interests,
        lifestyle: formData.lifestyle || null,
        personality_traits: formData.personality_traits,
        buying_motivation: formData.buying_motivation,
        decision_factors: formData.decision_factors,
        price_sensitivity: formData.price_sensitivity || null,
        purchase_frequency: formData.purchase_frequency || null,
        preferred_channels: formData.preferred_channels,
        device_usage: formData.device_usage as unknown as Json,
        tech_savviness: formData.tech_savviness || null,
        social_platforms: formData.social_platforms,
        content_consumption: formData.content_consumption,
        communication_style: formData.communication_style || null,
        response_tone_hints: formData.response_tone_hints,
        content_preferences: formData.content_preferences as unknown as Json,
        journey_stages: formData.journey_stages as unknown as Json,
        pain_points: formData.pain_points,
        goals: formData.goals,
        objections: formData.objections,
        country_variants: formData.country_variants as unknown as Json,
        created_by: user.user?.id || null,
      };
      
      const { data, error } = await supabase
        .from('industry_personas_v2')
        .insert(insertData)
        .select()
        .single();
      
      if (error) throw error;
      return convertDbRowToPersona(data as Record<string, unknown>);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: industryPersonaV2Keys.lists() });
      queryClient.invalidateQueries({ queryKey: industryPersonaV2Keys.list(data.global_pack_id) });
    },
  });
};

// ===========================================
// Update Persona
// ===========================================

export const useUpdateIndustryPersonaV2 = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      updates 
    }: { 
      id: string; 
      updates: Partial<IndustryPersonaFormData> 
    }): Promise<IndustryPersonaV2> => {
      // Convert typed objects to Json for Supabase
      const dbUpdates: Record<string, unknown> = { ...updates };
      if (updates.device_usage) {
        dbUpdates.device_usage = updates.device_usage as unknown as Json;
      }
      if (updates.content_preferences) {
        dbUpdates.content_preferences = updates.content_preferences as unknown as Json;
      }
      if (updates.journey_stages) {
        dbUpdates.journey_stages = updates.journey_stages as unknown as Json;
      }
      if (updates.country_variants) {
        dbUpdates.country_variants = updates.country_variants as unknown as Json;
      }
      
      const { data, error } = await supabase
        .from('industry_personas_v2')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return convertDbRowToPersona(data as Record<string, unknown>);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: industryPersonaV2Keys.lists() });
      queryClient.invalidateQueries({ queryKey: industryPersonaV2Keys.list(data.global_pack_id) });
      queryClient.invalidateQueries({ queryKey: industryPersonaV2Keys.detail(data.id) });
    },
  });
};

// ===========================================
// Delete Persona (Soft delete via is_active)
// ===========================================

export const useDeleteIndustryPersonaV2 = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('industry_personas_v2')
        .update({ is_active: false })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: industryPersonaV2Keys.lists() });
    },
  });
};

// ===========================================
// Bulk Create Personas
// ===========================================

export const useBulkCreateIndustryPersonasV2 = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (personas: IndustryPersonaFormData[]): Promise<IndustryPersonaV2[]> => {
      const { data: user } = await supabase.auth.getUser();
      
      const insertData = personas.map(formData => ({
        global_pack_id: formData.global_pack_id,
        name: formData.name,
        description: formData.description || null,
        avatar_url: formData.avatar_url || null,
        is_active: formData.is_active,
        sort_order: formData.sort_order,
        age_range: formData.age_range || null,
        gender: formData.gender || null,
        income_level: formData.income_level || null,
        education_level: formData.education_level || null,
        occupation: formData.occupation || null,
        location_type: formData.location_type || null,
        family_status: formData.family_status || null,
        values: formData.values,
        interests: formData.interests,
        lifestyle: formData.lifestyle || null,
        personality_traits: formData.personality_traits,
        buying_motivation: formData.buying_motivation,
        decision_factors: formData.decision_factors,
        price_sensitivity: formData.price_sensitivity || null,
        purchase_frequency: formData.purchase_frequency || null,
        preferred_channels: formData.preferred_channels,
        device_usage: formData.device_usage as unknown as Json,
        tech_savviness: formData.tech_savviness || null,
        social_platforms: formData.social_platforms,
        content_consumption: formData.content_consumption,
        communication_style: formData.communication_style || null,
        response_tone_hints: formData.response_tone_hints,
        content_preferences: formData.content_preferences as unknown as Json,
        journey_stages: formData.journey_stages as unknown as Json,
        pain_points: formData.pain_points,
        goals: formData.goals,
        objections: formData.objections,
        country_variants: formData.country_variants as unknown as Json,
        created_by: user.user?.id || null,
      }));
      
      const { data, error } = await supabase
        .from('industry_personas_v2')
        .insert(insertData)
        .select();
      
      if (error) throw error;
      return (data || []).map(row => convertDbRowToPersona(row as Record<string, unknown>));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: industryPersonaV2Keys.lists() });
    },
  });
};

// ===========================================
// Fetch Resolved Personas for AI Generation
// ===========================================

export const useResolvedPersonas = (
  globalPackId: string | undefined,
  jurisdictionCode: string = 'VN'
) => {
  return useQuery({
    queryKey: [...industryPersonaV2Keys.list(globalPackId || ''), 'resolved', jurisdictionCode],
    queryFn: async (): Promise<ResolvedPersona[]> => {
      if (!globalPackId) return [];
      
      const { data, error } = await supabase
        .from('industry_personas_v2')
        .select('*')
        .eq('global_pack_id', globalPackId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .limit(5); // Max 5 personas in resolved_rules
      
      if (error) throw error;
      
      // Convert and apply jurisdiction-specific overrides
      const personas = (data || []).map(row => convertDbRowToPersona(row as Record<string, unknown>));
      return personas.map(persona => resolvePersonaForJurisdiction(persona, jurisdictionCode));
    },
    enabled: !!globalPackId,
  });
};

// ===========================================
// Legacy Fallback: Fetch from v1 table
// ===========================================

export const useIndustryPersonasLegacy = (industryTemplateId: string | undefined) => {
  return useQuery({
    queryKey: ['industry-personas-legacy', industryTemplateId],
    queryFn: async () => {
      if (!industryTemplateId) return [];
      
      const { data, error } = await supabase
        .from('industry_personas')
        .select('*')
        .eq('industry_template_id', industryTemplateId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!industryTemplateId,
  });
};

// ===========================================
// Dual-path Fetcher (v2 first, fallback v1)
// ===========================================

export const useIndustryPersonasDualPath = (
  globalPackId: string | undefined,
  industryTemplateId: string | undefined
) => {
  // Try v2 first
  const v2Query = useIndustryPersonasV2(globalPackId);
  
  // Fallback to v1 if v2 is empty
  const v1Query = useIndustryPersonasLegacy(
    v2Query.data?.length === 0 ? industryTemplateId : undefined
  );
  
  return {
    data: v2Query.data?.length ? v2Query.data : v1Query.data,
    isLoading: v2Query.isLoading || v1Query.isLoading,
    error: v2Query.error || v1Query.error,
    source: v2Query.data?.length ? 'v2' : 'v1',
  };
};

// ===========================================
// Count Personas for Global Pack
// ===========================================

export const useIndustryPersonasCount = (globalPackId: string | undefined) => {
  return useQuery({
    queryKey: [...industryPersonaV2Keys.list(globalPackId || ''), 'count'],
    queryFn: async (): Promise<number> => {
      if (!globalPackId) return 0;
      
      const { count, error } = await supabase
        .from('industry_personas_v2')
        .select('*', { count: 'exact', head: true })
        .eq('global_pack_id', globalPackId)
        .eq('is_active', true);
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!globalPackId,
  });
};
