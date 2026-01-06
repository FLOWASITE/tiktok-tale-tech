import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { subDays, format, parseISO, startOfDay, endOfDay } from 'date-fns';

export interface AnalyticsFilters {
  dateRange: { from: Date; to: Date };
  platforms?: string[];
  brands?: string[];
  campaigns?: string[];
}

export interface AnalyticsSummary {
  totalSpend: number;
  totalRevenue: number;
  totalConversions: number;
  totalImpressions: number;
  totalClicks: number;
  avgCTR: number;
  avgCPC: number;
  avgCPM: number;
  overallROAS: number;
  avgConversionRate: number;
  // Comparisons vs previous period
  spendChange: number;
  revenueChange: number;
  roasChange: number;
  ctrChange: number;
  conversionsChange: number;
}

export interface PlatformBreakdown {
  platform: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  ctr: number;
  roas: number;
}

export interface TimeSeriesDataPoint {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  ctr: number;
  roas: number;
}

export interface TopPerformer {
  adCopyId: string;
  title: string;
  platform: string;
  roas: number;
  spend: number;
  conversions: number;
  ctr: number;
}

const DEFAULT_FILTERS: AnalyticsFilters = {
  dateRange: {
    from: subDays(new Date(), 30),
    to: new Date(),
  },
};

