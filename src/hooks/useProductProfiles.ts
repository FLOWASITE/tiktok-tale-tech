import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import type { BrandProduct } from '@/types/product';

/**
 * Org-wide products fetcher (across all brands in current org).
 * Used by MultiProductPicker so users can attach products to any video/script.
 */
export function useProductProfiles() {
  const { currentOrganization } = useOrganizationContext();
  const orgId = currentOrganization?.id;

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['product-profiles-org', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('brand_products')
        .select('*')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .order('is_featured', { ascending: false })
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as BrandProduct[];
    },
    enabled: !!orgId,
  });

  return { profiles, isLoading };
}
