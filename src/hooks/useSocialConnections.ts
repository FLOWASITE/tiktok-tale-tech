import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type SocialPlatform = 'twitter' | 'facebook' | 'instagram' | 'linkedin' | 'tiktok' | 'threads' | 'youtube' | 'zalo_oa' | 'google_business' | 'website';

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
  token_expires_at: string | null;
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
      const invokeConnect = () =>
        supabase.functions.invoke('connect-social', {
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

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.access_token) {
        const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !refreshed.session?.access_token) {
          throw new Error('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại');
        }
      }

      let result = await invokeConnect();

      const isUnauthorized =
        result.error?.message?.includes('Unauthorized') ||
        (typeof result.data?.error === 'string' && result.data.error.includes('Unauthorized'));

      if (isUnauthorized) {
        const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !refreshed.session?.access_token) {
          throw new Error('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại');
        }
        result = await invokeConnect();
      }

      if (result.error) throw result.error;
      if (result.data?.error) throw new Error(result.data.error);
      return result.data;
    },
    onSuccess: (data) => {
      if (data.requiresManualSetup || data.requiresOAuth) {
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