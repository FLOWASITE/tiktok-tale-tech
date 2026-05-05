import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type SocialPlatform = 'twitter' | 'facebook' | 'instagram' | 'threads' | 'linkedin' | 'tiktok' | 'youtube' | 'zalo_oa' | 'google_business' | 'blogger' | 'wordpress' | 'wordpress_com' | 'website' | 'pinterest' | 'bluesky' | 'shopify' | 'wix' | 'medium' | 'google_search_console';

export interface PlatformSettings {
  id: string;
  platform: SocialPlatform;
  app_name: string | null;
  consumer_key: string | null;
  consumer_secret: string | null;
  is_active: boolean;
  has_credentials: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SavePlatformSettingsInput {
  platform: SocialPlatform;
  app_name?: string;
  consumer_key?: string;
  consumer_secret?: string;
  is_active?: boolean;
}

export function useSocialPlatformSettings() {
  const queryClient = useQueryClient();

  // Fetch all platform settings
  const { data: settings, isLoading, error, refetch } = useQuery({
    queryKey: ['social-platform-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('manage-social-platform-settings', {
        method: 'GET',
      });
      
      if (error) throw error;
      return (data?.settings || []) as PlatformSettings[];
    },
  });

  // Save platform settings (create or update)
  const saveMutation = useMutation({
    mutationFn: async (input: SavePlatformSettingsInput) => {
      const { data, error } = await supabase.functions.invoke('manage-social-platform-settings', {
        method: 'POST',
        body: input,
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['social-platform-settings'] });
      toast.success(data?.message || 'Đã lưu cài đặt');
    },
    onError: (error: Error) => {
      console.error('Save settings error:', error);
      toast.error('Lỗi khi lưu cài đặt: ' + error.message);
    },
  });

  // Delete platform settings
  const deleteMutation = useMutation({
    mutationFn: async (platform: SocialPlatform) => {
      const { data, error } = await supabase.functions.invoke(
        'manage-social-platform-settings',
        { method: 'DELETE', body: { platform } }
      );
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['social-platform-settings'] });
      toast.success(data?.message || 'Đã xóa cài đặt');
    },
    onError: (error: Error) => {
      console.error('Delete settings error:', error);
      toast.error('Lỗi khi xóa cài đặt: ' + error.message);
    },
  });

  // Get settings for a specific platform
  const getSettingsForPlatform = (platform: SocialPlatform): PlatformSettings | undefined => {
    return settings?.find(s => s.platform === platform);
  };

  // Check if platform is configured
  const isPlatformConfigured = (platform: SocialPlatform): boolean => {
    const platformSettings = getSettingsForPlatform(platform);
    return platformSettings?.has_credentials && platformSettings?.is_active || false;
  };

  return {
    settings,
    isLoading,
    error,
    refetch,
    saveSettings: saveMutation.mutate,
    deleteSettings: deleteMutation.mutate,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
    getSettingsForPlatform,
    isPlatformConfigured,
  };
}
