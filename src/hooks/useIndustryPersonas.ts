import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { IndustryPersona, IndustryPersonaTranslation, ContentPreferences, getDefaultContentPreferences } from '@/types/industryPersona';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

interface UseIndustryPersonasOptions {
  industryTemplateId?: string | null;
  enabled?: boolean;
}

export function useIndustryPersonas({ industryTemplateId, enabled = true }: UseIndustryPersonasOptions = {}) {
  const [personas, setPersonas] = useState<IndustryPersona[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { currentOrganization } = useOrganizationContext();

  // Transform DB row to IndustryPersona type
  const transformDbRow = (row: any): IndustryPersona => ({
    id: row.id,
    industry_template_id: row.industry_template_id,
    name: row.name,
    avatar_emoji: row.avatar_emoji || '👤',
    sort_order: row.sort_order || 0,
    is_active: row.is_active ?? true,
    age_range: row.age_range,
    gender: row.gender,
    income_level: row.income_level,
    occupation: row.occupation,
    location: row.location,
    pain_points: row.pain_points || [],
    desires: row.desires || [],
    objections: row.objections || [],
    values: row.values || [],
    interests: row.interests || [],
    buying_triggers: row.buying_triggers || [],
    information_sources: row.information_sources || [],
    preferred_channels: row.preferred_channels || [],
    typical_funnel_stage: row.typical_funnel_stage,
    communication_style: row.communication_style,
    response_tone_hints: row.response_tone_hints || [],
    content_preferences: (row.content_preferences as ContentPreferences) || getDefaultContentPreferences(),
    persona_prompt_hints: row.persona_prompt_hints,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  });

  // Fetch personas for an industry template
  const fetchPersonas = useCallback(async () => {
    if (!industryTemplateId || !enabled) {
      setPersonas([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('industry_personas')
        .select('*')
        .eq('industry_template_id', industryTemplateId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;

      setPersonas((data || []).map(transformDbRow));
    } catch (err) {
      console.error('Error fetching industry personas:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch personas');
    } finally {
      setIsLoading(false);
    }
  }, [industryTemplateId, enabled]);

  // Create a new industry persona (Admin only)
  const createPersona = useCallback(async (
    persona: Omit<IndustryPersona, 'id' | 'created_at' | 'updated_at'>
  ): Promise<IndustryPersona | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const insertData: Record<string, unknown> = {
        industry_template_id: persona.industry_template_id,
        name: persona.name,
        avatar_emoji: persona.avatar_emoji || '👤',
        sort_order: persona.sort_order || 0,
        is_active: persona.is_active ?? true,
        age_range: persona.age_range,
        gender: persona.gender,
        income_level: persona.income_level,
        occupation: persona.occupation,
        location: persona.location,
        pain_points: persona.pain_points || [],
        desires: persona.desires || [],
        objections: persona.objections || [],
        values: persona.values || [],
        interests: persona.interests || [],
        buying_triggers: persona.buying_triggers || [],
        information_sources: persona.information_sources || [],
        preferred_channels: persona.preferred_channels || [],
        typical_funnel_stage: persona.typical_funnel_stage,
        communication_style: persona.communication_style,
        response_tone_hints: persona.response_tone_hints || [],
        content_preferences: persona.content_preferences || getDefaultContentPreferences(),
        persona_prompt_hints: persona.persona_prompt_hints,
        created_by: user?.id,
      };

      const { data, error: insertError } = await supabase
        .from('industry_personas')
        .insert(insertData as any)
        .select()
        .single();

      if (insertError) throw insertError;

      await fetchPersonas();
      toast.success('Đã tạo Industry Persona');
      return transformDbRow(data);
    } catch (err) {
      console.error('Error creating industry persona:', err);
      toast.error('Không thể tạo persona');
      throw err;
    }
  }, [fetchPersonas]);

  // Update an industry persona (Admin only)
  const updatePersona = useCallback(async (id: string, updates: Partial<IndustryPersona>) => {
    try {
      // Build update object, excluding undefined values
      const updateData: Record<string, unknown> = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.avatar_emoji !== undefined) updateData.avatar_emoji = updates.avatar_emoji;
      if (updates.sort_order !== undefined) updateData.sort_order = updates.sort_order;
      if (updates.is_active !== undefined) updateData.is_active = updates.is_active;
      if (updates.age_range !== undefined) updateData.age_range = updates.age_range;
      if (updates.gender !== undefined) updateData.gender = updates.gender;
      if (updates.income_level !== undefined) updateData.income_level = updates.income_level;
      if (updates.occupation !== undefined) updateData.occupation = updates.occupation;
      if (updates.location !== undefined) updateData.location = updates.location;
      if (updates.pain_points !== undefined) updateData.pain_points = updates.pain_points;
      if (updates.desires !== undefined) updateData.desires = updates.desires;
      if (updates.objections !== undefined) updateData.objections = updates.objections;
      if (updates.values !== undefined) updateData.values = updates.values;
      if (updates.interests !== undefined) updateData.interests = updates.interests;
      if (updates.buying_triggers !== undefined) updateData.buying_triggers = updates.buying_triggers;
      if (updates.information_sources !== undefined) updateData.information_sources = updates.information_sources;
      if (updates.preferred_channels !== undefined) updateData.preferred_channels = updates.preferred_channels;
      if (updates.typical_funnel_stage !== undefined) updateData.typical_funnel_stage = updates.typical_funnel_stage;
      if (updates.communication_style !== undefined) updateData.communication_style = updates.communication_style;
      if (updates.response_tone_hints !== undefined) updateData.response_tone_hints = updates.response_tone_hints;
      if (updates.content_preferences !== undefined) updateData.content_preferences = updates.content_preferences;
      if (updates.persona_prompt_hints !== undefined) updateData.persona_prompt_hints = updates.persona_prompt_hints;

      const { error: updateError } = await supabase
        .from('industry_personas')
        .update(updateData)
        .eq('id', id);

      if (updateError) throw updateError;

      await fetchPersonas();
      toast.success('Đã cập nhật Industry Persona');
    } catch (err) {
      console.error('Error updating industry persona:', err);
      toast.error('Không thể cập nhật persona');
      throw err;
    }
  }, [fetchPersonas]);

  // Delete an industry persona (Admin only)
  const deletePersona = useCallback(async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('industry_personas')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      await fetchPersonas();
      toast.success('Đã xóa Industry Persona');
    } catch (err) {
      console.error('Error deleting industry persona:', err);
      toast.error('Không thể xóa persona');
      throw err;
    }
  }, [fetchPersonas]);

  // Copy an industry persona to a brand as customer persona
  const copyToCustomerPersona = useCallback(async (
    industryPersonaId: string,
    brandTemplateId: string
  ) => {
    try {
      // Find the industry persona
      const persona = personas.find(p => p.id === industryPersonaId);
      if (!persona) {
        throw new Error('Industry persona not found');
      }

      const { data: { user } } = await supabase.auth.getUser();

      // Create customer persona from industry persona
      const insertData = {
        brand_template_id: brandTemplateId,
        organization_id: currentOrganization?.id,
        user_id: user?.id,
        source_industry_persona_id: industryPersonaId,
        is_customized: false,
        name: persona.name,
        avatar_emoji: persona.avatar_emoji,
        is_primary: false,
        age_range: persona.age_range,
        gender: persona.gender,
        income_level: persona.income_level,
        occupation: persona.occupation,
        location: persona.location,
        pain_points: persona.pain_points,
        desires: persona.desires,
        objections: persona.objections,
        values: persona.values,
        interests: persona.interests,
        buying_triggers: persona.buying_triggers,
        information_sources: persona.information_sources,
        preferred_channels: persona.preferred_channels,
        typical_funnel_stage: persona.typical_funnel_stage,
      };

      const { data, error: insertError } = await supabase
        .from('customer_personas')
        .insert(insertData)
        .select()
        .single();

      if (insertError) throw insertError;

      toast.success(`Đã import "${persona.name}" vào Brand`);
      return data;
    } catch (err) {
      console.error('Error copying to customer persona:', err);
      toast.error('Không thể import persona');
      throw err;
    }
  }, [personas, currentOrganization]);

  // Effect to fetch on mount/change
  useEffect(() => {
    fetchPersonas();
  }, [fetchPersonas]);

  return {
    personas,
    isLoading,
    error,
    createPersona,
    updatePersona,
    deletePersona,
    copyToCustomerPersona,
    refresh: fetchPersonas,
  };
}

