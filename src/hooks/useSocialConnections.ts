import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type SocialPlatform = 'twitter' | 'facebook' | 'instagram' | 'linkedin' | 'tiktok' | 'threads' | 'youtube';

export interface SocialConnection {
  id: string;
  organization_id: string | null;
  brand_template_id: string | null;
  user_id: string;
  platform: SocialPlatform;
  platform_user_id: string | null;
  platform_username: string | null;
  platform_display_name: string | null;
  platform_avatar_url: string | null;
  is_active: boolean;
  connected_at: string;
  last_used_at: string | null;
  last_verified_at: string | null;
  last_error: string | null;
  scopes: string[];
}

interface UseSocialConnectionsOptions {
  organizationId?: string;
  brandTemplateId?: string;
}

export function useSocialConnections(options: UseSocialConnectionsOptions = {}) {
  const { organizationId, brandTemplateId } = options;
  const queryClient = useQueryClient();

  const queryKey = brandTemplateId 
    ? ['social-connections', 'brand', brandTemplateId]
    : ['social-connections', 'org', organizationId];

  const { data: connections, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      let query = supabase.from('social_connections').select('*');
      
      if (brandTemplateId) {
        query = query.eq('brand_template_id', brandTemplateId);
      } else if (organizationId) {
        query = query.eq('organization_id', organizationId);
      } else {
        return [];
      }
      
      const { data, error } = await query.order('platform', { ascending: true });

      if (error) throw error;
      return (data || []) as unknown as SocialConnection[];
    },
    enabled: !!organizationId || !!brandTemplateId,
  });

  const connectMutation = useMutation({
    mutationFn: async ({
      platform,
      brandTemplateId: connectBrandTemplateId,
      organizationId: connectOrgId,
      accessToken,
      accessTokenSecret,
      consumerKey,
      consumerSecret,
    }: {
      platform: SocialPlatform;
      brandTemplateId?: string;
      organizationId?: string;
      accessToken?: string;
      accessTokenSecret?: string;
      consumerKey?: string;
      consumerSecret?: string;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('connect-social', {
        body: {
          platform,
          organizationId: connectOrgId || organizationId,
          brandTemplateId: connectBrandTemplateId || brandTemplateId,
          accessToken,
          accessTokenSecret,
          consumerKey,
          consumerSecret,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      if (data.requiresManualSetup) {
        return;
      }
      queryClient.invalidateQueries({ queryKey });
      toast.success('Đã kết nối tài khoản thành công');
    },
    onError: (error: Error) => {
      toast.error(`Lỗi kết nối: ${error.message}`);
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
      queryClient.invalidateQueries({ queryKey });
      toast.success('Đã ngắt kết nối');
    },
    onError: (error: Error) => {
      toast.error(`Lỗi ngắt kết nối: ${error.message}`);
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
      queryClient.invalidateQueries({ queryKey });
      toast.success('Đã xóa kết nối');
    },
    onError: (error: Error) => {
      toast.error(`Lỗi xóa kết nối: ${error.message}`);
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