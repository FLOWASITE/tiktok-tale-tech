import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Benchmark {
  platform: string;
  industry: string | null;
  avgCTR: number;
  avgCPC: number;
  avgCPM: number;
  avgConversionRate: number;
  avgROAS: number;
}

export interface BenchmarkComparison {
  metric: string;
  label: string;
  yourValue: number;
  benchmarkValue: number;
  percentageDiff: number;
  status: 'above' | 'below' | 'at';
}

export function useAdCopyBenchmarks(platform?: string, industry?: string) {
  const { data: benchmarks, isLoading } = useQuery({
    queryKey: ['ad-copy-benchmarks', platform, industry],
    queryFn: async () => {
      let query = supabase
        .from('ad_copy_benchmarks')
        .select('*');

      if (platform) {
        query = query.eq('platform', platform);
      }

      if (industry) {
        query = query.eq('industry', industry);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((b) => ({
        platform: b.platform,
        industry: b.industry,
        avgCTR: b.avg_ctr || 0,
        avgCPC: b.avg_cpc || 0,
        avgCPM: b.avg_cpm || 0,
        avgConversionRate: b.avg_conversion_rate || 0,
        avgROAS: b.avg_roas || 0,
      })) as Benchmark[];
    },
  });

  const compareToBenchmark = (
    metrics: {
      ctr?: number;
      cpc?: number;
      cpm?: number;
      conversionRate?: number;
      roas?: number;
    },
    targetPlatform?: string
  ): BenchmarkComparison[] => {
    if (!benchmarks?.length) return [];

    // Find the most relevant benchmark
    const benchmark = benchmarks.find(
      (b) => (!targetPlatform || b.platform === targetPlatform) && (!industry || b.industry === industry)
    ) || benchmarks[0];

    if (!benchmark) return [];

    const comparisons: BenchmarkComparison[] = [];

    const addComparison = (
      metric: string,
      label: string,
      yourValue: number | undefined,
      benchmarkValue: number,
      higherIsBetter: boolean = true
    ) => {
      if (yourValue === undefined || benchmarkValue === 0) return;

      const diff = ((yourValue - benchmarkValue) / benchmarkValue) * 100;
      const status: 'above' | 'below' | 'at' =
        Math.abs(diff) < 5 ? 'at' : (diff > 0 === higherIsBetter ? 'above' : 'below');

      comparisons.push({
        metric,
        label,
        yourValue,
        benchmarkValue,
        percentageDiff: diff,
        status,
      });
    };

    addComparison('ctr', 'CTR', metrics.ctr, benchmark.avgCTR, true);
    addComparison('cpc', 'CPC', metrics.cpc, benchmark.avgCPC, false); // Lower is better
    addComparison('cpm', 'CPM', metrics.cpm, benchmark.avgCPM, false); // Lower is better
    addComparison('conversionRate', 'Tỷ lệ chuyển đổi', metrics.conversionRate, benchmark.avgConversionRate, true);
    addComparison('roas', 'ROAS', metrics.roas, benchmark.avgROAS, true);

    return comparisons;
  };

  // Get aggregated benchmark by platform
  const getAggregatedBenchmark = (): Benchmark | null => {
    if (!benchmarks?.length) return null;

    const avgCTR = benchmarks.reduce((sum, b) => sum + b.avgCTR, 0) / benchmarks.length;
    const avgCPC = benchmarks.reduce((sum, b) => sum + b.avgCPC, 0) / benchmarks.length;
    const avgCPM = benchmarks.reduce((sum, b) => sum + b.avgCPM, 0) / benchmarks.length;
    const avgConversionRate = benchmarks.reduce((sum, b) => sum + b.avgConversionRate, 0) / benchmarks.length;
    const avgROAS = benchmarks.reduce((sum, b) => sum + b.avgROAS, 0) / benchmarks.length;

    return {
      platform: 'all',
      industry: industry || null,
      avgCTR,
      avgCPC,
      avgCPM,
      avgConversionRate,
      avgROAS,
    };
  };

  return {
    benchmarks,
    isLoading,
    compareToBenchmark,
    getAggregatedBenchmark,
  };
}
