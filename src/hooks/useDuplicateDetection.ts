import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Matches RPC output: find_duplicate_regulations
export interface DuplicatePair {
  node_id_1: string;
  node_id_2: string;
  name_1: string;
  name_2: string;
  similarity: number;
  match_type: 'semantic' | 'exact_title';
  quality_1: number | null;
  quality_2: number | null;
}

export interface DuplicateGroup {
  id: string;
  nodes: Array<{
    id: string;
    name: string;
    quality: number | null;
  }>;
  similarity: number;
  match_type: string;
}

// Matches RPC output: find_node_duplicates
export interface NodeDuplicate {
  duplicate_id: string;
  duplicate_name: string;
  similarity: number;
  match_type: string;
  duplicate_quality: number | null;
}

export function useDuplicateDetection() {
  const [isScanning, setIsScanning] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [isMerging, setIsMerging] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);

  // Convert pairs to groups
  const pairsToGroups = useCallback((pairs: DuplicatePair[]): DuplicateGroup[] => {
    const nodeMap = new Map<string, Set<string>>();
    const pairInfo = new Map<string, { similarity: number; match_type: string }>();

    // Build adjacency map
    pairs.forEach(pair => {
      if (!nodeMap.has(pair.node_id_1)) nodeMap.set(pair.node_id_1, new Set());
      if (!nodeMap.has(pair.node_id_2)) nodeMap.set(pair.node_id_2, new Set());
      nodeMap.get(pair.node_id_1)!.add(pair.node_id_2);
      nodeMap.get(pair.node_id_2)!.add(pair.node_id_1);

      const pairKey = [pair.node_id_1, pair.node_id_2].sort().join('-');
      pairInfo.set(pairKey, { similarity: pair.similarity, match_type: pair.match_type });
    });

    // Group connected nodes
    const visited = new Set<string>();
    const groups: DuplicateGroup[] = [];

    const dfs = (nodeId: string, group: Set<string>) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      group.add(nodeId);
      nodeMap.get(nodeId)?.forEach(neighbor => dfs(neighbor, group));
    };

    nodeMap.forEach((_, nodeId) => {
      if (!visited.has(nodeId)) {
        const group = new Set<string>();
        dfs(nodeId, group);
        if (group.size > 1) {
          const groupArray = Array.from(group);
          // Get similarity from first pair in group
          let maxSimilarity = 0;
          let matchType = 'semantic';
          
          for (let i = 0; i < groupArray.length; i++) {
            for (let j = i + 1; j < groupArray.length; j++) {
              const key = [groupArray[i], groupArray[j]].sort().join('-');
              const info = pairInfo.get(key);
              if (info && info.similarity > maxSimilarity) {
                maxSimilarity = info.similarity;
                matchType = info.match_type;
              }
            }
          }

          // Find node info from pairs
          const nodeInfo = new Map<string, any>();
          pairs.forEach(pair => {
            if (group.has(pair.node_id_1)) {
              nodeInfo.set(pair.node_id_1, {
                id: pair.node_id_1,
                name: pair.name_1,
                quality: pair.quality_1,
              });
            }
            if (group.has(pair.node_id_2)) {
              nodeInfo.set(pair.node_id_2, {
                id: pair.node_id_2,
                name: pair.name_2,
                quality: pair.quality_2,
              });
            }
          });

          groups.push({
            id: groupArray[0],
            nodes: Array.from(nodeInfo.values()).sort((a, b) => 
              (b.quality || 0) - (a.quality || 0) // Sort by quality desc
            ),
            similarity: maxSimilarity,
            match_type: matchType
          });
        }
      }
    });

    return groups.sort((a, b) => b.similarity - a.similarity);
  }, []);

  // Scan all regulations for duplicates
  const scanAll = useCallback(async (threshold: number = 0.85, limit: number = 100) => {
    setIsScanning(true);
    setScanProgress(10);

    try {
      const { data, error } = await supabase.rpc('find_duplicate_regulations', {
        p_similarity_threshold: threshold,
        p_limit: limit
      });

      setScanProgress(70);

      if (error) {
        console.error('Scan error:', error);
        toast.error('Lỗi khi quét trùng lặp', { description: error.message });
        return [];
      }

      const groups = pairsToGroups(data as DuplicatePair[]);
      setDuplicates(groups);
      setScanProgress(100);

      toast.success(`Tìm thấy ${groups.length} nhóm trùng lặp`, {
        description: `${data?.length || 0} cặp với ngưỡng ${Math.round(threshold * 100)}%`
      });

      return groups;
    } catch (err) {
      console.error('Scan error:', err);
      toast.error('Lỗi khi quét');
      return [];
    } finally {
      setIsScanning(false);
      setTimeout(() => setScanProgress(0), 1000);
    }
  }, [pairsToGroups]);

  // Check duplicates for a single node
  const checkSingle = useCallback(async (nodeId: string, threshold: number = 0.85) => {
    setIsScanning(true);

    try {
      const { data, error } = await supabase.rpc('find_node_duplicates', {
        p_node_id: nodeId,
        p_similarity_threshold: threshold,
        p_limit: 10
      });

      if (error) {
        console.error('Check single error:', error);
        toast.error('Lỗi khi kiểm tra', { description: error.message });
        return [];
      }

      const results = (data || []) as NodeDuplicate[];
      
      if (results.length === 0) {
        toast.info('Không tìm thấy trùng lặp');
      } else {
        toast.warning(`Tìm thấy ${results.length} văn bản tương tự`);
      }

      return results;
    } catch (err) {
      console.error('Check single error:', err);
      toast.error('Lỗi khi kiểm tra');
      return [];
    } finally {
      setIsScanning(false);
    }
  }, []);

  // Merge duplicates - keep one, remove others
  const mergeDuplicates = useCallback(async (keepNodeId: string, removeNodeIds: string[]) => {
    if (removeNodeIds.length === 0) {
      toast.error('Không có node nào để gộp');
      return null;
    }

    setIsMerging(true);

    try {
      const { data, error } = await supabase.rpc('merge_duplicate_nodes', {
        p_keep_node_id: keepNodeId,
        p_remove_node_ids: removeNodeIds,
        p_performed_by: null
      });

      if (error) {
        console.error('Merge error:', error);
        toast.error('Lỗi khi gộp', { description: error.message });
        return null;
      }

      const result = data as { 
        success: boolean; 
        keep_node_name: string; 
        nodes_deactivated: number;
        edges_transferred: number;
      };

      if (result.success) {
        toast.success('Đã gộp thành công', {
          description: `Giữ \"${result.keep_node_name}\", xóa ${result.nodes_deactivated} node, chuyển ${result.edges_transferred} edges`
        });

        // Remove merged group from state
        setDuplicates(prev => 
          prev.filter(g => !g.nodes.some(n => removeNodeIds.includes(n.id)))
        );
      }

      return result;
    } catch (err) {
      console.error('Merge error:', err);
      toast.error('Lỗi khi gộp');
      return null;
    } finally {
      setIsMerging(false);
    }
  }, []);

  // Ignore a duplicate pair
  const ignoreDuplicate = useCallback(async (nodeId1: string, nodeId2: string, reason?: string) => {
    try {
      const { error } = await supabase
        .from('duplicate_ignore_list')
        .insert({
          node_id_1: nodeId1 < nodeId2 ? nodeId1 : nodeId2,
          node_id_2: nodeId1 < nodeId2 ? nodeId2 : nodeId1,
          reason
        });

      if (error) {
        if (error.code === '23505') {
          toast.info('Cặp này đã được đánh dấu bỏ qua trước đó');
        } else {
          toast.error('Lỗi khi bỏ qua', { description: error.message });
        }
        return false;
      }

      toast.success('Đã đánh dấu không phải trùng lặp');

      // Remove from current results
      setDuplicates(prev => 
        prev.filter(g => !(g.nodes.some(n => n.id === nodeId1) && g.nodes.some(n => n.id === nodeId2)))
      );

      return true;
    } catch (err) {
      console.error('Ignore error:', err);
      toast.error('Lỗi');
      return false;
    }
  }, []);

  // Clear results
  const clearResults = useCallback(() => {
    setDuplicates([]);
  }, []);

  return {
    isScanning,
    isMerging,
    scanProgress,
    duplicates,
    scanAll,
    checkSingle,
    mergeDuplicates,
    ignoreDuplicate,
    clearResults
  };
}
