/**
 * useIndustryPackKnowledge - Hook for fetching Knowledge Graph content per Industry Pack
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { KnowledgeNodeType } from '@/types/knowledgeGraph';

// ============== TYPES ==============

export interface IndustryPackInfo {
  id: string;
  industryCode: string;
  name: string;
  targetAudience: 'B2B' | 'B2C' | 'both';
  isActive: boolean;
  version: string;
  nodeCount?: number;
}

export interface KnowledgeStats {
  regulations: number;
  terms: number;
  concepts: number;
  personas: number;
  industries: number;
  jurisdictions: number;
  total: number;
  withEmbedding: number;
}

export interface KnowledgeNodeData {
  id: string;
  nodeType: KnowledgeNodeType;
  displayName: { vi?: string; en?: string };
  description?: string;
  fullText?: string;
  documentType?: string;
  effectiveDate?: string;
  contentQualityScore?: number;
  hasEmbedding: boolean;
  createdAt: string;
  updatedAt: string;
  sourceUrl?: string;
}

export interface KnowledgeEdgeData {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  edgeType: string;
  weight: number;
}

export interface IndustryPackKnowledge {
  packInfo: IndustryPackInfo;
  stats: KnowledgeStats;
  nodes: KnowledgeNodeData[];
  edges: KnowledgeEdgeData[];
}

// ============== FETCH FUNCTIONS ==============

async function fetchPacksList(
  languageCode: string = 'vi'
): Promise<IndustryPackInfo[]> {
  const { data, error } = await supabase
    .from('industry_global_packs')
    .select(`
      id,
      industry_code,
      target_audience,
      is_active,
      version,
      industry_pack_translations!inner (name)
    `)
    .eq('industry_pack_translations.language_code', languageCode)
    .eq('is_active', true)
    .order('industry_code');

  if (error) {
    console.error('Failed to fetch packs list:', error);
    return [];
  }

  // Fetch node counts for all packs
  const { data: countData } = await supabase
    .from('industry_knowledge_nodes')
    .select('global_pack_id')
    .not('global_pack_id', 'is', null);

  const countMap = new Map<string, number>();
  (countData || []).forEach(row => {
    const packId = row.global_pack_id;
    if (packId) {
      countMap.set(packId, (countMap.get(packId) || 0) + 1);
    }
  });

  return (data || []).map(row => {
    const translations = row.industry_pack_translations as unknown as { name: string }[];
    return {
      id: row.id,
      industryCode: row.industry_code,
      name: translations[0]?.name || row.industry_code,
      targetAudience: row.target_audience as 'B2B' | 'B2C' | 'both',
      isActive: row.is_active ?? true,
      version: row.version || '1.0',
      nodeCount: countMap.get(row.id) || 0,
    };
  });
}

async function fetchPackKnowledge(
  packId: string,
  languageCode: string = 'vi'
): Promise<IndustryPackKnowledge | null> {
  // 1. Fetch pack info
  const { data: packData, error: packError } = await supabase
    .from('industry_global_packs')
    .select(`
      id,
      industry_code,
      target_audience,
      is_active,
      version,
      industry_pack_translations!inner (name)
    `)
    .eq('id', packId)
    .eq('industry_pack_translations.language_code', languageCode)
    .single();

  if (packError || !packData) {
    console.error('Failed to fetch pack info:', packError);
    throw new Error(packError?.message || 'Không thể tải thông tin Industry Pack');
  }

  const translations = packData.industry_pack_translations as unknown as { name: string }[];
  const packInfo: IndustryPackInfo = {
    id: packData.id,
    industryCode: packData.industry_code,
    name: translations[0]?.name || packData.industry_code,
    targetAudience: packData.target_audience as 'B2B' | 'B2C' | 'both',
    isActive: packData.is_active ?? true,
    version: packData.version || '1.0',
  };

  // 2. Fetch nodes for this pack
  const { data: nodesData, error: nodesError } = await supabase
    .from('industry_knowledge_nodes')
    .select('*')
    .eq('global_pack_id', packId)
    .order('node_type')
    .order('created_at', { ascending: false });

  if (nodesError) {
    console.error('Failed to fetch nodes:', nodesError);
    throw new Error(nodesError.message || 'Không thể tải nodes Knowledge Graph');
  }

  const nodes: KnowledgeNodeData[] = (nodesData || []).map(node => {
    // Extract description - handle Json type
    let descriptionStr: string | undefined;
    if (node.description) {
      if (typeof node.description === 'string') {
        descriptionStr = node.description;
      } else if (typeof node.description === 'object' && node.description !== null) {
        const descObj = node.description as Record<string, unknown>;
        descriptionStr = (descObj.vi as string) || (descObj.en as string) || JSON.stringify(descObj);
      }
    }

    return {
      id: node.id,
      nodeType: node.node_type as KnowledgeNodeType,
      displayName: (node.display_name as { vi?: string; en?: string }) || {},
      description: descriptionStr,
      fullText: node.full_text || undefined,
      documentType: node.document_type || undefined,
      effectiveDate: node.effective_date || undefined,
      contentQualityScore: node.content_quality_score ?? undefined,
      hasEmbedding: !!node.embedding,
      createdAt: node.created_at || new Date().toISOString(),
      updatedAt: node.updated_at || new Date().toISOString(),
      sourceUrl: node.source_url || undefined,
    };
  });

  // 3. Calculate stats
  const stats: KnowledgeStats = {
    regulations: nodes.filter(n => n.nodeType === 'regulation').length,
    terms: nodes.filter(n => n.nodeType === 'term').length,
    concepts: nodes.filter(n => n.nodeType === 'concept').length,
    personas: nodes.filter(n => n.nodeType === 'persona').length,
    industries: nodes.filter(n => n.nodeType === 'industry').length,
    jurisdictions: nodes.filter(n => n.nodeType === 'jurisdiction').length,
    total: nodes.length,
    withEmbedding: nodes.filter(n => n.hasEmbedding).length,
  };

  // 4. Fetch edges for these nodes
  const nodeIds = nodes.map(n => n.id);
  let edges: KnowledgeEdgeData[] = [];
  
  if (nodeIds.length > 0) {
    const { data: edgesData, error: edgesError } = await supabase
      .from('industry_knowledge_edges')
      .select('*')
      .or(`source_node_id.in.(${nodeIds.join(',')}),target_node_id.in.(${nodeIds.join(',')})`);

    if (!edgesError && edgesData) {
      edges = edgesData.map(edge => ({
        id: edge.id,
        sourceNodeId: edge.source_node_id,
        targetNodeId: edge.target_node_id,
        edgeType: edge.edge_type,
        weight: edge.weight || 1,
      }));
    }
  }

  return { packInfo, stats, nodes, edges };
}

// ============== HOOKS ==============

/**
 * Fetch list of all active Industry Packs
 */
export function useIndustryPacksList(languageCode: string = 'vi') {
  return useQuery({
    queryKey: ['industryPacksList', languageCode],
    queryFn: () => fetchPacksList(languageCode),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Fetch knowledge content for a specific Industry Pack
 */
export function useIndustryPackKnowledge(
  packId: string | null,
  languageCode: string = 'vi'
) {
  return useQuery({
    queryKey: ['industryPackKnowledge', packId, languageCode],
    queryFn: () => fetchPackKnowledge(packId!, languageCode),
    enabled: !!packId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
