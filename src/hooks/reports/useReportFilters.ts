import { useState, useMemo, useCallback } from 'react';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { useCurrentBrand } from '@/contexts/BrandContext';

export interface ReportFilters {
  dateFrom: Date;
  dateTo: Date;
  brandId: string | null; // null = all brands in current org
  campaignId: string | null;
  channel: string | null; // null = all channels
}

const DEFAULT_RANGE_DAYS = 30;

function defaultFilters(brandId: string | null): ReportFilters {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - DEFAULT_RANGE_DAYS);
  return { dateFrom: from, dateTo: to, brandId, campaignId: null, channel: null };
}

export function useReportFilters() {
  const { currentOrganization } = useOrganizationContext();
  const { currentBrand } = useCurrentBrand();
  const [filters, setFilters] = useState<ReportFilters>(() =>
    defaultFilters(currentBrand?.id ?? null),
  );

  const updateFilters = useCallback((patch: Partial<ReportFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(defaultFilters(currentBrand?.id ?? null));
  }, [currentBrand?.id]);

  const setPresetRange = useCallback((days: number) => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    setFilters((p) => ({ ...p, dateFrom: from, dateTo: to }));
  }, []);

  const queryKey = useMemo(
    () => [
      currentOrganization?.id,
      filters.dateFrom.toISOString(),
      filters.dateTo.toISOString(),
      filters.brandId,
      filters.campaignId,
      filters.channel,
    ],
    [currentOrganization?.id, filters],
  );

  return {
    filters,
    updateFilters,
    resetFilters,
    setPresetRange,
    organizationId: currentOrganization?.id ?? null,
    queryKey,
  };
}
