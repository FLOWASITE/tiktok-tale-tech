import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CustomerPersona } from '@/types/customerPersona';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';

interface UseCustomerPersonasOptions {
  brandTemplateId?: string | null;
  enabled?: boolean;
}

export function useCustomerPersonas({ brandTemplateId, enabled = true }: UseCustomerPersonasOptions = {}) {
  const [personas, setPersonas] = useState<CustomerPersona[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { currentOrganization } = useOrganizationContext();

  // Fetch personas for a brand template
  const fetchPersonas = useCallback(async () => {
    if (!brandTemplateId || !enabled) {
      setPersonas([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('customer_personas')
        .select('*')
        .eq('brand_template_id', brandTemplateId)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;

      // Transform data to match CustomerPersona type
      const transformedData: CustomerPersona[] = (data || []).map((item: any) => ({
        id: item.id,
        brand_template_id: item.brand_template_id,
        organization_id: item.organization_id,
        user_id: item.user_id,
        name: item.name,
        avatar_emoji: item.avatar_emoji || '👤',
        is_primary: item.is_primary || false,
        age_range: item.age_range,
        gender: item.gender,
        location: item.location,
        income_level: item.income_level,
        occupation: item.occupation,
        pain_points: item.pain_points || [],
        desires: item.desires || [],
        objections: item.objections || [],
        values: item.values || [],
        interests: item.interests || [],
        buying_triggers: item.buying_triggers || [],
        information_sources: item.information_sources || [],
        preferred_channels: item.preferred_channels || [],
        typical_funnel_stage: item.typical_funnel_stage,
        created_at: item.created_at,
        updated_at: item.updated_at,
      }));

      setPersonas(transformedData);
    } catch (err) {
      console.error('Error fetching customer personas:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch personas');
    } finally {
      setIsLoading(false);
    }
  }, [brandTemplateId, enabled]);

  // Create a new persona
  const createPersona = useCallback(async (persona: Omit<CustomerPersona, 'id' | 'created_at' | 'updated_at'>) => {
    console.log('[useCustomerPersonas] createPersona called');
    console.log('[useCustomerPersonas] Input persona:', persona);
    console.log('[useCustomerPersonas] currentOrganization from context:', currentOrganization);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('[useCustomerPersonas] Current user:', user?.id);
      
      const insertData = {
        brand_template_id: persona.brand_template_id,
        organization_id: currentOrganization?.id || persona.organization_id,
        user_id: user?.id,
        name: persona.name,
        avatar_emoji: persona.avatar_emoji || '👤',
        is_primary: persona.is_primary || false,
        age_range: persona.age_range,
        gender: persona.gender,
        location: persona.location,
        income_level: persona.income_level,
        occupation: persona.occupation,
        pain_points: persona.pain_points || [],
        desires: persona.desires || [],
        objections: persona.objections || [],
        values: persona.values || [],
        interests: persona.interests || [],
        buying_triggers: persona.buying_triggers || [],
        information_sources: persona.information_sources || [],
        preferred_channels: persona.preferred_channels || [],
        typical_funnel_stage: persona.typical_funnel_stage,
      };

      console.log('[useCustomerPersonas] Insert data:', insertData);

      const { data, error: insertError } = await supabase
        .from('customer_personas')
        .insert(insertData)
        .select()
        .single();

      console.log('[useCustomerPersonas] Insert result:', { data, error: insertError });

      if (insertError) throw insertError;

      // If this persona is primary, unset others
      if (persona.is_primary && data) {
        await supabase
          .from('customer_personas')
          .update({ is_primary: false })
          .eq('brand_template_id', persona.brand_template_id)
          .neq('id', data.id);
      }

      await fetchPersonas();
      toast.success('Đã thêm Customer Persona');
      return data;
    } catch (err) {
      console.error('[useCustomerPersonas] createPersona error:', err);
      toast.error('Không thể thêm persona');
      throw err;
    }
  }, [currentOrganization, fetchPersonas]);

  // Update a persona
  const updatePersona = useCallback(async (id: string, updates: Partial<CustomerPersona>) => {
    try {
      const { error: updateError } = await supabase
        .from('customer_personas')
        .update({
          name: updates.name,
          avatar_emoji: updates.avatar_emoji,
          is_primary: updates.is_primary,
          age_range: updates.age_range,
          gender: updates.gender,
          location: updates.location,
          income_level: updates.income_level,
          occupation: updates.occupation,
          pain_points: updates.pain_points,
          desires: updates.desires,
          objections: updates.objections,
          values: updates.values,
          interests: updates.interests,
          buying_triggers: updates.buying_triggers,
          information_sources: updates.information_sources,
          preferred_channels: updates.preferred_channels,
          typical_funnel_stage: updates.typical_funnel_stage,
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // If setting as primary, unset others
      if (updates.is_primary) {
        const persona = personas.find(p => p.id === id);
        if (persona) {
          await supabase
            .from('customer_personas')
            .update({ is_primary: false })
            .eq('brand_template_id', persona.brand_template_id)
            .neq('id', id);
        }
      }

      await fetchPersonas();
      toast.success('Đã cập nhật persona');
    } catch (err) {
      console.error('Error updating persona:', err);
      toast.error('Không thể cập nhật persona');
      throw err;
    }
  }, [fetchPersonas, personas]);

  // Delete a persona
  const deletePersona = useCallback(async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('customer_personas')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      await fetchPersonas();
      toast.success('Đã xóa persona');
    } catch (err) {
      console.error('Error deleting persona:', err);
      toast.error('Không thể xóa persona');
      throw err;
    }
  }, [fetchPersonas]);

  // Set primary persona
  const setPrimaryPersona = useCallback(async (id: string) => {
    await updatePersona(id, { is_primary: true });
  }, [updatePersona]);

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
    setPrimaryPersona,
    refresh: fetchPersonas,
  };
}
