import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  RefreshCw, 
  Play, 
  Zap, 
  CheckCircle2, 
  AlertCircle,
  Database,
  Loader2,
  Square,
  Clock,
  TrendingUp,
  RotateCcw,
} from 'lucide-react';
import { useBatchEmbeddings } from '@/hooks/useBatchEmbeddings';

export function BatchEmbeddingsPanel() {
  const {
    status,
    isLoading,
    isProcessing,
    lastResult,
    progress,
    fetchStatus,
    startBatch,
    runFullBatch,
    stopBatch,
  } = useBatchEmbeddings();

  const [batchSize, setBatchSize] = useState(5);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleRunBatch = async () => {
    await startBatch(batchSize);
  };

  const handleRunAll = async () => {
    await runFullBatch(batchSize);
  };

  const formatTime = (ms: number | undefined): string => {
    if (!ms || ms <= 0) return '--';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(0)}s`;
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Batch Generate Embeddings
            </CardTitle>
            <CardDescription>
              Tạo vector embeddings cho tất cả nodes để kích hoạt semantic search (gte-small, 384 dims)
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchStatus}
            disabled={isLoading || isProcessing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Overview */}
        {status && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Tiến độ embedding</span>
              <span className="font-medium">{status.progress_percent}%</span>
            </div>
            <Progress value={status.progress_percent} className="h-2" />
            
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold text-foreground">
                  {status.total_nodes}
                </div>
                <div className="text-xs text-muted-foreground">Tổng nodes</div>
              </div>
              <div className="p-3 rounded-lg bg-green-500/10">
                <div className="text-2xl font-bold text-green-600">
                  {status.nodes_with_embeddings}
                </div>
                <div className="text-xs text-muted-foreground">Đã có embedding</div>
              </div>
              <div className="p-3 rounded-lg bg-amber-500/10">
                <div className="text-2xl font-bold text-amber-600">
                  {status.nodes_pending}
                </div>
                <div className="text-xs text-muted-foreground">Chờ xử lý</div>
              </div>
            </div>

            {status.progress_percent === 100 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 text-green-700">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">Tất cả nodes đã có embeddings!</span>
              </div>
            )}
          </div>
        )}

        {/* Real-time Progress (when running full batch) */}
        {isProcessing && progress && (
          <div className="space-y-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang xử lý...
              </span>
              <Button variant="outline" size="sm" onClick={stopBatch}>
                <Square className="h-3 w-3 mr-2" />
                Dừng
              </Button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span>Batch {progress.currentBatch}/{progress.totalBatches}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>{progress.succeededNodes} thành công</span>
              </div>
              {progress.failedNodes > 0 && (
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <span>{progress.failedNodes} thất bại</span>
                </div>
              )}
              {progress.retriedNodes > 0 && (
                <div className="flex items-center gap-2">
                  <RotateCcw className="h-4 w-4 text-amber-600" />
                  <span>{progress.retriedNodes} retry</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>Còn ~{formatTime(progress.estimatedRemainingMs)}</span>
              </div>
            </div>
            
            <Progress 
              value={(progress.processedNodes / progress.totalNodes) * 100} 
              className="h-1.5" 
            />
          </div>
        )}

        {/* Batch Controls */}
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <Label htmlFor="batch-size">Batch Size</Label>
              <Input
                id="batch-size"
                type="number"
                min={1}
                max={10}
                value={batchSize}
                onChange={(e) => setBatchSize(Math.min(10, Math.max(1, Number(e.target.value))))}
                className="mt-1"
                disabled={isProcessing}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Số nodes xử lý mỗi batch (1-10, khuyến nghị 5 để tránh timeout)
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleRunBatch}
                disabled={isProcessing || status?.nodes_pending === 0}
                variant="outline"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Chạy 1 Batch
              </Button>
              <Button
                variant="default"
                onClick={handleRunAll}
                disabled={isProcessing || status?.nodes_pending === 0}
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4 mr-2" />
                )}
                Chạy Tất Cả
              </Button>
            </div>
          </div>
        </div>

        {/* Last Result */}
        {lastResult && !isProcessing && (
          <div className="space-y-2 pt-4 border-t">
            <h4 className="font-medium text-sm">Kết quả gần nhất</h4>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">
                Xử lý: {lastResult.processed}
              </Badge>
              <Badge variant="default" className="bg-green-600">
                Thành công: {lastResult.succeeded}
              </Badge>
              {(lastResult.retried ?? 0) > 0 && (
                <Badge variant="secondary">
                  Retry: {lastResult.retried}
                </Badge>
              )}
              {lastResult.failed > 0 && (
                <Badge variant="destructive">
                  Thất bại: {lastResult.failed}
                </Badge>
              )}
              {lastResult.duration_ms > 0 && (
                <Badge variant="secondary">
                  {formatTime(lastResult.duration_ms)}
                </Badge>
              )}
              {lastResult.avg_time_per_node_ms && (
                <Badge variant="outline">
                  ~{lastResult.avg_time_per_node_ms}ms/node
                </Badge>
              )}
            </div>
            
            {lastResult.errors.length > 0 && (
              <div className="mt-2 p-3 rounded-lg bg-destructive/10">
                <div className="flex items-center gap-2 text-destructive font-medium text-sm">
                  <AlertCircle className="h-4 w-4" />
                  Lỗi ({lastResult.errors.length})
                </div>
                <ul className="mt-2 text-xs text-muted-foreground space-y-1">
                  {lastResult.errors.slice(0, 5).map((error, i) => (
                    <li key={i}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
