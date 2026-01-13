/**
 * Hook for reparsing regulation nodes with improved extraction logic
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ReparseFilter {
  with_html_artifacts?: boolean;
  parse_status?: string;
  limit?: number;
}

interface ReparseDetail {
  node_id: string;
  node_key: string;
  status: 'success' | 'failed' | 'skipped';
  reason?: string;
  text_length_before?: number;
  text_length_after?: number;
}

interface ReparseResult {
  success: boolean;
  total_processed: number;
  successful: number;
  failed: number;
  skipped: number;
  details: ReparseDetail[];
  error?: string;
}

interface DryRunResult {
  success: boolean;
  dry_run: boolean;
  total_found: number;
  nodes_with_artifacts: number;
  nodes: Array<{
    id: string;
    node_key: string;
    has_artifacts: boolean;
    source_url: string | null;
    current_status: string | null;
    text_length: number;
  }>;
}

/**
 * Detect if text contains HTML layout artifacts (client-side check)
 */
export function hasHtmlLayoutArtifacts(text: string | null | undefined): boolean {
  if (!text || text.length < 100) return false;
  
  const patterns = [
    /\|\s*---+\s*\|/,
    /\|\s*\|/,
    /\[!\[Cổng thông tin[^\]]*\]/i,
    /\[!\[Logo[^\]]*\]/i,
    /Trang chủ.*Chính phủ/i,
    /- \[!\[\]\([^)]+\)/,
    /\*\*Tìm kiếm\*\*/gi,
    /\*\*Đăng nhập\*\*/gi,
    /\[English\]\([^)]+\)/gi,
    /\[Tiếng Việt\]\([^)]+\)/gi,
    /Bản quyền thuộc về/i,
    /Copyright ©/i,
    /\[\s*\]\([^)]+\)/,
  ];
  
  let matchCount = 0;
  for (const pattern of patterns) {
    if (pattern.test(text)) {
      matchCount++;
    }
  }
  
  return matchCount >= 2;
}

export function useReparseRegulations() {
  const [isReparsing, setIsReparsing] = useState(false);
  const [lastResult, setLastResult] = useState<ReparseResult | null>(null);
  const { toast } = useToast();

  /**
   * Reparse a single node by ID
   */
  const reparseNode = useCallback(async (nodeId: string): Promise<ReparseResult | null> => {
    setIsReparsing(true);
    try {
      const { data, error } = await supabase.functions.invoke('reparse-regulations', {
        body: { node_ids: [nodeId] },
      });

      if (error) throw error;

      const result = data as ReparseResult;
      setLastResult(result);

      if (result.success && result.successful > 0) {
        toast({
          title: 'Re-parse thành công',
          description: `Đã xử lý lại nội dung văn bản`,
        });
      } else if (result.failed > 0) {
        toast({
          title: 'Re-parse thất bại',
          description: result.details[0]?.reason || 'Không thể xử lý văn bản',
          variant: 'destructive',
        });
      } else if (result.skipped > 0) {
        toast({
          title: 'Bỏ qua',
          description: result.details[0]?.reason || 'Văn bản không có URL nguồn',
        });
      }

      return result;
    } catch (error) {
      console.error('[useReparseRegulations] Error:', error);
      toast({
        title: 'Lỗi',
        description: error instanceof Error ? error.message : 'Không thể re-parse văn bản',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsReparsing(false);
    }
  }, [toast]);

  /**
   * Reparse multiple nodes by IDs
   */
  const reparseNodes = useCallback(async (nodeIds: string[]): Promise<ReparseResult | null> => {
    if (nodeIds.length === 0) return null;
    
    setIsReparsing(true);
    try {
      const { data, error } = await supabase.functions.invoke('reparse-regulations', {
        body: { node_ids: nodeIds },
      });

      if (error) throw error;

      const result = data as ReparseResult;
      setLastResult(result);

      toast({
        title: 'Re-parse hoàn tất',
        description: `${result.successful} thành công, ${result.failed} thất bại, ${result.skipped} bỏ qua`,
      });

      return result;
    } catch (error) {
      console.error('[useReparseRegulations] Error:', error);
      toast({
        title: 'Lỗi',
        description: error instanceof Error ? error.message : 'Không thể re-parse văn bản',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsReparsing(false);
    }
  }, [toast]);

  /**
   * Reparse nodes matching a filter
   */
  const reparseByFilter = useCallback(async (filter: ReparseFilter): Promise<ReparseResult | null> => {
    setIsReparsing(true);
    try {
      const { data, error } = await supabase.functions.invoke('reparse-regulations', {
        body: { filter },
      });

      if (error) throw error;

      const result = data as ReparseResult;
      setLastResult(result);

      toast({
        title: 'Re-parse hoàn tất',
        description: `${result.successful} thành công, ${result.failed} thất bại, ${result.skipped} bỏ qua`,
      });

      return result;
    } catch (error) {
      console.error('[useReparseRegulations] Error:', error);
      toast({
        title: 'Lỗi',
        description: error instanceof Error ? error.message : 'Không thể re-parse văn bản',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsReparsing(false);
    }
  }, [toast]);

  /**
   * Dry run - check what would be reparsed without actually doing it
   */
  const dryRun = useCallback(async (filter?: ReparseFilter): Promise<DryRunResult | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('reparse-regulations', {
        body: { 
          filter: filter || { with_html_artifacts: true, limit: 100 },
          dry_run: true,
        },
      });

      if (error) throw error;
      return data as DryRunResult;
    } catch (error) {
      console.error('[useReparseRegulations] Dry run error:', error);
      return null;
    }
  }, []);

  /**
   * Reparse all nodes with HTML artifacts
   */
  const reparseAllWithArtifacts = useCallback(async (limit = 50): Promise<ReparseResult | null> => {
    return reparseByFilter({ with_html_artifacts: true, limit });
  }, [reparseByFilter]);

  return {
    isReparsing,
    lastResult,
    reparseNode,
    reparseNodes,
    reparseByFilter,
    reparseAllWithArtifacts,
    dryRun,
  };
}
