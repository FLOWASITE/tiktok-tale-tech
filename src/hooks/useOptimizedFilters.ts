import { useMemo, useCallback, useState, useTransition, useDeferredValue } from 'react';
import { subDays, isAfter, startOfDay } from 'date-fns';
import type { AdCopy } from '@/types/adCopy';

export type DatePreset = 'all' | 'today' | '7days' | '30days' | '90days';
export type SortOption = 'created_desc' | 'created_asc' | 'title_asc' | 'title_desc' | 'status' | 'platform' | 'variations';

interface FilterState {
  searchQuery: string;
  platformFilter: string;
  statusFilter: string;
  objectiveFilter: string;
  funnelFilter: string;
  datePreset: DatePreset;
  campaignFilter: string;
  brandFilter: string;
  sortOption: SortOption;
}

const initialFilterState: FilterState = {
  searchQuery: '',
  platformFilter: 'all',
  statusFilter: 'all',
  objectiveFilter: 'all',
  funnelFilter: 'all',
  datePreset: 'all',
  campaignFilter: 'all',
  brandFilter: 'all',
  sortOption: 'created_desc',
};

export function useOptimizedFilters(adCopies: AdCopy[]) {
  const [filters, setFilters] = useState<FilterState>(initialFilterState);
  const [isPending, startTransition] = useTransition();
  
  // Deferred search for smoother typing
  const deferredSearch = useDeferredValue(filters.searchQuery);

  // Get date filter cutoff
  const getDateCutoff = useCallback((preset: DatePreset): Date | null => {
    const now = new Date();
    switch (preset) {
      case 'today':
        return startOfDay(now);
      case '7days':
        return subDays(now, 7);
      case '30days':
        return subDays(now, 30);
      case '90days':
        return subDays(now, 90);
      default:
        return null;
    }
  }, []);

  // Memoized filter function
  const filteredAdCopies = useMemo(() => {
    const dateCutoff = getDateCutoff(filters.datePreset);
    const searchLower = deferredSearch.toLowerCase();
    
    let result = adCopies.filter(ad => {
      // Quick bail-out checks first (cheapest operations)
      if (filters.platformFilter !== 'all' && ad.platform !== filters.platformFilter) return false;
      if (filters.statusFilter !== 'all' && ad.status !== filters.statusFilter) return false;
      if (filters.objectiveFilter !== 'all' && ad.objective !== filters.objectiveFilter) return false;
      if (filters.funnelFilter !== 'all' && ad.funnel_stage !== filters.funnelFilter) return false;
      if (filters.campaignFilter !== 'all' && ad.campaign?.id !== filters.campaignFilter) return false;
      if (filters.brandFilter !== 'all' && ad.brand_template_id !== filters.brandFilter) return false;
      
      // Date check
      if (dateCutoff && ad.created_at && !isAfter(new Date(ad.created_at), dateCutoff)) return false;
      
      // Search (most expensive, do last)
      if (searchLower) {
        const matchesTitle = ad.title.toLowerCase().includes(searchLower);
        const matchesTopic = ad.topic.toLowerCase().includes(searchLower);
        if (!matchesTitle && !matchesTopic) return false;
      }
      
      return true;
    });
    
    // Sort
    const sortFn = getSortFunction(filters.sortOption);
    result.sort(sortFn);
    
    return result;
  }, [adCopies, deferredSearch, filters, getDateCutoff]);

  // Update filter with transition for non-blocking UI
  const updateFilter = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    startTransition(() => {
      setFilters(prev => ({ ...prev, [key]: value }));
    });
  }, []);

  // Reset all filters
  const resetFilters = useCallback(() => {
    startTransition(() => {
      setFilters(initialFilterState);
    });
  }, []);

  // Get unique campaigns and brands
  const { campaigns, brands } = useMemo(() => {
    const campaignMap = new Map<string, string>();
    const brandMap = new Map<string, string>();
    
    adCopies.forEach(ad => {
      if (ad.campaign?.id && ad.campaign?.name) {
        campaignMap.set(ad.campaign.id, ad.campaign.name);
      }
      if (ad.brand_template_id && ad.brand_template?.brand_name) {
        brandMap.set(ad.brand_template_id, ad.brand_template.brand_name);
      }
    });
    
    return {
      campaigns: Array.from(campaignMap.entries()).map(([id, name]) => ({ id, name })),
      brands: Array.from(brandMap.entries()).map(([id, brand_name]) => ({ id, brand_name })),
    };
  }, [adCopies]);

  return {
    filters,
    filteredAdCopies,
    campaigns,
    brands,
    isPending,
    updateFilter,
    resetFilters,
  };
}

// Helper function for sorting
function getSortFunction(sortOption: SortOption): (a: AdCopy, b: AdCopy) => number {
  switch (sortOption) {
    case 'created_desc':
      return (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    case 'created_asc':
      return (a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
    case 'title_asc':
      return (a, b) => a.title.localeCompare(b.title);
    case 'title_desc':
      return (a, b) => b.title.localeCompare(a.title);
    case 'status': {
      const statusOrder = ['published', 'approved', 'review', 'draft'];
      return (a, b) => statusOrder.indexOf(a.status || 'draft') - statusOrder.indexOf(b.status || 'draft');
    }
    case 'platform':
      return (a, b) => a.platform.localeCompare(b.platform);
    case 'variations':
      return (a, b) => (b.variations?.length || 0) - (a.variations?.length || 0);
    default:
      return () => 0;
  }
}
