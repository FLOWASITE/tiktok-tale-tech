import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export interface BrandCounts {
  personasCount: number;
  productsCount: number;
}

export function useBrandCounts(brandIds: string[]) {
  const { user } = useAuth();
  const { currentOrganization } = useOrganizationContext();
  const [counts, setCounts] = useState<Record<string, BrandCounts>>({});
  const [loading, setLoading] = useState(false);

  const fetchCounts = useCallback(async () => {
    if (!user || brandIds.length === 0) {
      setCounts({});
      return;
    }

    setLoading(true);
    try {
      // Fetch personas counts
      const { data: personasData } = await supabase
        .from('customer_personas')
        .select('brand_template_id')
        .in('brand_template_id', brandIds);

      // Fetch products counts
      const { data: productsData } = await supabase
        .from('brand_products')
        .select('brand_template_id')
        .in('brand_template_id', brandIds);

      // Build counts map
      const countsMap: Record<string, BrandCounts> = {};
      
      // Initialize all brands with zero counts
      brandIds.forEach(id => {
        countsMap[id] = { personasCount: 0, productsCount: 0 };
      });

      // Count personas
      personasData?.forEach(p => {
        if (p.brand_template_id && countsMap[p.brand_template_id]) {
          countsMap[p.brand_template_id].personasCount++;
        }
      });

      // Count products
      productsData?.forEach(p => {
        if (p.brand_template_id && countsMap[p.brand_template_id]) {
          countsMap[p.brand_template_id].productsCount++;
        }
      });

      setCounts(countsMap);
    } catch (error) {
      console.error('Error fetching brand counts:', error);
    } finally {
      setLoading(false);
    }
  }, [user, brandIds.join(',')]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  const getCountsForBrand = useCallback((brandId: string): BrandCounts => {
    return counts[brandId] || { personasCount: 0, productsCount: 0 };
  }, [counts]);

  return {
    counts,
    loading,
    getCountsForBrand,
    refetch: fetchCounts,
  };
}
