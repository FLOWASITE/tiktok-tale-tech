import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { AdCopy, PolicyWarning } from '@/types/adCopy';

export function useCampaignAdCopies(campaignId?: string) {
  const { data: adCopies = [], isLoading, refetch } = useQuery({
    queryKey: ['campaign-ad-copies', campaignId],
    queryFn: async () => {
      if (!campaignId) return [];

      const { data, error } = await supabase
        .from('ad_copies')
        .select(`
          *,
          brand_template:brand_templates(name, brand_name),
          product:brand_products(name),
          persona:customer_personas(name)
        `)
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch variations for each ad copy
      const adCopiesWithVariations = await Promise.all(
        (data || []).map(async (adCopy) => {
          const { data: variations } = await supabase
            .from('ad_copy_variations')
            .select('*')
            .eq('ad_copy_id', adCopy.id)
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
        })
      );

      return adCopiesWithVariations;
    },
    enabled: !!campaignId,
  });

  return {
    adCopies,
    isLoading,
    refetch,
  };
}
