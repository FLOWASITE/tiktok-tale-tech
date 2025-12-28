import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface BrandCounts {
  personasCount: number;
  productsCount: number;
  industryMemoryName?: string;
  industryMemoryCode?: string;
}

interface BrandWithIndustry {
  id: string;
  industry_template_id: string | null;
}

export function useBrandCounts(brands: BrandWithIndustry[]) {
  const { user } = useAuth();
  const [counts, setCounts] = useState<Record<string, BrandCounts>>({});
  const [loading, setLoading] = useState(false);

  const brandIds = brands.map(b => b.id);
  const industryTemplateIds = [...new Set(brands.map(b => b.industry_template_id).filter(Boolean))] as string[];

  const fetchCounts = useCallback(async () => {
    if (!user || brandIds.length === 0) {
      setCounts({});
      return;
    }

    setLoading(true);
    try {
      // Fetch personas counts, products counts, and industry names in parallel
      const [personasResult, productsResult, industryResult] = await Promise.all([
        supabase
          .from('customer_personas')
          .select('brand_template_id')
          .in('brand_template_id', brandIds),
        supabase
          .from('brand_products')
          .select('brand_template_id')
          .in('brand_template_id', brandIds),
        industryTemplateIds.length > 0 
          ? supabase
              .from('industry_template_translations')
              .select('industry_template_id, name, language_code')
              .in('industry_template_id', industryTemplateIds)
          : Promise.resolve({ data: [] })
      ]);

      // Build industry name map (prefer 'vi', fallback to 'en')
      const industryNameMap: Record<string, string> = {};
      const industryTranslations = industryResult.data || [];
      
      industryTemplateIds.forEach(id => {
        const viTranslation = industryTranslations.find(t => t.industry_template_id === id && t.language_code === 'vi');
        const enTranslation = industryTranslations.find(t => t.industry_template_id === id && t.language_code === 'en');
        industryNameMap[id] = viTranslation?.name || enTranslation?.name || '';
      });

      // Build counts map
      const countsMap: Record<string, BrandCounts> = {};
      
      // Initialize all brands
      brands.forEach(brand => {
        const industryId = brand.industry_template_id;
        countsMap[brand.id] = { 
          personasCount: 0, 
          productsCount: 0,
          industryMemoryName: industryId ? industryNameMap[industryId] : undefined,
        };
      });

      // Count personas
      personasResult.data?.forEach(p => {
        if (p.brand_template_id && countsMap[p.brand_template_id]) {
          countsMap[p.brand_template_id].personasCount++;
        }
      });

      // Count products
      productsResult.data?.forEach(p => {
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
  }, [user, brandIds.join(','), industryTemplateIds.join(',')]);

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
