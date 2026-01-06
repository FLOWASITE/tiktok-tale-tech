import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { CompetitorProfile, CompetitorFormData } from '@/types/competitor';

export function useCompetitors() {
  const { currentOrganization } = useOrganizationContext();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const orgId = currentOrganization?.id;

  // Fetch all competitors
  const { data: competitors = [], isLoading, refetch } = useQuery({
    queryKey: ['competitors', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      
      const { data, error } = await supabase
        .from('competitor_profiles')
        .select('*')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .order('competitor_name', { ascending: true });
      
      if (error) throw error;
      return data as CompetitorProfile[];
    },
    enabled: !!orgId,
  });

  // Add competitor
  const addMutation = useMutation({
    mutationFn: async (formData: CompetitorFormData) => {
      if (!orgId || !user) throw new Error('Missing organization or user');
      
      const { data, error } = await supabase
        .from('competitor_profiles')
        .insert({
          organization_id: orgId,
          created_by: user.id,
          ...formData,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitors', orgId] });
      toast.success('Đã thêm đối thủ');
    },
    onError: (error: Error) => {
      toast.error('Lỗi khi thêm: ' + error.message);
    },
  });

  // Update competitor
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CompetitorProfile> & { id: string }) => {
      const { data, error } = await supabase
        .from('competitor_profiles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitors', orgId] });
      toast.success('Đã cập nhật');
    },
    onError: (error: Error) => {
      toast.error('Lỗi khi cập nhật: ' + error.message);
    },
  });

  // Delete (soft delete) competitor
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('competitor_profiles')
        .update({ is_active: false })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitors', orgId] });
      toast.success('Đã xóa đối thủ');
    },
    onError: (error: Error) => {
      toast.error('Lỗi khi xóa: ' + error.message);
    },
  });

  return {
    competitors,
    isLoading,
    refetch,
    addCompetitor: addMutation.mutateAsync,
    updateCompetitor: updateMutation.mutateAsync,
    deleteCompetitor: deleteMutation.mutateAsync,
    isAdding: addMutation.isPending,
  };
}
