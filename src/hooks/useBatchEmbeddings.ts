import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface BatchStatus {
  total_nodes: number;
  nodes_with_embeddings: number;
  nodes_pending: number;
  progress_percent: number;
  is_running: boolean;
  last_batch_at?: string;
  errors?: string[];
  estimated_time_remaining_ms?: number;
  avg_time_per_node_ms?: number;
}

export interface BatchResult {
  processed: number;
  succeeded: number;
  failed: number;
  retried?: number;
  errors: string[];
  duration_ms: number;
  avg_time_per_node_ms?: number;
}

export interface BatchResponse {
  result?: BatchResult;
  status: BatchStatus;
  error?: string;
}

export interface BatchProgress {
  currentBatch: number;
  totalBatches: number;
  processedNodes: number;
  totalNodes: number;
  succeededNodes: number;
  failedNodes: number;
  retriedNodes: number;
  elapsedMs: number;
  estimatedRemainingMs: number;
}

export function useBatchEmbeddings() {
  const [status, setStatus] = useState<BatchStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<BatchResult | null>(null);
  const [progress, setProgress] = useState<BatchProgress | null>(null);
  const abortRef = useRef(false);
  const { toast } = useToast();

  const fetchStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('batch-generate-embeddings', {
        body: { action: 'status' },
      });

      if (error) throw error;
      setStatus(data as BatchStatus);
    } catch (err) {
      console.error('Failed to fetch batch status:', err);
      toast({
        title: 'Lỗi',
        description: 'Không thể lấy trạng thái embedding',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const startBatch = useCallback(async (batchSize: number = 3, nodeTypes?: string[]) => {
    setIsProcessing(true);
    try {
      const safeBatchSize = Math.min(3, Math.max(1, batchSize));

      const { data, error } = await supabase.functions.invoke('batch-generate-embeddings', {
        body: {
          action: 'start',
          batch_size: safeBatchSize,
          node_types: nodeTypes,
        },
      });

      if (error) throw error;

      const response = data as BatchResponse;
      if (response.result) {
        setLastResult(response.result);
        toast({
          title: 'Hoàn thành batch',
          description: `Đã xử lý ${response.result.succeeded}/${response.result.processed} nodes trong ${(response.result.duration_ms / 1000).toFixed(1)}s`,
        });
      }
      setStatus(response.status);

      return response;
    } catch (err) {
      console.error('Failed to start batch:', err);
      toast({
        title: 'Lỗi',
        description: 'Không thể bắt đầu batch embedding',
        variant: 'destructive',
      });
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  const stopBatch = useCallback(() => {
    abortRef.current = true;
    toast({
      title: 'Đang dừng...',
      description: 'Batch hiện tại sẽ hoàn thành rồi dừng',
    });
  }, [toast]);

  const runFullBatch = useCallback(async (batchSize: number = 3) => {
    setIsProcessing(true);
    abortRef.current = false;

    const safeBatchSize = Math.min(3, Math.max(1, batchSize));

    let totalProcessed = 0;
    let totalSucceeded = 0;
    let totalFailed = 0;
    let totalRetried = 0;
    let currentBatch = 0;
    let avgTimePerNodeMs = 0;

    const startTime = Date.now();

    // Get initial status to know total nodes
    const initialStatus = await supabase.functions.invoke('batch-generate-embeddings', {
      body: { action: 'status' },
    });

    const totalPending = (initialStatus.data as BatchStatus)?.nodes_pending || 0;
    const estimatedBatches = Math.ceil(totalPending / safeBatchSize);

    try {
      // Keep processing until no more pending nodes or aborted
      let hasMore = true;
      while (hasMore && !abortRef.current) {
        currentBatch++;

        const { data, error } = await supabase.functions.invoke('batch-generate-embeddings', {
          body: {
            action: 'start',
            batch_size: safeBatchSize,
          },
        });

        if (error) throw error;

        const response = data as BatchResponse;
        if (response.result) {
          totalProcessed += response.result.processed;
          totalSucceeded += response.result.succeeded;
          totalFailed += response.result.failed;
          totalRetried += response.result.retried || 0;

          // Update average time
          if (response.result.avg_time_per_node_ms) {
            avgTimePerNodeMs = avgTimePerNodeMs
              ? (avgTimePerNodeMs + response.result.avg_time_per_node_ms) / 2
              : response.result.avg_time_per_node_ms;
          }

          // Update progress
          const elapsedMs = Date.now() - startTime;
          const remaining = response.status.nodes_pending;
          const estimatedRemainingMs = avgTimePerNodeMs ? remaining * avgTimePerNodeMs : 0;

          setProgress({
            currentBatch,
            totalBatches: estimatedBatches,
            processedNodes: totalProcessed,
            totalNodes: totalPending,
            succeededNodes: totalSucceeded,
            failedNodes: totalFailed,
            retriedNodes: totalRetried,
            elapsedMs,
            estimatedRemainingMs,
          });

          // If no nodes were processed, we're done
          if (response.result.processed === 0) {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }

        setStatus(response.status);

        // Stop if all done
        if (response.status.nodes_pending === 0) {
          hasMore = false;
        }

        // Small delay between batches to avoid overwhelming the function
        if (hasMore && !abortRef.current) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      const totalDurationMs = Date.now() - startTime;
      
      setLastResult({
        processed: totalProcessed,
        succeeded: totalSucceeded,
        failed: totalFailed,
        retried: totalRetried,
        errors: [],
        duration_ms: totalDurationMs,
        avg_time_per_node_ms: avgTimePerNodeMs,
      });
      
      if (abortRef.current) {
        toast({
          title: 'Đã dừng',
          description: `Đã xử lý ${totalSucceeded}/${totalProcessed} nodes trước khi dừng`,
        });
      } else {
        toast({
          title: 'Hoàn thành tất cả! 🎉',
          description: `Đã xử lý ${totalSucceeded}/${totalProcessed} nodes trong ${formatDuration(totalDurationMs)}`,
        });
      }
      
    } catch (err) {
      console.error('Failed to run full batch:', err);
      toast({
        title: 'Lỗi',
        description: 'Batch embedding bị gián đoạn',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
      setProgress(null);
      abortRef.current = false;
    }
  }, [toast]);

  return {
    status,
    isLoading,
    isProcessing,
    lastResult,
    progress,
    fetchStatus,
    startBatch,
    runFullBatch,
    stopBatch,
  };
}

// Format duration for display
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}
