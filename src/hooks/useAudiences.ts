import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SavedAudience, AudienceFormData } from '@/types/audience';
import { useToast } from '@/hooks/use-toast';

interface UseAudiencesOptions {
  organizationId?: string;
  brandTemplateId?: string;
}

export function useAudiences({ organizationId, brandTemplateId }: UseAudiencesOptions = {}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const queryKey = ['audiences', organizationId, brandTemplateId];

  const { data: audiences = [], isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!organizationId) return [];
      
      let query = supabase
        .from('saved_audiences')
        .select('*')
        .eq('organization_id', organizationId)
        .order('is_favorite', { ascending: false })
        .order('usage_count', { ascending: false });
      
      if (brandTemplateId) {
        query = query.or(`brand_template_id.eq.${brandTemplateId},brand_template_id.is.null`);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as SavedAudience[];
    },
    enabled: !!organizationId,
  });

  const createAudience = useMutation({
    mutationFn: async (formData: AudienceFormData & { organization_id: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('saved_audiences')
        .insert({
          ...formData,
          created_by: userData.user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audiences'] });
      toast({ title: 'Đã lưu audience template' });
    },
    onError: (error) => {
      toast({ 
        title: 'Lỗi khi lưu audience', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const updateAudience = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SavedAudience> & { id: string }) => {
      const { data, error } = await supabase
        .from('saved_audiences')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audiences'] });
      toast({ title: 'Đã cập nhật audience' });
    },
    onError: (error) => {
      toast({ 
        title: 'Lỗi khi cập nhật', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const deleteAudience = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('saved_audiences')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audiences'] });
      toast({ title: 'Đã xóa audience' });
    },
    onError: (error) => {
      toast({ 
        title: 'Lỗi khi xóa', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const toggleFavorite = useMutation({
    mutationFn: async ({ id, is_favorite }: { id: string; is_favorite: boolean }) => {
      const { error } = await supabase
        .from('saved_audiences')
        .update({ is_favorite })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audiences'] });
    },
  });

  const incrementUsage = useMutation({
    mutationFn: async (id: string) => {
      const audience = audiences.find(a => a.id === id);
      const newCount = (audience?.usage_count || 0) + 1;
      
      const { error } = await supabase
        .from('saved_audiences')
        .update({ usage_count: newCount })
        .eq('id', id);
      
      if (error) throw error;
    },
  });

  const duplicateAudience = useMutation({
    mutationFn: async (id: string) => {
      const original = audiences.find(a => a.id === id);
      if (!original) throw new Error('Audience not found');
      
      const { data: userData } = await supabase.auth.getUser();
      
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _, created_at, updated_at, usage_count, ...rest } = original;
      
      const { data, error } = await supabase
        .from('saved_audiences')
        .insert({
          ...rest,
          name: `${original.name} (Copy)`,
          usage_count: 0,
          is_favorite: false,
          created_by: userData.user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audiences'] });
      toast({ title: 'Đã sao chép audience' });
    },
  });

  return {
    audiences,
    isLoading,
    error,
    createAudience,
    updateAudience,
    deleteAudience,
    toggleFavorite,
    incrementUsage,
    duplicateAudience,
  };
}
