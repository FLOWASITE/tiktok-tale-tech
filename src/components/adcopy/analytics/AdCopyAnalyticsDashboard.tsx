import { useAdCopyAnalytics } from '@/hooks/useAdCopyAnalytics';
import { useAdCopyBenchmarks } from '@/hooks/useAdCopyBenchmarks';
import { useAIInsights } from '@/hooks/useAIInsights';
import { AnalyticsOverviewCards } from './AnalyticsOverviewCards';
import { PerformanceTrendChart } from './PerformanceTrendChart';
import { PlatformComparisonChart } from './PlatformComparisonChart';
import { TopPerformersTable } from './TopPerformersTable';
import { AIInsightsPanel } from './AIInsightsPanel';
import { BenchmarkRadarChart } from './BenchmarkRadarChart';
import { AnalyticsFiltersComponent } from './AnalyticsFilters';
import { Button } from '@/components/ui/button';
import { Download, BarChart3 } from 'lucide-react';

export function AdCopyAnalyticsDashboard() {
  const {
    filters,
    updateFilters,
    summary,
    platformBreakdown,
    timeSeries,
    topPerformers,
    isLoading,
  } = useAdCopyAnalytics();

  const { compareToBenchmark, isLoading: isLoadingBenchmarks } = useAdCopyBenchmarks();

  const {
    insights,
    isLoading: isLoadingInsights,
    dismissInsight,
    generateInsights,
    isGenerating,
  } = useAIInsights();

  // Calculate benchmark comparisons
  const benchmarkComparisons = compareToBenchmark({
    ctr: summary.avgCTR,
    cpc: summary.avgCPC,
    cpm: summary.avgCPM,
    conversionRate: summary.avgConversionRate,
    roas: summary.overallROAS,
  });

  const handleExportCSV = () => {
    // Simple CSV export of time series data
    const headers = ['Ngày', 'Chi tiêu', 'Doanh thu', 'Clicks', 'Chuyển đổi', 'CTR', 'ROAS'];
    const rows = timeSeries.map((d) => [
      d.date,
      d.spend,
      d.revenue,
      d.clicks,
      d.conversions,
      d.ctr.toFixed(2),
      d.roas.toFixed(2),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ad-analytics-${filters.dateRange.from.toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Header with Filters and Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-semibold">Analytics Dashboard</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <AnalyticsFiltersComponent filters={filters} onFiltersChange={updateFilters} />

      {/* Overview Cards */}
      <AnalyticsOverviewCards summary={summary} isLoading={isLoading} />

      {/* Charts Row 1 */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PerformanceTrendChart data={timeSeries} isLoading={isLoading} />
        </div>
        <div className="lg:col-span-1">
          <AIInsightsPanel
            insights={insights || []}
            isLoading={isLoadingInsights}
            onDismiss={dismissInsight}
            onRefresh={generateInsights}
            isRefreshing={isGenerating}
          />
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <PlatformComparisonChart data={platformBreakdown} isLoading={isLoading} />
        <BenchmarkRadarChart
          comparisons={benchmarkComparisons}
          isLoading={isLoadingBenchmarks}
        />
      </div>

      {/* Top Performers */}
      <TopPerformersTable data={topPerformers} isLoading={isLoading} />
    </div>
  );
}
