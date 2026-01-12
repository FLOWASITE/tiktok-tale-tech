import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { IndustryGlobalPack, IndustryPackWithChildren, IndustryLevel } from '@/types/industryParkV2';

// ============================================
// Industry Hierarchy Hook - For Core/Sub Structure
// ============================================

interface UseIndustryHierarchyOptions {
  categoryId?: string | null;
  levelFilter?: 'all' | 'core' | 'sub';
  activeOnly?: boolean;
  languageCode?: string;
}

interface CategoryWithLabel {
  id: string;
  code: string;
  label: string | null;
  icon_name: string | null;
  color: string | null;
}

interface IndustryPackWithTranslation extends IndustryGlobalPack {
  name?: string;
  short_name?: string;
  category?: CategoryWithLabel;
  parent_industry_code?: string;
}

/**
 * Fetch industries with hierarchical parent-child structure
 */
export function useIndustryHierarchy(options: UseIndustryHierarchyOptions = {}) {
  const { 
    categoryId, 
    levelFilter = 'all', 
    activeOnly = true,
    languageCode = 'vi'
  } = options;

  return useQuery({
    queryKey: ['industry-hierarchy', categoryId, levelFilter, activeOnly, languageCode],
    queryFn: async () => {
      // Build query for global packs with translations
      let query = supabase
        .from('industry_global_packs')
        .select(`
          *,
          industry_pack_translations!inner (
            name,
            short_name,
            language_code
          ),
          industry_categories (
            id,
            code,
            label,
            icon_name,
            color
          ),
          parent:industry_global_packs!parent_pack_id (
            industry_code
          )
        `)
        .eq('industry_pack_translations.language_code', languageCode)
        .order('sort_order', { ascending: true });

      // Apply filters
      if (activeOnly) {
        query = query.eq('is_active', true);
      }

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      if (levelFilter !== 'all') {
        query = query.eq('industry_level', levelFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform data to include translation fields at top level
      const transformedData: IndustryPackWithTranslation[] = (data || []).map((pack: any) => ({
        ...pack,
        name: pack.industry_pack_translations?.[0]?.name || pack.industry_code,
        short_name: pack.industry_pack_translations?.[0]?.short_name,
        category: pack.industry_categories,
        parent_industry_code: pack.parent?.industry_code,
        // Clean up nested objects
        industry_pack_translations: undefined,
        industry_categories: undefined,
        parent: undefined,
      }));

      return transformedData;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch industries grouped into hierarchical tree structure
 * Returns core industries with their children nested
 */
export function useIndustryTree(options: Omit<UseIndustryHierarchyOptions, 'levelFilter'> = {}) {
  const { data: allIndustries, ...rest } = useIndustryHierarchy({
    ...options,
    levelFilter: 'all',
  });

  // Build tree structure: cores with nested subs
  const tree: IndustryPackWithChildren[] = [];

  if (allIndustries) {
    // Separate cores and subs
    const cores = allIndustries.filter(i => i.industry_level === 'core' || !i.industry_level);
    const subs = allIndustries.filter(i => i.industry_level === 'sub');

    // Map subs to their parents
    const subsByParent = new Map<string, IndustryGlobalPack[]>();
    subs.forEach(sub => {
      if (sub.parent_pack_id) {
        const existing = subsByParent.get(sub.parent_pack_id) || [];
        existing.push(sub as IndustryGlobalPack);
        subsByParent.set(sub.parent_pack_id, existing);
      }
    });

    // Build tree
    cores.forEach(core => {
      tree.push({
        ...(core as IndustryGlobalPack),
        children: subsByParent.get(core.id) || [],
      });
    });
  }

  return {
    ...rest,
    data: tree,
    flatData: allIndustries,
  };
}

/**
 * Fetch available parent industries (core only) for dropdown
 */
export function useAvailableParentIndustries(languageCode = 'vi') {
  return useQuery({
    queryKey: ['available-parent-industries', languageCode],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('industry_global_packs')
        .select(`
          id,
          industry_code,
          industry_pack_translations!inner (
            name,
            short_name
          )
        `)
        .eq('industry_level', 'core')
        .eq('is_active', true)
        .eq('industry_pack_translations.language_code', languageCode)
        .order('industry_code', { ascending: true });

      if (error) throw error;

      return (data || []).map((pack: any) => ({
        id: pack.id,
        code: pack.industry_code,
        name: pack.industry_pack_translations?.[0]?.name || pack.industry_code,
        short_name: pack.industry_pack_translations?.[0]?.short_name,
      }));
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get statistics about industry hierarchy
 */
export function useIndustryStats() {
  return useQuery({
    queryKey: ['industry-stats'],
    queryFn: async () => {
      // Get counts by level
      const { data: levelCounts, error: levelError } = await supabase
        .from('industry_global_packs')
        .select('industry_level')
        .eq('is_active', true);

      if (levelError) throw levelError;

      // Get counts by category
      const { data: categoryCounts, error: categoryError } = await supabase
        .from('industry_global_packs')
        .select(`
          category_id,
          industry_categories (
            code,
            label
          )
        `)
        .eq('is_active', true);

      if (categoryError) throw categoryError;

      const coreCount = levelCounts?.filter(i => i.industry_level === 'core' || !i.industry_level).length || 0;
      const subCount = levelCounts?.filter(i => i.industry_level === 'sub').length || 0;

      // Group by category
      const byCategory: Record<string, { code: string; label: string; count: number }> = {};
      categoryCounts?.forEach((item: any) => {
        const catId = item.category_id;
        if (catId) {
          if (!byCategory[catId]) {
            byCategory[catId] = {
              code: item.industry_categories?.code || 'unknown',
              label: item.industry_categories?.label || 'Unknown',
              count: 0,
            };
          }
          byCategory[catId].count++;
        }
      });

      return {
        total: (levelCounts?.length || 0),
        coreCount,
        subCount,
        byCategory: Object.values(byCategory).sort((a, b) => b.count - a.count),
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
