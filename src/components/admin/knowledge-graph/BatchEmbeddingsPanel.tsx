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
} from 'lucide-react';
import { useBatchEmbeddings } from '@/hooks/useBatchEmbeddings';

export function BatchEmbeddingsPanel() {
  const {
    status,
    isLoading,
    isProcessing,
    lastResult,
    fetchStatus,
    startBatch,
    runFullBatch,
  } = useBatchEmbeddings();

  const [batchSize, setBatchSize] = useState(50);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleRunBatch = async () => {
    await startBatch(batchSize);
  };

  const handleRunAll = async () => {
    await runFullBatch(batchSize);
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
              Tạo vector embeddings cho tất cả nodes để kích hoạt semantic search
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchStatus}
            disabled={isLoading}
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

        {/* Batch Controls */}
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <Label htmlFor="batch-size">Batch Size</Label>
              <Input
                id="batch-size"
                type="number"
                min={10}
                max={100}
                value={batchSize}
                onChange={(e) => setBatchSize(Number(e.target.value))}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Số nodes xử lý mỗi batch (10-100)
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleRunBatch}
                disabled={isProcessing || status?.nodes_pending === 0}
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
        {lastResult && (
          <div className="space-y-2 pt-4 border-t">
            <h4 className="font-medium text-sm">Kết quả batch gần nhất</h4>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">
                Xử lý: {lastResult.processed}
              </Badge>
              <Badge variant="default" className="bg-green-600">
                Thành công: {lastResult.succeeded}
              </Badge>
              {lastResult.failed > 0 && (
                <Badge variant="destructive">
                  Thất bại: {lastResult.failed}
                </Badge>
              )}
              {lastResult.duration_ms > 0 && (
                <Badge variant="secondary">
                  {(lastResult.duration_ms / 1000).toFixed(1)}s
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
