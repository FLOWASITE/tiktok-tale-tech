/**
 * useIndustryCategories - Hook for fetching industry categories
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface IndustryCategory {
  id: string;
  code: string;
  label: string;
  iconName: string | null;
  sortOrder: number;
}

async function fetchCategories(): Promise<IndustryCategory[]> {
  const { data, error } = await supabase
    .from('industry_categories')
    .select('id, code, label, icon_name, sort_order')
    .eq('is_active', true)
    .order('sort_order');

  if (error) {
    console.error('Failed to fetch industry categories:', error);
    return [];
  }

  return (data || []).map(row => ({
    id: row.id,
    code: row.code,
    label: row.label,
    iconName: row.icon_name,
    sortOrder: row.sort_order ?? 999,
  }));
}

/**
 * Fetch list of all active industry categories
 */
export function useIndustryCategories() {
  return useQuery({
    queryKey: ['industryCategories'],
    queryFn: fetchCategories,
    staleTime: 30 * 60 * 1000, // Cache 30 minutes
    gcTime: 60 * 60 * 1000,
  });
}
