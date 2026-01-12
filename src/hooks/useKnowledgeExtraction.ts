import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ExtractionStatus {
  total_industry_packs: number;
  packs_with_regulations: number;
  packs_with_terms: number;
  regulation_nodes: number;
  term_nodes: number;
  regulated_by_edges: number;
  uses_term_edges: number;
}

export interface ExtractionResult {
  nodes_created: number;
  edges_created: number;
  errors: string[];
  duration_ms: number;
  regulations?: ExtractionResult;
  terms?: ExtractionResult;
}

export interface ExtractionResponse {
  result?: ExtractionResult;
  status: ExtractionStatus;
  error?: string;
}

export function useKnowledgeExtraction() {
  const [status, setStatus] = useState<ExtractionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [lastResult, setLastResult] = useState<ExtractionResult | null>(null);
  const { toast } = useToast();

  const fetchStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('extract-knowledge-entities', {
        body: { action: 'status' },
      });

      if (error) throw error;
      setStatus(data as ExtractionStatus);
    } catch (err) {
      console.error('Failed to fetch extraction status:', err);
      toast({
        title: 'Lỗi',
        description: 'Không thể lấy trạng thái extraction',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const extractRegulations = useCallback(async (batchSize: number = 20) => {
    setIsExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke('extract-knowledge-entities', {
        body: { 
          action: 'extract_regulations',
          batch_size: batchSize,
        },
      });

      if (error) throw error;
      
      const response = data as ExtractionResponse;
      if (response.result) {
        setLastResult(response.result);
        toast({
          title: 'Hoàn thành',
          description: `Tạo ${response.result.nodes_created} regulation nodes, ${response.result.edges_created} edges`,
        });
      }
      setStatus(response.status);
      return response;
    } catch (err) {
      console.error('Failed to extract regulations:', err);
      toast({
        title: 'Lỗi',
        description: 'Không thể extract regulations',
        variant: 'destructive',
      });
      throw err;
    } finally {
      setIsExtracting(false);
    }
  }, [toast]);

  const extractTerms = useCallback(async (batchSize: number = 20) => {
    setIsExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke('extract-knowledge-entities', {
        body: { 
          action: 'extract_terms',
          batch_size: batchSize,
        },
      });

      if (error) throw error;
      
      const response = data as ExtractionResponse;
      if (response.result) {
        setLastResult(response.result);
        toast({
          title: 'Hoàn thành',
          description: `Tạo ${response.result.nodes_created} term nodes, ${response.result.edges_created} edges`,
        });
      }
      setStatus(response.status);
      return response;
    } catch (err) {
      console.error('Failed to extract terms:', err);
      toast({
        title: 'Lỗi',
        description: 'Không thể extract terms',
        variant: 'destructive',
      });
      throw err;
    } finally {
      setIsExtracting(false);
    }
  }, [toast]);

  const extractAll = useCallback(async (batchSize: number = 20) => {
    setIsExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke('extract-knowledge-entities', {
        body: { 
          action: 'extract_all',
          batch_size: batchSize,
        },
      });

      if (error) throw error;
      
      const response = data as ExtractionResponse;
      if (response.result) {
        setLastResult(response.result);
        toast({
          title: 'Hoàn thành',
          description: `Tạo ${response.result.nodes_created} nodes, ${response.result.edges_created} edges`,
        });
      }
      setStatus(response.status);
      return response;
    } catch (err) {
      console.error('Failed to extract all:', err);
      toast({
        title: 'Lỗi',
        description: 'Không thể extract entities',
        variant: 'destructive',
      });
      throw err;
    } finally {
      setIsExtracting(false);
    }
  }, [toast]);

  const runFullExtraction = useCallback(async (batchSize: number = 20) => {
    setIsExtracting(true);
    let totalNodesCreated = 0;
    let totalEdgesCreated = 0;
    
    try {
      // Keep extracting until no more nodes are created
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase.functions.invoke('extract-knowledge-entities', {
          body: { 
            action: 'extract_all',
            batch_size: batchSize,
          },
        });

        if (error) throw error;
        
        const response = data as ExtractionResponse;
        if (response.result) {
          totalNodesCreated += response.result.nodes_created;
          totalEdgesCreated += response.result.edges_created;
          
          if (response.result.nodes_created === 0 && response.result.edges_created === 0) {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
        
        setStatus(response.status);
      }
      
      setLastResult({
        nodes_created: totalNodesCreated,
        edges_created: totalEdgesCreated,
        errors: [],
        duration_ms: 0,
      });
      
      toast({
        title: 'Hoàn thành tất cả',
        description: `Tổng cộng: ${totalNodesCreated} nodes, ${totalEdgesCreated} edges`,
      });
      
    } catch (err) {
      console.error('Failed to run full extraction:', err);
      toast({
        title: 'Lỗi',
        description: 'Extraction bị gián đoạn',
        variant: 'destructive',
      });
    } finally {
      setIsExtracting(false);
    }
  }, [toast]);

  return {
    status,
    isLoading,
    isExtracting,
    lastResult,
    fetchStatus,
    extractRegulations,
    extractTerms,
    extractAll,
    runFullExtraction,
  };
}
