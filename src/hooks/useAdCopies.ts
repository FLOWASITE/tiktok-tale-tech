import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { toast } from 'sonner';
import type { AdCopy, AdCopyFormData, AdCopyVariation, PolicyWarning } from '@/types/adCopy';

export function useAdCopies() {
  const { currentOrganization } = useOrganizationContext();
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);

  // Fetch all ad copies
  const { data: adCopies = [], isLoading, refetch } = useQuery({
    queryKey: ['ad-copies', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];

      const { data, error } = await supabase
        .from('ad_copies')
        .select(`
          *,
          brand_template:brand_templates(name, brand_name),
          product:brand_products(name),
          persona:customer_personas(name),
          campaign:campaigns(id, name)
        `)
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AdCopy[];
    },
    enabled: !!currentOrganization?.id,
  });

  // Generate new ad copy
  const generateAdCopy = useCallback(async (formData: AdCopyFormData): Promise<AdCopy | null> => {
    if (!currentOrganization?.id) {
      toast.error('Không tìm thấy tổ chức');
      return null;
    }

    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Vui lòng đăng nhập');
        return null;
      }

      const response = await supabase.functions.invoke('generate-ad-copy', {
        body: {
          topic: formData.topic,
          platform: formData.platform,
          objective: formData.objective,
          landingUrl: formData.landingUrl,
          audienceBrief: formData.audienceBrief,
          funnelStage: formData.funnelStage,
          variationCount: formData.variationCount,
          brandTemplateId: formData.brandTemplateId,
          productId: formData.productId,
          personaId: formData.personaId,
          campaignId: formData.campaignId,
          organizationId: currentOrganization.id,
          userId: session.user.id,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const adCopy = response.data as AdCopy;
      toast.success(`Đã tạo ${adCopy.variations?.length || 0} variations thành công!`);
      
      queryClient.invalidateQueries({ queryKey: ['ad-copies'] });
      return adCopy;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Không thể tạo ad copy';
      console.error('Generate ad copy error:', error);
      toast.error(errorMessage);
      return null;
    } finally {
      setGenerating(false);
    }
  }, [currentOrganization?.id, queryClient]);

  // Fetch single ad copy with variations
  const fetchAdCopyDetail = useCallback(async (id: string): Promise<AdCopy | null> => {
    const { data: adCopy, error } = await supabase
      .from('ad_copies')
      .select(`
        *,
        brand_template:brand_templates(name, brand_name),
        product:brand_products(name),
        persona:customer_personas(name),
        campaign:campaigns(id, name)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Fetch ad copy error:', error);
      return null;
    }

    // Fetch variations
    const { data: variations } = await supabase
      .from('ad_copy_variations')
      .select('*')
      .eq('ad_copy_id', id)
      .order('variation_label');

    return {
      ...adCopy,
      variations: (variations || []).map(v => ({
        ...v,
        headlines: Array.isArray(v.headlines) ? v.headlines as string[] : [],
        descriptions: Array.isArray(v.descriptions) ? v.descriptions as string[] : [],
        char_counts: (v.char_counts as Record<string, number>) || {},
        policy_warnings: (v.policy_warnings as unknown as PolicyWarning[]) || [],
      })),
    } as AdCopy;
  }, []);

  // Delete ad copy
  const deleteAdCopy = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ad_copies')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Đã xóa ad copy');
      queryClient.invalidateQueries({ queryKey: ['ad-copies'] });
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : 'Không thể xóa';
      toast.error(errorMessage);
    },
  });

  // Update ad copy status
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('ad_copies')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Đã cập nhật trạng thái');
      queryClient.invalidateQueries({ queryKey: ['ad-copies'] });
    },
  });

  // Toggle variation approval
  const toggleVariationApproval = useMutation({
    mutationFn: async ({ variationId, isApproved }: { variationId: string; isApproved: boolean }) => {
      const { error } = await supabase
        .from('ad_copy_variations')
        .update({ is_approved: isApproved })
        .eq('id', variationId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Đã cập nhật');
      queryClient.invalidateQueries({ queryKey: ['ad-copies'] });
    },
  });

  // Update variation content
  const updateVariation = useMutation({
    mutationFn: async ({ variationId, updates }: { 
      variationId: string; 
      updates: Partial<Pick<AdCopyVariation, 'primary_text' | 'headline' | 'description' | 'cta_button' | 'is_approved'>>;
    }) => {
      const { error } = await supabase
        .from('ad_copy_variations')
        .update(updates)
        .eq('id', variationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-copies'] });
    },
  });

  return {
    adCopies,
    isLoading,
    generating,
    generateAdCopy,
    fetchAdCopyDetail,
    deleteAdCopy: deleteAdCopy.mutate,
    updateStatus: updateStatus.mutate,
    toggleVariationApproval: toggleVariationApproval.mutate,
    updateVariation: updateVariation.mutate,
    refetch,
  };
}
