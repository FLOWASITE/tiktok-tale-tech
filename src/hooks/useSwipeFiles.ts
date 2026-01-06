import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { SwipeFile, SwipeFileFormData } from '@/types/swipeFile';

export function useSwipeFiles() {
  const { currentOrganization } = useOrganizationContext();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const orgId = currentOrganization?.id;

  // Fetch all swipe files
  const { data: swipeFiles = [], isLoading, refetch } = useQuery({
    queryKey: ['swipe-files', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      
      const { data, error } = await supabase
        .from('ad_swipe_files')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as SwipeFile[];
    },
    enabled: !!orgId,
  });

  // Add swipe file
  const addMutation = useMutation({
    mutationFn: async (formData: SwipeFileFormData) => {
      if (!orgId || !user) throw new Error('Missing organization or user');
      
      const { data, error } = await supabase
        .from('ad_swipe_files')
        .insert({
          organization_id: orgId,
          created_by: user.id,
          ...formData,
          tags: formData.tags || [],
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['swipe-files', orgId] });
      toast.success('Đã thêm vào Swipe File Library');
    },
    onError: (error: Error) => {
      toast.error('Lỗi khi thêm: ' + error.message);
    },
  });

  // Update swipe file
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SwipeFile> & { id: string }) => {
      const { data, error } = await supabase
        .from('ad_swipe_files')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['swipe-files', orgId] });
      toast.success('Đã cập nhật');
    },
    onError: (error: Error) => {
      toast.error('Lỗi khi cập nhật: ' + error.message);
    },
  });

  // Delete swipe file
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ad_swipe_files')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['swipe-files', orgId] });
      toast.success('Đã xóa');
    },
    onError: (error: Error) => {
      toast.error('Lỗi khi xóa: ' + error.message);
    },
  });

  // Toggle favorite
  const toggleFavorite = useMutation({
    mutationFn: async (id: string) => {
      const file = swipeFiles.find(f => f.id === id);
      if (!file) throw new Error('File not found');
      
      const { error } = await supabase
        .from('ad_swipe_files')
        .update({ is_favorite: !file.is_favorite })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['swipe-files', orgId] });
    },
  });

  return {
    swipeFiles,
    isLoading,
    refetch,
    addSwipeFile: addMutation.mutateAsync,
    updateSwipeFile: updateMutation.mutateAsync,
    deleteSwipeFile: deleteMutation.mutateAsync,
    toggleFavorite: toggleFavorite.mutate,
    isAdding: addMutation.isPending,
    isUpdating: updateMutation.isPending,
  };
}
