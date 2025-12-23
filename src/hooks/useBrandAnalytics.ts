import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface BrandUsageStats {
  brandId: string;
  multiChannelCount: number;
}

export function useBrandAnalytics(brandIds: string[]) {
  const { user } = useAuth();
  const [usageStats, setUsageStats] = useState<Record<string, BrandUsageStats>>({});
  const [isLoading, setIsLoading] = useState(false);

  const fetchUsageStats = useCallback(async () => {
    if (!user?.id || brandIds.length === 0) return;

    setIsLoading(true);
    try {
      // Fetch multi_channel_contents count per brand_template_id
      const { data, error } = await supabase
        .from('multi_channel_contents')
        .select('brand_template_id')
        .in('brand_template_id', brandIds);

      if (error) {
        console.error('Error fetching brand usage stats:', error);
        return;
      }

      // Count occurrences per brand
      const statsMap: Record<string, BrandUsageStats> = {};
      
      // Initialize all brands with 0
      brandIds.forEach(id => {
        statsMap[id] = {
          brandId: id,
          multiChannelCount: 0,
        };
      });

      // Count from results
      data?.forEach(item => {
        if (item.brand_template_id && statsMap[item.brand_template_id]) {
          statsMap[item.brand_template_id].multiChannelCount++;
        }
      });

      setUsageStats(statsMap);
    } catch (err) {
      console.error('Error in fetchUsageStats:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, brandIds.join(',')]);

  useEffect(() => {
    fetchUsageStats();
  }, [fetchUsageStats]);

  const getUsageForBrand = useCallback((brandId: string): BrandUsageStats | null => {
    return usageStats[brandId] || null;
  }, [usageStats]);

  return {
    usageStats,
    isLoading,
    getUsageForBrand,
    refetch: fetchUsageStats,
  };
}
