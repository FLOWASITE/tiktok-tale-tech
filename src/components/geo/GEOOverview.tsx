import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, TrendingUp, Quote, Brain, RefreshCw, Loader2, DollarSign } from 'lucide-react';
import { GEOMonitor } from '@/hooks/useGEOMonitors';
import { SOVChart } from './SOVChart';
import { SentimentGauge } from './SentimentGauge';
import { CitationTracker } from './CitationTracker';
import { VisibilityAlerts } from './VisibilityAlerts';
import { TrendChart } from './TrendChart';
import { AlertHistory } from './AlertHistory';
import { useGEOResults } from '@/hooks/useGEOResults';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GEOOverviewProps {
  monitors: GEOMonitor[];
  loading: boolean;
}

export function GEOOverview({ monitors, loading }: GEOOverviewProps) {
  const activeMonitor = monitors.find(m => m.is_active) || monitors[0];
  const { results, stats, loading: resultsLoading, refetch } = useGEOResults(activeMonitor?.id);
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState<{ cost: number; count: number } | null>(null);

  useEffect(() => {
    if (!activeMonitor?.id) return;
    supabase
      .from('geo_scan_jobs')
      .select('actual_cost_usd, total_api_calls, completed_at')
      .eq('brand_monitor_id', activeMonitor.id)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data?.[0]) {
          setLastScan({
            cost: Number(data[0].actual_cost_usd) || 0,
            count: Number(data[0].total_api_calls) || 0,
          });
        }
      });
  }, [activeMonitor?.id]);

  const handleScan = async () => {
    if (!activeMonitor) return;
    setScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke('geo-scan-brand', {
        body: { monitorId: activeMonitor.id },
      });
      if (error) throw error;
      const cost = data?.actual_cost_usd ? `$${data.actual_cost_usd.toFixed(4)}` : '';
      toast.success(`Scan hoàn tất: ${data?.results_count || 0} kết quả ${cost ? `(${cost})` : ''}`);
      setLastScan({ cost: data?.actual_cost_usd || 0, count: data?.results_count || 0 });
      refetch();
    } catch (err: any) {
      toast.error('Scan thất bại: ' + (err.message || 'Lỗi không xác định'));
    } finally {
      setScanning(false);
    }
  };

  if (loading || resultsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!activeMonitor) return null;

  // Count real vs simulated results
  const realCount = results.filter((r: any) => r.is_simulated === false).length;
  const simulatedCount = results.filter((r: any) => r.is_simulated !== false).length;

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <Badge variant="outline" className="text-sm">
            {activeMonitor.brand_name}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {activeMonitor.ai_engines.length} engines · {activeMonitor.keywords.length} keywords
          </span>
          {lastScan && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              Last scan: ${lastScan.cost.toFixed(4)}
            </span>
          )}
          {realCount > 0 && (
            <Badge className="text-[10px] px-1.5 py-0 bg-green-500/10 text-green-600 dark:text-green-400">
              {realCount} Real
            </Badge>
          )}
          {simulatedCount > 0 && (
            <Badge className="text-[10px] px-1.5 py-0 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
              {simulatedCount} Simulated
            </Badge>
          )}
        </div>
        <Button onClick={handleScan} disabled={scanning} size="sm">
          {scanning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          {scanning ? 'Đang scan...' : 'Scan ngay'}
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Share of Voice</CardTitle>
            <Eye className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.sov}%</div>
            <p className="text-xs text-muted-foreground mt-1">Tỉ lệ đề cập so với đối thủ</p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Citation Rate</CardTitle>
            <Quote className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.citationRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">AI trích dẫn URL của bạn</p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sentiment</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.avgSentiment > 0 ? '+' : ''}{stats.avgSentiment}</div>
            <p className="text-xs text-muted-foreground mt-1">Điểm cảm xúc trung bình</p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Scans</CardTitle>
            <Brain className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.totalScans}</div>
            <p className="text-xs text-muted-foreground mt-1">Lượt quét AI tổng cộng</p>
          </CardContent>
        </Card>
      </div>

      {/* Trend Chart */}
      <TrendChart monitorId={activeMonitor.id} />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SOVChart results={results} brandName={activeMonitor.brand_name} competitors={activeMonitor.competitors} />
        <SentimentGauge results={results} />
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CitationTracker results={results} />
        <VisibilityAlerts monitorId={activeMonitor.id} organizationId={activeMonitor.organization_id} />
      </div>

      {/* Alert History */}
      <AlertHistory />
    </div>
  );
}
