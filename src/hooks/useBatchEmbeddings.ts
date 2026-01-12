import { useState, useCallback } from 'react';
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
}

export interface BatchResult {
  processed: number;
  succeeded: number;
  failed: number;
  errors: string[];
  duration_ms: number;
}

export interface BatchResponse {
  result?: BatchResult;
  status: BatchStatus;
  error?: string;
}

export function useBatchEmbeddings() {
  const [status, setStatus] = useState<BatchStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<BatchResult | null>(null);
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

  const startBatch = useCallback(async (batchSize: number = 50, nodeTypes?: string[]) => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('batch-generate-embeddings', {
        body: { 
          action: 'start',
          batch_size: batchSize,
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

  const runFullBatch = useCallback(async (batchSize: number = 50) => {
    setIsProcessing(true);
    let totalProcessed = 0;
    let totalSucceeded = 0;
    let totalFailed = 0;
    
    try {
      // Keep processing until no more pending nodes
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase.functions.invoke('batch-generate-embeddings', {
          body: { 
            action: 'start',
            batch_size: batchSize,
          },
        });

        if (error) throw error;
        
        const response = data as BatchResponse;
        if (response.result) {
          totalProcessed += response.result.processed;
          totalSucceeded += response.result.succeeded;
          totalFailed += response.result.failed;
          
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
      }
      
      setLastResult({
        processed: totalProcessed,
        succeeded: totalSucceeded,
        failed: totalFailed,
        errors: [],
        duration_ms: 0,
      });
      
      toast({
        title: 'Hoàn thành tất cả',
        description: `Đã xử lý ${totalSucceeded}/${totalProcessed} nodes`,
      });
      
    } catch (err) {
      console.error('Failed to run full batch:', err);
      toast({
        title: 'Lỗi',
        description: 'Batch embedding bị gián đoạn',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  return {
    status,
    isLoading,
    isProcessing,
    lastResult,
    fetchStatus,
    startBatch,
    runFullBatch,
  };
}
