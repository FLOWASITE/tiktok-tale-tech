import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { IndustryMemoryPack, IndustryPackStatus, PackStats } from '@/types/industryMemoryPack';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook để quản lý Industry Memory Packs
 * Fetch từ view industry_memory_packs với computed stats
 */
export function useIndustryMemoryPacks(options?: {
  countryCode?: string;
  status?: IndustryPackStatus;
  onlyActive?: boolean;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all packs from the view
  const { data: packs = [], isLoading, error, refetch } = useQuery({
    queryKey: ['industry-memory-packs', options?.countryCode, options?.status, options?.onlyActive],
    queryFn: async () => {
      // Query the view directly using raw query since it's not in types yet
      let query = supabase
        .from('industry_memory_packs' as any)
        .select('*');

      if (options?.countryCode) {
        query = query.eq('country_code', options.countryCode);
      }

      if (options?.status) {
        query = query.eq('status', options.status);
      }

      if (options?.onlyActive !== false) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query.order('country_name').order('name');

      if (error) {
        console.error('Error fetching industry memory packs:', error);
        throw error;
      }

      // Transform snake_case to camelCase
      return (data || []).map((pack: any): IndustryMemoryPack => ({
        id: pack.id,
        code: pack.code,
        name: pack.name,
        shortName: pack.short_name,
        countryId: pack.country_id,
        countryCode: pack.country_code,
        countryName: pack.country_name,
        flagEmoji: pack.flag_emoji,
        version: pack.version,
        status: pack.status,
        targetAudience: pack.target_audience,
        categoryCode: pack.category_code,
        categoryName: pack.category_name,
        categoryColor: pack.category_color,
        categoryIcon: pack.category_icon,
        complianceRulesCount: pack.compliance_rules_count || 0,
        forbiddenTermsCount: pack.forbidden_terms_count || 0,
        claimRestrictionsCount: pack.claim_restrictions_count || 0,
        versionCount: pack.version_count || 0,
        publishedAt: pack.published_at,
        publishedBy: pack.published_by,
        createdAt: pack.created_at,
        updatedAt: pack.updated_at,
        isActive: pack.is_active,
      }));
    },
  });

  // Compute stats from packs
  const stats: PackStats = {
    total: packs.length,
    draft: packs.filter(p => p.status === 'draft').length,
    stable: packs.filter(p => p.status === 'stable').length,
    deprecated: packs.filter(p => p.status === 'deprecated').length,
    byCountry: packs.reduce((acc, pack) => {
      acc[pack.countryCode] = (acc[pack.countryCode] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  };

  // Get pack by ID
  const getPackById = (id: string): IndustryMemoryPack | undefined => {
    return packs.find(p => p.id === id);
  };

  // Update pack status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ 
      packId, 
      newStatus 
    }: { 
      packId: string; 
      newStatus: IndustryPackStatus;
    }) => {
      const updateData: any = { status: newStatus };
      
      // Set published_at when transitioning to stable
      if (newStatus === 'stable') {
        updateData.published_at = new Date().toISOString();
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          updateData.published_by = user.id;
        }
      }

      const { error } = await supabase
        .from('industry_templates')
        .update(updateData)
        .eq('id', packId);

      if (error) throw error;
      return { packId, newStatus };
    },
    onSuccess: ({ newStatus }) => {
      queryClient.invalidateQueries({ queryKey: ['industry-memory-packs'] });
      queryClient.invalidateQueries({ queryKey: ['industry-templates'] });
      
      const statusLabels: Record<IndustryPackStatus, string> = {
        draft: 'Draft',
        stable: 'Stable',
        deprecated: 'Deprecated',
      };
      
      toast({
        title: 'Cập nhật thành công',
        description: `Pack đã chuyển sang trạng thái ${statusLabels[newStatus]}`,
      });
    },
    onError: (error) => {
      console.error('Error updating pack status:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể cập nhật trạng thái pack',
        variant: 'destructive',
      });
    },
  });

  // Convenience methods for status transitions
  const publishPack = (packId: string) => 
    updateStatusMutation.mutate({ packId, newStatus: 'stable' });
  
  const deprecatePack = (packId: string) => 
    updateStatusMutation.mutate({ packId, newStatus: 'deprecated' });
  
  const reactivatePack = (packId: string) => 
    updateStatusMutation.mutate({ packId, newStatus: 'draft' });

  // Group packs by country
  const packsByCountry = packs.reduce((acc, pack) => {
    const key = pack.countryCode;
    if (!acc[key]) {
      acc[key] = {
        countryCode: pack.countryCode,
        countryName: pack.countryName,
        flagEmoji: pack.flagEmoji,
        packs: [],
      };
    }
    acc[key].packs.push(pack);
    return acc;
  }, {} as Record<string, { 
    countryCode: string; 
    countryName: string; 
    flagEmoji: string | null;
    packs: IndustryMemoryPack[];
  }>);

  return {
    packs,
    packsByCountry,
    stats,
    isLoading,
    error,
    refetch,
    getPackById,
    // Status mutations
    updateStatus: updateStatusMutation.mutate,
    publishPack,
    deprecatePack,
    reactivatePack,
    isUpdating: updateStatusMutation.isPending,
  };
}

/**
 * Hook để fetch stable packs only (dùng cho production content generation)
 */
export function useStableIndustryPacks(countryCode?: string) {
  return useIndustryMemoryPacks({
    countryCode,
    status: 'stable',
    onlyActive: true,
  });
}
