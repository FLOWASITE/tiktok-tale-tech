import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CarouselBrandInfo {
  brand_name: string;
  logo_url: string | null;
}

/**
 * Fetches brand_name + logo_url for a list of brand_template_ids
 * Returns a map of brand_template_id → CarouselBrandInfo
 */
export function useCarouselBrands(brandTemplateIds: (string | null | undefined)[]) {
  const [brandMap, setBrandMap] = useState<Record<string, CarouselBrandInfo>>({});

  useEffect(() => {
    const uniqueIds = [...new Set(brandTemplateIds.filter(Boolean))] as string[];
    if (uniqueIds.length === 0) {
      setBrandMap({});
      return;
    }

    const fetchBrands = async () => {
      const { data, error } = await supabase
        .from('brand_templates')
        .select('id, brand_name, logo_url')
        .in('id', uniqueIds);

      if (error) {
        console.error('Error fetching carousel brands:', error);
        return;
      }

      const map: Record<string, CarouselBrandInfo> = {};
      for (const row of data || []) {
        map[row.id] = {
          brand_name: row.brand_name,
          logo_url: row.logo_url,
        };
      }
      setBrandMap(map);
    };

    fetchBrands();
  }, [JSON.stringify(brandTemplateIds)]);

  return { brandMap };
}
