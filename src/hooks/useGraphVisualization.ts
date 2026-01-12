// ============================================
// Graph Visualization Data Hook
// Fetches and transforms data for force graph
// ============================================

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  KnowledgeNodeType,
  KnowledgeEdgeType,
  GraphData,
  GraphVisNode,
  GraphVisEdge,
} from "@/types/knowledgeGraph";

// ============================================
// Query Keys
// ============================================

export const graphVisualizationKeys = {
  all: ["graph-visualization"] as const,
  data: (options: GraphVisualizationOptions) =>
    [...graphVisualizationKeys.all, "data", options] as const,
};

// ============================================
// Types
// ============================================

export interface GraphVisualizationOptions {
  nodeTypes?: KnowledgeNodeType[];
  edgeTypes?: KnowledgeEdgeType[];
  globalPackId?: string;
  limit?: number;
}

interface RawNode {
  id: string;
  node_type: KnowledgeNodeType;
  node_key: string;
  display_name: { vi?: string; en?: string } | null;
  properties: Record<string, unknown> | null;
}

interface RawEdge {
  id: string;
  source_node_id: string;
  target_node_id: string;
  edge_type: KnowledgeEdgeType;
  weight: number;
}

// ============================================
// Fetch Function
// ============================================

async function fetchGraphData(
  options: GraphVisualizationOptions
): Promise<GraphData> {
  const { nodeTypes, edgeTypes, globalPackId, limit = 500 } = options;

  // Fetch nodes
  let nodeQuery = supabase
    .from("industry_knowledge_nodes")
    .select("id, node_type, node_key, display_name, properties")
    .eq("is_active", true)
    .limit(limit);

  if (nodeTypes && nodeTypes.length > 0) {
    nodeQuery = nodeQuery.in("node_type", nodeTypes);
  }

  if (globalPackId) {
    nodeQuery = nodeQuery.eq("global_pack_id", globalPackId);
  }

  const { data: nodesData, error: nodesError } = await nodeQuery;

  if (nodesError) {
    throw new Error(`Failed to fetch nodes: ${nodesError.message}`);
  }

  const rawNodes = (nodesData || []) as RawNode[];
  const nodeIds = new Set(rawNodes.map((n) => n.id));

  // Fetch edges between these nodes
  let edgeQuery = supabase
    .from("industry_knowledge_edges")
    .select("id, source_node_id, target_node_id, edge_type, weight");

  if (edgeTypes && edgeTypes.length > 0) {
    edgeQuery = edgeQuery.in("edge_type", edgeTypes);
  }

  const { data: edgesData, error: edgesError } = await edgeQuery;

  if (edgesError) {
    throw new Error(`Failed to fetch edges: ${edgesError.message}`);
  }

  const rawEdges = (edgesData || []) as RawEdge[];

  // Filter edges to only include those connecting existing nodes
  const filteredEdges = rawEdges.filter(
    (edge) => nodeIds.has(edge.source_node_id) && nodeIds.has(edge.target_node_id)
  );

  // Transform to visualization format
  const nodes: GraphVisNode[] = rawNodes.map((node) => ({
    id: node.id,
    label: node.display_name?.vi || node.display_name?.en || node.node_key,
    type: node.node_type,
    group: node.node_type,
    properties: node.properties || undefined,
  }));

  const edges: GraphVisEdge[] = filteredEdges.map((edge) => ({
    id: edge.id,
    source: edge.source_node_id,
    target: edge.target_node_id,
    label: edge.edge_type,
    weight: edge.weight,
  }));

  return { nodes, edges };
}

// ============================================
// Hook
// ============================================

export function useGraphVisualizationData(options: GraphVisualizationOptions = {}) {
  return useQuery({
    queryKey: graphVisualizationKeys.data(options),
    queryFn: () => fetchGraphData(options),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

// ============================================
// Statistics Hook
// ============================================

export function useGraphStatistics() {
  return useQuery({
    queryKey: ["graph-statistics"],
    queryFn: async () => {
      // Get node counts by type
      const { data: nodes, error: nodesError } = await supabase
        .from("industry_knowledge_nodes")
        .select("node_type")
        .eq("is_active", true);

      if (nodesError) throw nodesError;

      // Get edge counts by type
      const { data: edges, error: edgesError } = await supabase
        .from("industry_knowledge_edges")
        .select("edge_type");

      if (edgesError) throw edgesError;

      // Count by type
      const nodesByType: Record<KnowledgeNodeType, number> = {
        industry: 0,
        regulation: 0,
        term: 0,
        concept: 0,
        persona: 0,
        jurisdiction: 0,
      };

      const edgesByType: Record<string, number> = {};

      nodes?.forEach((n) => {
        nodesByType[n.node_type as KnowledgeNodeType] =
          (nodesByType[n.node_type as KnowledgeNodeType] || 0) + 1;
      });

      edges?.forEach((e) => {
        edgesByType[e.edge_type] = (edgesByType[e.edge_type] || 0) + 1;
      });

      // Check embedding coverage
      const { count: withEmbeddings } = await supabase
        .from("industry_knowledge_nodes")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true)
        .not("embedding", "is", null);

      const totalNodes = nodes?.length || 0;
      const embeddingCoverage = totalNodes > 0 
        ? ((withEmbeddings || 0) / totalNodes) * 100 
        : 0;

      return {
        totalNodes,
        totalEdges: edges?.length || 0,
        nodesByType,
        edgesByType,
        embeddingCoverage,
        withEmbeddings: withEmbeddings || 0,
      };
    },
    staleTime: 60 * 1000, // 1 minute
  });
}
