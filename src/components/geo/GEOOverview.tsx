import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, TrendingUp, Quote, Brain, RefreshCw, Loader2, DollarSign, Clock } from 'lucide-react';
import { GEOMonitor } from '@/hooks/useGEOMonitors';
import { SOVChart } from './SOVChart';
import { SentimentGauge } from './SentimentGauge';
import { CitationTracker } from './CitationTracker';
import { VisibilityAlerts } from './VisibilityAlerts';
import { TrendChart } from './TrendChart';
import { AlertHistory } from './AlertHistory';
import { Sparkline } from '@/components/dashboard/Sparkline';
import { useGEOResults } from '@/hooks/useGEOResults';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GEOOverviewProps {
  monitors: GEOMonitor[];
  loading: boolean;
}

function getNextScanLabel(lastScanned: string | null, frequency: string): string | null {
  if (!lastScanned) return null;
  const last = new Date(lastScanned);
  const freqMap: Record<string, number> = {
    daily: 24 * 60 * 60 * 1000,
    weekly: 7 * 24 * 60 * 60 * 1000,
    monthly: 30 * 24 * 60 * 60 * 1000,
  };
  const ms = freqMap[frequency];
  if (!ms) return null;
  const next = new Date(last.getTime() + ms);
  const now = new Date();
  if (next <= now) return 'Sẵn sàng scan';
  const diff = next.getTime() - now.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 24) return `~${Math.ceil(hours / 24)} ngày`;
  if (hours > 0) return `~${hours}h ${mins}m`;
  return `~${mins}m`;
}

export function GEOOverview({ monitors, loading }: GEOOverviewProps) {
  const activeMonitor = monitors.find(m => m.is_active) || monitors[0];
  const { results, stats, loading: resultsLoading, refetch } = useGEOResults(activeMonitor?.id);
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState<{ cost: number; count: number } | null>(null);
  const [sparkData, setSparkData] = useState<{ sov: number[]; citation: number[]; sentiment: number[]; scans: number[] }>({
    sov: [], citation: [], sentiment: [], scans: [],
  });

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

  // Fetch 7-day sparkline data from snapshots
  useEffect(() => {
    if (!activeMonitor?.id) return;
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 7);
    supabase
      .from('geo_visibility_snapshots')
      .select('sov_percentage, citation_rate, avg_sentiment, total_scans')
      .eq('brand_monitor_id', activeMonitor.id)
      .gte('snapshot_date', fromDate.toISOString().split('T')[0])
      .order('snapshot_date', { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 1) {
          setSparkData({
            sov: data.map((d: any) => Number(d.sov_percentage) || 0),
            citation: data.map((d: any) => Number(d.citation_rate) || 0),
            sentiment: data.map((d: any) => Number(d.avg_sentiment) || 0),
            scans: data.map((d: any) => Number(d.total_scans) || 0),
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

  const nextScanLabel = useMemo(
    () => activeMonitor ? getNextScanLabel(activeMonitor.last_scanned_at, activeMonitor.scan_frequency) : null,
    [activeMonitor]
  );

  if (loading || resultsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!activeMonitor) return null;

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
          {nextScanLabel && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Next: {nextScanLabel}
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

      {/* KPI Cards with Sparklines */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Share of Voice</CardTitle>
            <Eye className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <div className="text-2xl font-bold text-foreground">{stats.sov}%</div>
                <p className="text-xs text-muted-foreground mt-1">Tỉ lệ đề cập so với đối thủ</p>
              </div>
              {sparkData.sov.length > 1 && (
                <Sparkline data={sparkData.sov} width={64} height={28} color="hsl(var(--primary))" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Citation Rate</CardTitle>
            <Quote className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <div className="text-2xl font-bold text-foreground">{stats.citationRate}%</div>
                <p className="text-xs text-muted-foreground mt-1">AI trích dẫn URL của bạn</p>
              </div>
              {sparkData.citation.length > 1 && (
                <Sparkline data={sparkData.citation} width={64} height={28} color="hsl(142, 76%, 36%)" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sentiment</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <div className="text-2xl font-bold text-foreground">{stats.avgSentiment > 0 ? '+' : ''}{stats.avgSentiment}</div>
                <p className="text-xs text-muted-foreground mt-1">Điểm cảm xúc trung bình</p>
              </div>
              {sparkData.sentiment.length > 1 && (
                <Sparkline data={sparkData.sentiment} width={64} height={28} color="hsl(38, 92%, 50%)" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Scans</CardTitle>
            <Brain className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <div className="text-2xl font-bold text-foreground">{stats.totalScans}</div>
                <p className="text-xs text-muted-foreground mt-1">Lượt quét AI tổng cộng</p>
              </div>
              {sparkData.scans.length > 1 && (
                <Sparkline data={sparkData.scans} width={64} height={28} color="hsl(var(--primary))" />
              )}
            </div>
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
