import { useState, useCallback, useEffect, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ProductPersonaMapping, ProductPersonaMappingFormData } from '@/types/productPersonaMapping';

// Import org context directly to get currentOrganization
import { createContext } from 'react';

interface UseProductPersonaMappingsOptions {
  brandTemplateId?: string;
  productId?: string;
  personaId?: string;
  enabled?: boolean;
  organizationId?: string;
}

export function useProductPersonaMappings(options: UseProductPersonaMappingsOptions = {}) {
  const { brandTemplateId, productId, personaId, enabled = true, organizationId } = options;
  const { user } = useAuth();
  
  const [mappings, setMappings] = useState<ProductPersonaMapping[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMappings = useCallback(async () => {
    if (!enabled || !brandTemplateId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .from('product_persona_mappings')
        .select('*')
        .eq('brand_template_id', brandTemplateId);
      
      if (productId) {
        query = query.eq('product_id', productId);
      }
      
      if (personaId) {
        query = query.eq('persona_id', personaId);
      }
      
      const { data, error: fetchError } = await query.order('relevance_score', { ascending: false });
      
      if (fetchError) throw fetchError;
      
      setMappings((data || []) as ProductPersonaMapping[]);
    } catch (err) {
      console.error('Error fetching product persona mappings:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch mappings');
    } finally {
      setIsLoading(false);
    }
  }, [brandTemplateId, productId, personaId, enabled]);

  const createMapping = useCallback(async (data: ProductPersonaMappingFormData): Promise<ProductPersonaMapping | null> => {
    if (!brandTemplateId || !user) {
      toast.error('Thiếu thông tin brand hoặc user');
      return null;
    }
    
    try {
      const insertData = {
        ...data,
        brand_template_id: brandTemplateId,
        organization_id: organizationId || null,
        user_id: organizationId ? null : user.id,
      };
      
      const { data: created, error: insertError } = await supabase
        .from('product_persona_mappings')
        .insert(insertData)
        .select()
        .single();
      
      if (insertError) {
        if (insertError.code === '23505') {
          toast.error('Mapping này đã tồn tại');
        } else {
          throw insertError;
        }
        return null;
      }
      
      setMappings(prev => [...prev, created as ProductPersonaMapping]);
      toast.success('Đã liên kết sản phẩm - persona');
      return created as ProductPersonaMapping;
    } catch (err) {
      console.error('Error creating mapping:', err);
      toast.error('Không thể tạo liên kết');
      return null;
    }
  }, [brandTemplateId, user, organizationId]);

  const updateMapping = useCallback(async (
    id: string, 
    updates: Partial<ProductPersonaMappingFormData>
  ): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('product_persona_mappings')
        .update(updates)
        .eq('id', id);
      
      if (updateError) throw updateError;
      
      setMappings(prev => prev.map(m => 
        m.id === id ? { ...m, ...updates } : m
      ));
      toast.success('Đã cập nhật liên kết');
      return true;
    } catch (err) {
      console.error('Error updating mapping:', err);
      toast.error('Không thể cập nhật liên kết');
      return false;
    }
  }, []);

  const deleteMapping = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('product_persona_mappings')
        .delete()
        .eq('id', id);
      
      if (deleteError) throw deleteError;
      
      setMappings(prev => prev.filter(m => m.id !== id));
      toast.success('Đã xóa liên kết');
      return true;
    } catch (err) {
      console.error('Error deleting mapping:', err);
      toast.error('Không thể xóa liên kết');
      return false;
    }
  }, []);

  const bulkCreateMappings = useCallback(async (
    items: Array<{ product_id: string; persona_id: string; relevance_score?: number }>
  ): Promise<boolean> => {
    if (!brandTemplateId || !user) return false;
    
    try {
      const insertData = items.map(item => ({
        product_id: item.product_id,
        persona_id: item.persona_id,
        brand_template_id: brandTemplateId,
        relevance_score: item.relevance_score || 80,
        organization_id: organizationId || null,
        user_id: organizationId ? null : user.id,
      }));
      
      const { data: created, error: insertError } = await supabase
        .from('product_persona_mappings')
        .upsert(insertData, { onConflict: 'product_id,persona_id' })
        .select();
      
      if (insertError) throw insertError;
      
      // Refresh mappings
      await fetchMappings();
      toast.success(`Đã tạo ${created?.length || 0} liên kết`);
      return true;
    } catch (err) {
      console.error('Error bulk creating mappings:', err);
      toast.error('Không thể tạo liên kết hàng loạt');
      return false;
    }
  }, [brandTemplateId, user, organizationId, fetchMappings]);

  const getProductsForPersona = useCallback((targetPersonaId: string) => {
    return mappings.filter(m => m.persona_id === targetPersonaId);
  }, [mappings]);

  const getPersonasForProduct = useCallback((targetProductId: string) => {
    return mappings.filter(m => m.product_id === targetProductId);
  }, [mappings]);

  useEffect(() => {
    fetchMappings();
  }, [fetchMappings]);

  return {
    mappings,
    isLoading,
    error,
    createMapping,
    updateMapping,
    deleteMapping,
    bulkCreateMappings,
    getProductsForPersona,
    getPersonasForProduct,
    refresh: fetchMappings,
  };
}
