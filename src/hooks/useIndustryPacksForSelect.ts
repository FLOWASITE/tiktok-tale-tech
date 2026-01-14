/**
 * Hook to fetch industry packs for selection, grouped by category
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface IndustryPackForSelect {
  id: string;
  industry_code: string;
  name: string;
  category_id: string;
  category_label: string;
}

export interface GroupedIndustryPacks {
  category_id: string;
  category_label: string;
  packs: IndustryPackForSelect[];
}

export function useIndustryPacksForSelect() {
  return useQuery({
    queryKey: ['industryPacksForSelect'],
    queryFn: async () => {
      // Fetch packs with translations and category info
      const { data, error } = await supabase
        .from('industry_global_packs')
        .select(`
          id,
          industry_code,
          category_id,
          industry_categories!inner(id, label),
          industry_pack_translations!inner(name, language_code)
        `)
        .eq('is_active', true)
        .eq('industry_pack_translations.language_code', 'vi')
        .order('category_id')
        .order('industry_code');

      if (error) throw error;

      // Transform to flat list
      const packs: IndustryPackForSelect[] = (data || []).map((pack: any) => ({
        id: pack.id,
        industry_code: pack.industry_code,
        name: pack.industry_pack_translations?.[0]?.name || pack.industry_code,
        category_id: pack.category_id,
        category_label: pack.industry_categories?.label || 'Khác',
      }));

      // Group by category
      const groupedMap = new Map<string, GroupedIndustryPacks>();
      
      for (const pack of packs) {
        if (!groupedMap.has(pack.category_id)) {
          groupedMap.set(pack.category_id, {
            category_id: pack.category_id,
            category_label: pack.category_label,
            packs: [],
          });
        }
        groupedMap.get(pack.category_id)!.packs.push(pack);
      }

      return {
        flat: packs,
        grouped: Array.from(groupedMap.values()),
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
