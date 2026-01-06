import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AdSyncConfig } from '@/types/metaAds';

interface CreateSyncConfigInput {
  adCopyId: string;
  organizationId: string;
  connectionId: string;
  externalAdId: string;
  externalCampaignId?: string;
  externalAdsetId?: string;
  externalAdName?: string;
  syncFrequency?: 'hourly' | 'daily' | 'manual';
}

interface UpdateSyncConfigInput {
  syncEnabled?: boolean;
  syncFrequency?: 'hourly' | 'daily' | 'manual';
}

export function useAdSyncConfig(adCopyId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch sync config for ad copy
  const { data: syncConfig, isLoading, refetch } = useQuery({
    queryKey: ['ad-sync-config', adCopyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ad_sync_configs')
        .select(`
          *,
          social_connections (
            id,
            platform,
            ad_account_id,
            ad_account_name,
            is_active
          )
        `)
        .eq('ad_copy_id', adCopyId)
        .maybeSingle();

      if (error) throw error;
      return data as (AdSyncConfig & { social_connections: any }) | null;
    },
    enabled: !!adCopyId,
  });

  // Create sync config
  const createMutation = useMutation({
    mutationFn: async (input: CreateSyncConfigInput) => {
      // Calculate next sync time based on frequency
      const nextSyncAt = input.syncFrequency === 'manual' 
        ? null 
        : new Date(Date.now() + (input.syncFrequency === 'hourly' ? 3600000 : 86400000)).toISOString();

      const { data, error } = await supabase
        .from('ad_sync_configs')
        .insert({
          ad_copy_id: input.adCopyId,
          organization_id: input.organizationId,
          connection_id: input.connectionId,
          external_ad_id: input.externalAdId,
          external_campaign_id: input.externalCampaignId || null,
          external_adset_id: input.externalAdsetId || null,
          external_ad_name: input.externalAdName || null,
          sync_frequency: input.syncFrequency || 'daily',
          sync_enabled: true,
          sync_status: 'pending',
          next_sync_at: nextSyncAt,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-sync-config', adCopyId] });
      toast({
        title: 'Đã liên kết',
        description: 'Đã liên kết Ad Copy với Meta Ad thành công',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Lỗi',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update sync config
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: UpdateSyncConfigInput & { id: string }) => {
      const updateData: any = {};
      
      if (updates.syncEnabled !== undefined) {
        updateData.sync_enabled = updates.syncEnabled;
      }
      if (updates.syncFrequency) {
        updateData.sync_frequency = updates.syncFrequency;
        // Recalculate next sync time
        if (updates.syncFrequency === 'manual') {
          updateData.next_sync_at = null;
        } else {
          updateData.next_sync_at = new Date(
            Date.now() + (updates.syncFrequency === 'hourly' ? 3600000 : 86400000)
          ).toISOString();
        }
      }

      const { data, error } = await supabase
        .from('ad_sync_configs')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-sync-config', adCopyId] });
      toast({
        title: 'Đã cập nhật',
        description: 'Cài đặt đồng bộ đã được cập nhật',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Lỗi',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete sync config
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ad_sync_configs')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-sync-config', adCopyId] });
      toast({
        title: 'Đã xóa liên kết',
        description: 'Đã xóa liên kết với Meta Ad',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Lỗi',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Trigger manual sync
  const syncMutation = useMutation({
    mutationFn: async () => {
      if (!syncConfig) throw new Error('Chưa có cấu hình đồng bộ');

      const { data, error } = await supabase.functions.invoke('sync-ad-performance', {
        body: { syncConfigId: syncConfig.id },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ad-sync-config', adCopyId] });
      queryClient.invalidateQueries({ queryKey: ['ad-copy-performance', adCopyId] });
      toast({
        title: 'Đồng bộ thành công',
        description: data.message || 'Dữ liệu performance đã được cập nhật',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Lỗi đồng bộ',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    syncConfig,
    isLoading,
    hasSyncConfig: !!syncConfig,
    createSyncConfig: createMutation.mutate,
    updateSyncConfig: updateMutation.mutate,
    deleteSyncConfig: deleteMutation.mutate,
    triggerSync: syncMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isSyncing: syncMutation.isPending,
    refetch,
  };
}
