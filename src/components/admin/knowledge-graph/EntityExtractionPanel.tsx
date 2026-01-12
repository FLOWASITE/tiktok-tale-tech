import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  RefreshCw, 
  Play, 
  Zap, 
  FileText,
  Scale,
  AlertCircle,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { useKnowledgeExtraction } from '@/hooks/useKnowledgeExtraction';

export function EntityExtractionPanel() {
  const {
    status,
    isLoading,
    isExtracting,
    lastResult,
    fetchStatus,
    extractRegulations,
    extractTerms,
    extractAll,
    runFullExtraction,
  } = useKnowledgeExtraction();

  const [batchSize, setBatchSize] = useState(20);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Extract Regulations & Terms
            </CardTitle>
            <CardDescription>
              Tự động tạo regulation và term nodes từ industry_global_packs
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
            <h4 className="font-medium text-sm">Nguồn dữ liệu (Industry Packs)</h4>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold text-foreground">
                  {status.total_industry_packs}
                </div>
                <div className="text-xs text-muted-foreground">Tổng packs</div>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/10">
                <div className="text-2xl font-bold text-blue-600">
                  {status.packs_with_regulations}
                </div>
                <div className="text-xs text-muted-foreground">Có regulations</div>
              </div>
              <div className="p-3 rounded-lg bg-purple-500/10">
                <div className="text-2xl font-bold text-purple-600">
                  {status.packs_with_terms}
                </div>
                <div className="text-xs text-muted-foreground">Có terms</div>
              </div>
            </div>

            <h4 className="font-medium text-sm pt-4">Knowledge Graph Nodes</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Scale className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{status.regulation_nodes}</div>
                    <div className="text-xs text-muted-foreground">Regulation Nodes</div>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <ArrowRight className="h-3 w-3" />
                  {status.regulated_by_edges} edges
                </div>
              </div>
              <div className="p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <FileText className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{status.term_nodes}</div>
                    <div className="text-xs text-muted-foreground">Term Nodes</div>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <ArrowRight className="h-3 w-3" />
                  {status.uses_term_edges} edges
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Extraction Controls */}
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-end gap-4">
            <div className="w-32">
              <Label htmlFor="extract-batch-size">Batch Size</Label>
              <Input
                id="extract-batch-size"
                type="number"
                min={5}
                max={50}
                value={batchSize}
                onChange={(e) => setBatchSize(Number(e.target.value))}
                className="mt-1"
              />
            </div>
            <div className="flex gap-2 flex-1 flex-wrap">
              <Button
                variant="outline"
                onClick={() => extractRegulations(batchSize)}
                disabled={isExtracting}
              >
                {isExtracting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Scale className="h-4 w-4 mr-2" />
                )}
                Regulations
              </Button>
              <Button
                variant="outline"
                onClick={() => extractTerms(batchSize)}
                disabled={isExtracting}
              >
                {isExtracting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 mr-2" />
                )}
                Terms
              </Button>
              <Button
                onClick={() => extractAll(batchSize)}
                disabled={isExtracting}
              >
                {isExtracting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Extract 1 Batch
              </Button>
              <Button
                variant="default"
                onClick={() => runFullExtraction(batchSize)}
                disabled={isExtracting}
              >
                {isExtracting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4 mr-2" />
                )}
                Extract All
              </Button>
            </div>
          </div>
        </div>

        {/* Last Result */}
        {lastResult && (
          <div className="space-y-2 pt-4 border-t">
            <h4 className="font-medium text-sm">Kết quả gần nhất</h4>
            <div className="flex flex-wrap gap-2">
              <Badge variant="default" className="bg-green-600">
                +{lastResult.nodes_created} nodes
              </Badge>
              <Badge variant="default" className="bg-blue-600">
                +{lastResult.edges_created} edges
              </Badge>
              {lastResult.duration_ms > 0 && (
                <Badge variant="secondary">
                  {(lastResult.duration_ms / 1000).toFixed(1)}s
                </Badge>
              )}
            </div>
            
            {lastResult.errors && lastResult.errors.length > 0 && (
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
