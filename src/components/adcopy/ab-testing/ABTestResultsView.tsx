import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Play, Pause, Trophy, TrendingUp, MousePointerClick, 
  DollarSign, Target, BarChart3, Plus 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdCopyABTests } from '@/hooks/useAdCopyABTests';
import { 
  calculateConfidence, 
  getStatusConfig,
  type ABTestWithResults,
  type VariationStats,
  type ABTestStatus 
} from '@/types/adCopyABTest';
import type { AdCopyVariation } from '@/types/adCopy';
import { ABTestLogResultsDialog } from './ABTestLogResultsDialog';

interface ABTestResultsViewProps {
  testId: string;
  variations: AdCopyVariation[];
  onClose?: () => void;
}

export function ABTestResultsView({ testId, variations, onClose }: ABTestResultsViewProps) {
  const { fetchTestWithResults, updateStatus, declareWinner } = useAdCopyABTests();
  const [test, setTest] = useState<ABTestWithResults | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLogDialog, setShowLogDialog] = useState(false);

  useEffect(() => {
    loadTest();
  }, [testId]);

  const loadTest = async () => {
    setIsLoading(true);
    try {
      const data = await fetchTestWithResults(testId);
      setTest(data);
    } catch (error) {
      console.error('Failed to load test:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const variationStats = useMemo((): VariationStats[] => {
    if (!test) return [];

    const controlId = test.variation_ids[0];
    const stats: VariationStats[] = [];

    for (const variationId of test.variation_ids) {
      const variation = variations.find(v => v.id === variationId);
      const results = test.results.filter(r => r.variation_id === variationId);
      
      const totals = results.reduce((acc, r) => ({
        impressions: acc.impressions + r.impressions,
        clicks: acc.clicks + r.clicks,
        conversions: acc.conversions + r.conversions,
        spend: acc.spend + Number(r.spend),
      }), { impressions: 0, clicks: 0, conversions: 0, spend: 0 });

      const controlResults = test.results.filter(r => r.variation_id === controlId);
      const controlTotals = controlResults.reduce((acc, r) => ({
        impressions: acc.impressions + r.impressions,
        clicks: acc.clicks + r.clicks,
      }), { impressions: 0, clicks: 0 });

      const confidence = variationId === controlId 
        ? 0 
        : calculateConfidence(controlTotals, totals);

      stats.push({
        variation_id: variationId,
        variation_label: variation?.variation_label || '?',
        total_impressions: totals.impressions,
        total_clicks: totals.clicks,
        total_conversions: totals.conversions,
        total_spend: totals.spend,
        avg_ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
        avg_conversion_rate: totals.clicks > 0 ? (totals.conversions / totals.clicks) * 100 : 0,
        avg_cpc: totals.clicks > 0 ? totals.spend / totals.clicks : 0,
        confidence,
        is_winner: test.winner_variation_id === variationId,
        is_control: variationId === controlId,
      });
    }

    return stats.sort((a, b) => b.avg_ctr - a.avg_ctr);
  }, [test, variations]);

  const handleStatusChange = async (newStatus: ABTestStatus) => {
    await updateStatus.mutateAsync({ testId, status: newStatus });
    await loadTest();
  };

  const handleDeclareWinner = async (variationId: string) => {
    await declareWinner.mutateAsync({ testId, variationId });
    await loadTest();
  };

  if (isLoading || !test) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Đang tải...
        </CardContent>
      </Card>
    );
  }

  const statusConfig = getStatusConfig(test.status);
  const hasData = test.results.length > 0;
  const bestPerformer = variationStats[0];
  const meetConfidence = bestPerformer && bestPerformer.confidence >= test.confidence_threshold;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                {test.name}
              </CardTitle>
              {test.hypothesis && (
                <p className="text-sm text-muted-foreground mt-1">{test.hypothesis}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
              {test.status === 'draft' && (
                <Button size="sm" onClick={() => handleStatusChange('running')}>
                  <Play className="h-4 w-4 mr-1" /> Bắt đầu
                </Button>
              )}
              {test.status === 'running' && (
                <Button size="sm" variant="outline" onClick={() => handleStatusChange('paused')}>
                  <Pause className="h-4 w-4 mr-1" /> Tạm dừng
                </Button>
              )}
              {test.status === 'paused' && (
                <Button size="sm" onClick={() => handleStatusChange('running')}>
                  <Play className="h-4 w-4 mr-1" /> Tiếp tục
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Target className="h-3 w-3" /> Impressions
              </div>
              <div className="text-lg font-bold">
                {variationStats.reduce((sum, v) => sum + v.total_impressions, 0).toLocaleString()}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <MousePointerClick className="h-3 w-3" /> Clicks
              </div>
              <div className="text-lg font-bold">
                {variationStats.reduce((sum, v) => sum + v.total_clicks, 0).toLocaleString()}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <TrendingUp className="h-3 w-3" /> Conversions
              </div>
              <div className="text-lg font-bold">
                {variationStats.reduce((sum, v) => sum + v.total_conversions, 0).toLocaleString()}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <DollarSign className="h-3 w-3" /> Spend
              </div>
              <div className="text-lg font-bold">
                ${variationStats.reduce((sum, v) => sum + v.total_spend, 0).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Variation Comparison */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">So sánh Variations</h4>
              {(test.status === 'running' || test.status === 'paused') && (
                <Button size="sm" variant="outline" onClick={() => setShowLogDialog(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Nhập dữ liệu
                </Button>
              )}
            </div>

            {!hasData ? (
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Chưa có dữ liệu. Nhập kết quả để bắt đầu so sánh.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {variationStats.map((stat, index) => {
                  const variation = variations.find(v => v.id === stat.variation_id);
                  const maxCtr = Math.max(...variationStats.map(v => v.avg_ctr));
                  
                  return (
                    <div 
                      key={stat.variation_id}
                      className={cn(
                        "p-4 rounded-lg border",
                        stat.is_winner && "border-green-500 bg-green-50 dark:bg-green-950/20",
                        index === 0 && !stat.is_winner && meetConfidence && "border-primary"
                      )}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Variation {stat.variation_label}</span>
                          {stat.is_control && <Badge variant="outline" className="text-xs">Control</Badge>}
                          {stat.is_winner && (
                            <Badge className="bg-green-500">
                              <Trophy className="h-3 w-3 mr-1" /> Winner
                            </Badge>
                          )}
                        </div>
                        {!stat.is_control && stat.confidence > 0 && (
                          <div className="text-sm">
                            <span className={cn(
                              "font-medium",
                              stat.confidence >= test.confidence_threshold ? "text-green-600" : "text-muted-foreground"
                            )}>
                              {stat.confidence.toFixed(1)}% confidence
                            </span>
                          </div>
                        )}
                      </div>

                      {/* CTR Bar */}
                      <div className="space-y-1 mb-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">CTR</span>
                          <span className="font-medium">{stat.avg_ctr.toFixed(2)}%</span>
                        </div>
                        <Progress 
                          value={(stat.avg_ctr / maxCtr) * 100} 
                          className={cn("h-2", stat.is_winner && "[&>div]:bg-green-500")}
                        />
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground block">Impressions</span>
                          <span className="font-medium">{stat.total_impressions.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Clicks</span>
                          <span className="font-medium">{stat.total_clicks.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Conv. Rate</span>
                          <span className="font-medium">{stat.avg_conversion_rate.toFixed(2)}%</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">CPC</span>
                          <span className="font-medium">${stat.avg_cpc.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Preview */}
                      {variation && (
                        <div className="mt-3 pt-3 border-t text-sm text-muted-foreground">
                          <strong>Headline:</strong> {variation.headline || '-'}
                        </div>
                      )}

                      {/* Declare Winner Button */}
                      {test.status !== 'completed' && !stat.is_control && stat.confidence >= test.confidence_threshold && (
                        <Button 
                          size="sm" 
                          className="mt-3 w-full"
                          onClick={() => handleDeclareWinner(stat.variation_id)}
                        >
                          <Trophy className="h-4 w-4 mr-1" /> Chọn làm Winner
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <ABTestLogResultsDialog
        open={showLogDialog}
        onOpenChange={setShowLogDialog}
        testId={testId}
        variationIds={test.variation_ids}
        variations={variations}
        onSuccess={loadTest}
      />
    </>
  );
}