export function useAdCopyAnalytics(initialFilters?: Partial<AnalyticsFilters>) {
  const { currentOrganization } = useOrganization();
  const [filters, setFilters] = useState<AnalyticsFilters>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  });

  // Fetch performance data
  const { data: performanceData, isLoading: isLoadingPerformance } = useQuery({
    queryKey: ['ad-copy-analytics', currentOrganization?.id, filters],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];

      const fromDate = format(startOfDay(filters.dateRange.from), 'yyyy-MM-dd');
      const toDate = format(endOfDay(filters.dateRange.to), 'yyyy-MM-dd');

      let query = supabase
        .from('ad_copy_performance')
        .select(`
          *,
          ad_copies!inner (
            id,
            title,
            platform,
            brand_template_id,
            campaign_id,
            organization_id
          )
        `)
        .gte('logged_at', fromDate)
        .lte('logged_at', toDate);

      // Apply organization filter
      query = query.eq('ad_copies.organization_id', currentOrganization.id);

      // Apply optional filters
      if (filters.platforms?.length) {
        query = query.in('ad_copies.platform', filters.platforms);
      }
      if (filters.brands?.length) {
        query = query.in('ad_copies.brand_template_id', filters.brands);
      }
      if (filters.campaigns?.length) {
        query = query.in('ad_copies.campaign_id', filters.campaigns);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentOrganization?.id,
  });

  // Fetch previous period data for comparison
  const { data: previousPeriodData } = useQuery({
    queryKey: ['ad-copy-analytics-previous', currentOrganization?.id, filters],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];

      const periodLength = Math.ceil(
        (filters.dateRange.to.getTime() - filters.dateRange.from.getTime()) / (1000 * 60 * 60 * 24)
      );
      const prevFrom = subDays(filters.dateRange.from, periodLength);
      const prevTo = subDays(filters.dateRange.from, 1);

      let query = supabase
        .from('ad_copy_performance')
        .select(`
          spend,
          conversion_value,
          conversions,
          impressions,
          clicks,
          ad_copies!inner (organization_id)
        `)
        .gte('logged_at', format(prevFrom, 'yyyy-MM-dd'))
        .lte('logged_at', format(prevTo, 'yyyy-MM-dd'))
        .eq('ad_copies.organization_id', currentOrganization.id);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentOrganization?.id,
  });

  // Calculate summary metrics
  const summary: AnalyticsSummary = useMemo(() => {
    const data = performanceData || [];
    const prevData = previousPeriodData || [];

    const totalSpend = data.reduce((sum, d) => sum + (d.spend || 0), 0);
    const totalRevenue = data.reduce((sum, d) => sum + (d.conversion_value || 0), 0);
    const totalConversions = data.reduce((sum, d) => sum + (d.conversions || 0), 0);
    const totalImpressions = data.reduce((sum, d) => sum + (d.impressions || 0), 0);
    const totalClicks = data.reduce((sum, d) => sum + (d.clicks || 0), 0);

    const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const avgCPC = totalClicks > 0 ? totalSpend / totalClicks : 0;
    const avgCPM = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
    const overallROAS = totalSpend > 0 ? totalRevenue / totalSpend : 0;
    const avgConversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

    // Previous period calculations
    const prevSpend = prevData.reduce((sum, d) => sum + (d.spend || 0), 0);
    const prevRevenue = prevData.reduce((sum, d) => sum + (d.conversion_value || 0), 0);
    const prevConversions = prevData.reduce((sum, d) => sum + (d.conversions || 0), 0);
    const prevImpressions = prevData.reduce((sum, d) => sum + (d.impressions || 0), 0);
    const prevClicks = prevData.reduce((sum, d) => sum + (d.clicks || 0), 0);
    const prevCTR = prevImpressions > 0 ? (prevClicks / prevImpressions) * 100 : 0;
    const prevROAS = prevSpend > 0 ? prevRevenue / prevSpend : 0;

    const calcChange = (current: number, previous: number) =>
      previous > 0 ? ((current - previous) / previous) * 100 : current > 0 ? 100 : 0;

    return {
      totalSpend,
      totalRevenue,
      totalConversions,
      totalImpressions,
      totalClicks,
      avgCTR,
      avgCPC,
      avgCPM,
      overallROAS,
      avgConversionRate,
      spendChange: calcChange(totalSpend, prevSpend),
      revenueChange: calcChange(totalRevenue, prevRevenue),
      roasChange: calcChange(overallROAS, prevROAS),
      ctrChange: calcChange(avgCTR, prevCTR),
      conversionsChange: calcChange(totalConversions, prevConversions),
    };
  }, [performanceData, previousPeriodData]);

  // Calculate platform breakdown
  const platformBreakdown: PlatformBreakdown[] = useMemo(() => {
    const data = performanceData || [];
    const platformMap = new Map<string, PlatformBreakdown>();

    data.forEach((d) => {
      const platform = (d.ad_copies as any)?.platform || 'unknown';
      const existing = platformMap.get(platform) || {
        platform,
        spend: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        revenue: 0,
        ctr: 0,
        roas: 0,
      };

      existing.spend += d.spend || 0;
      existing.impressions += d.impressions || 0;
      existing.clicks += d.clicks || 0;
      existing.conversions += d.conversions || 0;
      existing.revenue += d.conversion_value || 0;

      platformMap.set(platform, existing);
    });

    return Array.from(platformMap.values()).map((p) => ({
      ...p,
      ctr: p.impressions > 0 ? (p.clicks / p.impressions) * 100 : 0,
      roas: p.spend > 0 ? p.revenue / p.spend : 0,
    })).sort((a, b) => b.spend - a.spend);
  }, [performanceData]);

  // Calculate time series data
  const timeSeries: TimeSeriesDataPoint[] = useMemo(() => {
    const data = performanceData || [];
    const dateMap = new Map<string, TimeSeriesDataPoint>();

    data.forEach((d) => {
      const date = format(parseISO(d.logged_at), 'yyyy-MM-dd');
      const existing = dateMap.get(date) || {
        date,
        spend: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        revenue: 0,
        ctr: 0,
        roas: 0,
      };

      existing.spend += d.spend || 0;
      existing.impressions += d.impressions || 0;
      existing.clicks += d.clicks || 0;
      existing.conversions += d.conversions || 0;
      existing.revenue += d.conversion_value || 0;

      dateMap.set(date, existing);
    });

    return Array.from(dateMap.values())
      .map((p) => ({
        ...p,
        ctr: p.impressions > 0 ? (p.clicks / p.impressions) * 100 : 0,
        roas: p.spend > 0 ? p.revenue / p.spend : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [performanceData]);

  // Calculate top performers
  const topPerformers: TopPerformer[] = useMemo(() => {
    const data = performanceData || [];
    const adCopyMap = new Map<string, TopPerformer>();

    data.forEach((d) => {
      const adCopyId = (d.ad_copies as any)?.id;
      if (!adCopyId) return;

      const existing = adCopyMap.get(adCopyId) || {
        adCopyId,
        title: (d.ad_copies as any)?.title || 'Unknown',
        platform: (d.ad_copies as any)?.platform || 'unknown',
        roas: 0,
        spend: 0,
        conversions: 0,
        ctr: 0,
      };

      existing.spend += d.spend || 0;
      existing.conversions += d.conversions || 0;
      const totalImpressions = data
        .filter((x) => (x.ad_copies as any)?.id === adCopyId)
        .reduce((sum, x) => sum + (x.impressions || 0), 0);
      const totalClicks = data
        .filter((x) => (x.ad_copies as any)?.id === adCopyId)
        .reduce((sum, x) => sum + (x.clicks || 0), 0);
      const totalRevenue = data
        .filter((x) => (x.ad_copies as any)?.id === adCopyId)
        .reduce((sum, x) => sum + (x.conversion_value || 0), 0);

      existing.ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
      existing.roas = existing.spend > 0 ? totalRevenue / existing.spend : 0;

      adCopyMap.set(adCopyId, existing);
    });

    return Array.from(adCopyMap.values())
      .sort((a, b) => b.roas - a.roas)
      .slice(0, 10);
  }, [performanceData]);

  const updateFilters = useCallback((newFilters: Partial<AnalyticsFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  return {
    filters,
    updateFilters,
    summary,
    platformBreakdown,
    timeSeries,
    topPerformers,
    isLoading: isLoadingPerformance,
    rawData: performanceData,
  };
}
