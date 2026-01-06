import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MetaAdAccount, MetaAdsConnectRequest, MetaAdsConnectResponse } from '@/types/metaAds';

interface UseMetaAdsConnectionOptions {
  organizationId?: string;
  brandTemplateId?: string;
}

export function useMetaAdsConnection(options: UseMetaAdsConnectionOptions = {}) {
  const { organizationId, brandTemplateId } = options;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [adAccounts, setAdAccounts] = useState<MetaAdAccount[]>([]);

  // Fetch existing Meta Ads connections
  const { data: connections, isLoading, refetch } = useQuery({
    queryKey: ['meta-ads-connections', organizationId, brandTemplateId],
    queryFn: async () => {
      let query = supabase
        .from('social_connections')
        .select('*')
        .eq('connection_type', 'meta_ads')
        .eq('is_active', true);

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }
      if (brandTemplateId) {
        query = query.eq('brand_template_id', brandTemplateId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!(organizationId || brandTemplateId),
  });

  // Connect to Meta Ads
  const connectMutation = useMutation({
    mutationFn: async (request: MetaAdsConnectRequest) => {
      const { data, error } = await supabase.functions.invoke('connect-meta-ads', {
        body: {
          ...request,
          organizationId: request.organizationId || organizationId,
          brandTemplateId: request.brandTemplateId || brandTemplateId,
        },
      });

      if (error) throw error;
      return data as MetaAdsConnectResponse;
    },
    onSuccess: (data) => {
      if (data.needsAccountSelection && data.adAccounts) {
        setAdAccounts(data.adAccounts);
        toast({
          title: 'Chọn Ad Account',
          description: `Tìm thấy ${data.adAccounts.length} Ad Account. Vui lòng chọn một tài khoản.`,
        });
      } else if (data.success && data.connection) {
        setAdAccounts([]);
        queryClient.invalidateQueries({ queryKey: ['meta-ads-connections'] });
        queryClient.invalidateQueries({ queryKey: ['social-connections'] });
        toast({
          title: 'Kết nối thành công',
          description: `Đã kết nối với ${data.connection.ad_account_name}`,
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Lỗi kết nối',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Disconnect from Meta Ads
  const disconnectMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      const { error } = await supabase
        .from('social_connections')
        .update({ is_active: false })
        .eq('id', connectionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meta-ads-connections'] });
      queryClient.invalidateQueries({ queryKey: ['social-connections'] });
      toast({
        title: 'Đã ngắt kết nối',
        description: 'Đã ngắt kết nối Meta Ads thành công',
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

  // Verify connection is still valid
  const verifyMutation = useMutation({
    mutationFn: async (connectionId: string) => {
      const { data, error } = await supabase.functions.invoke('connect-meta-ads', {
        body: { action: 'verify', connectionId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.valid) {
        toast({
          title: 'Kết nối hợp lệ',
          description: 'Token còn hiệu lực',
        });
      } else {
        toast({
          title: 'Token hết hạn',
          description: 'Vui lòng kết nối lại',
          variant: 'destructive',
        });
      }
    },
  });

  const getActiveConnection = () => {
    return connections?.find(c => c.is_active);
  };

  const clearAdAccounts = () => {
    setAdAccounts([]);
  };

  return {
    connections,
    isLoading,
    adAccounts,
    clearAdAccounts,
    getActiveConnection,
    connect: connectMutation.mutate,
    disconnect: disconnectMutation.mutate,
    verify: verifyMutation.mutate,
    isConnecting: connectMutation.isPending,
    isDisconnecting: disconnectMutation.isPending,
    isVerifying: verifyMutation.isPending,
    refetch,
  };
}