// Hook to fetch industry personas by industry template (for import in brand form)
// Updated to support Industry Park v2 with dual-path fallback
export function useIndustryPersonasForImport(
  industryTemplateId?: string | null,
  globalPackId?: string | null
) {
  const [personas, setPersonas] = useState<IndustryPersona[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Priority: v2 (globalPackId) > v1 (industryTemplateId)
    if (!globalPackId && !industryTemplateId) {
      setPersonas([]);
      return;
    }

    const fetchPersonas = async () => {
      setIsLoading(true);
      try {
        // Try v2 first if globalPackId is provided
        if (globalPackId) {
          const { data: v2Data, error: v2Error } = await supabase
            .from('industry_personas_v2')
            .select('*')
            .eq('global_pack_id', globalPackId)
            .eq('is_active', true)
            .order('sort_order', { ascending: true })
            .limit(5);

          if (!v2Error && v2Data && v2Data.length > 0) {
            // Convert v2 format to v1 format for compatibility with BrandFormStepPersonas
            const mappedPersonas = v2Data.map((row: any): IndustryPersona => ({
              id: row.id,
              industry_template_id: globalPackId, // Use globalPackId as template ID for v2
              name: row.name,
              avatar_emoji: '👤', // v2 doesn't have avatar_emoji, use default
              sort_order: row.sort_order || 0,
              is_active: row.is_active ?? true,
              age_range: row.age_range,
              gender: row.gender,
              income_level: row.income_level,
              occupation: row.occupation,
              location: row.location_type, // Map location_type to location
              // Map v2 fields to v1 fields
              pain_points: row.pain_points || [],
              desires: row.goals || [], // v2 uses 'goals' instead of 'desires'
              objections: row.objections || [],
              values: row.values || [],
              interests: row.interests || [],
              buying_triggers: row.buying_motivation || [], // Map buying_motivation to buying_triggers
              information_sources: row.content_consumption || [], // Map content_consumption to information_sources
              preferred_channels: row.preferred_channels || [],
              typical_funnel_stage: null, // v2 uses journey_stages instead
              communication_style: row.communication_style,
              response_tone_hints: row.response_tone_hints || [],
              content_preferences: row.content_preferences || { format: 'medium', visual: true, practical: true },
              persona_prompt_hints: row.description, // Use description as prompt hints
              created_by: row.created_by,
              created_at: row.created_at,
              updated_at: row.updated_at,
            }));
            setPersonas(mappedPersonas);
            setIsLoading(false);
            return;
          }
        }

        // Fallback to v1 if v2 is empty or globalPackId is not provided
        if (industryTemplateId) {
          const { data, error } = await supabase
            .from('industry_personas')
            .select('*')
            .eq('industry_template_id', industryTemplateId)
            .eq('is_active', true)
            .order('sort_order', { ascending: true });

          if (error) throw error;

          setPersonas((data || []).map((row: any): IndustryPersona => ({
            id: row.id,
            industry_template_id: row.industry_template_id,
            name: row.name,
            avatar_emoji: row.avatar_emoji || '👤',
            sort_order: row.sort_order || 0,
            is_active: row.is_active ?? true,
            age_range: row.age_range,
            gender: row.gender,
            income_level: row.income_level,
            occupation: row.occupation,
            location: row.location,
            pain_points: row.pain_points || [],
            desires: row.desires || [],
            objections: row.objections || [],
            values: row.values || [],
            interests: row.interests || [],
            buying_triggers: row.buying_triggers || [],
            information_sources: row.information_sources || [],
            preferred_channels: row.preferred_channels || [],
            typical_funnel_stage: row.typical_funnel_stage,
            communication_style: row.communication_style,
            response_tone_hints: row.response_tone_hints || [],
            content_preferences: row.content_preferences || { format: 'medium', visual: true, practical: true },
            persona_prompt_hints: row.persona_prompt_hints,
            created_by: row.created_by,
            created_at: row.created_at,
            updated_at: row.updated_at,
          })));
        } else {
          setPersonas([]);
        }
      } catch (err) {
        console.error('Error fetching industry personas for import:', err);
        setPersonas([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPersonas();
  }, [industryTemplateId, globalPackId]);

  return { personas, isLoading };
}
