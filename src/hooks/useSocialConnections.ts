import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type SocialPlatform = 'twitter' | 'facebook' | 'instagram' | 'linkedin' | 'tiktok' | 'threads' | 'youtube';

export interface SocialConnection {
  id: string;
  organization_id: string;
  user_id: string;
  platform: SocialPlatform;
  platform_user_id: string | null;
  platform_username: string | null;
  platform_display_name: string | null;
  platform_avatar_url: string | null;
  is_active: boolean;
  connected_at: string;
  last_used_at: string | null;
  last_error: string | null;
  scopes: string[];
}

export function useSocialConnections(organizationId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: connections, isLoading, error, refetch } = useQuery({
    queryKey: ['social-connections', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data, error } = await supabase
        .from('social_connections')
        .select('*')
        .eq('organization_id', organizationId)
        .order('platform', { ascending: true });

      if (error) throw error;
      return data as SocialConnection[];
    },
    enabled: !!organizationId,
  });

  const connectMutation = useMutation({
    mutationFn: async ({
      platform,
      accessToken,
      accessTokenSecret,
      username,
    }: {
      platform: SocialPlatform;
      accessToken?: string;
      accessTokenSecret?: string;
      username?: string;
    }) => {
      if (!organizationId) throw new Error('Organization ID required');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('connect-social', {
        body: {
          platform,
          organizationId,
          accessToken,
          accessTokenSecret,
          username,
        },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      if (data.requiresManualSetup) {
        // Don't show success toast, UI will handle showing instructions
        return;
      }
      toast({
        title: 'Kết nối thành công',
        description: `Đã kết nối ${data.connection?.platform || 'tài khoản'}`,
      });
      queryClient.invalidateQueries({ queryKey: ['social-connections', organizationId] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Lỗi kết nối',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      const { error } = await supabase
        .from('social_connections')
        .update({ is_active: false })
        .eq('id', connectionId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Đã ngắt kết nối',
        description: 'Tài khoản đã được ngắt kết nối',
      });
      queryClient.invalidateQueries({ queryKey: ['social-connections', organizationId] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Lỗi',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteConnectionMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      const { error } = await supabase
        .from('social_connections')
        .delete()
        .eq('id', connectionId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Đã xóa kết nối',
        description: 'Tài khoản đã được xóa hoàn toàn',
      });
      queryClient.invalidateQueries({ queryKey: ['social-connections', organizationId] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Lỗi',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const getConnectionForPlatform = (platform: SocialPlatform) => {
    return connections?.find(c => c.platform === platform && c.is_active);
  };

  return {
    connections: connections || [],
    isLoading,
    error,
    refetch,
    connect: connectMutation.mutateAsync,
    isConnecting: connectMutation.isPending,
    disconnect: disconnectMutation.mutateAsync,
    isDisconnecting: disconnectMutation.isPending,
    deleteConnection: deleteConnectionMutation.mutateAsync,
    isDeleting: deleteConnectionMutation.isPending,
    getConnectionForPlatform,
  };
}
