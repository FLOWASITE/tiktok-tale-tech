// ============================================
// Knowledge Graph Hooks
// React Query hooks for Knowledge Graph operations
// ============================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import type {
  KnowledgeNode,
  KnowledgeEdge,
  ConnectedNode,
  TraversalResult,
  RelatedIndustry,
  IndustryRegulation,
  TraversalOptions,
  ConnectedNodesOptions,
  CreateNodeInput,
  CreateEdgeInput,
  KnowledgeNodeType,
  MultilingualText,
} from '@/types/knowledgeGraph';

// ============================================
// Query Keys
// ============================================

export const knowledgeGraphKeys = {
  all: ['knowledge-graph'] as const,
  nodes: () => [...knowledgeGraphKeys.all, 'nodes'] as const,
  node: (id: string) => [...knowledgeGraphKeys.nodes(), id] as const,
  nodesByType: (type: KnowledgeNodeType) => [...knowledgeGraphKeys.nodes(), 'type', type] as const,
  nodesByPack: (packId: string) => [...knowledgeGraphKeys.nodes(), 'pack', packId] as const,
  edges: () => [...knowledgeGraphKeys.all, 'edges'] as const,
  connected: (nodeId: string) => [...knowledgeGraphKeys.all, 'connected', nodeId] as const,
  traversal: (nodeId: string) => [...knowledgeGraphKeys.all, 'traversal', nodeId] as const,
  relatedIndustries: (packId: string) => [...knowledgeGraphKeys.all, 'related', packId] as const,
  regulations: (packId: string) => [...knowledgeGraphKeys.all, 'regulations', packId] as const,
};

// ============================================
// Helper: Convert to Json
// ============================================

function toJson(value: Record<string, unknown> | MultilingualText | undefined): Json {
  return (value || {}) as Json;
}

// ============================================
// Fetch Functions
// ============================================

async function fetchNode(nodeId: string): Promise<KnowledgeNode | null> {
  const { data, error } = await supabase
    .from('industry_knowledge_nodes')
    .select('*')
    .eq('id', nodeId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as unknown as KnowledgeNode;
}

async function fetchNodesByType(nodeType: KnowledgeNodeType): Promise<KnowledgeNode[]> {
  const { data, error } = await supabase
    .from('industry_knowledge_nodes')
    .select('*')
    .eq('node_type', nodeType)
    .eq('is_active', true)
    .order('node_key');

  if (error) throw error;
  return (data || []) as unknown as KnowledgeNode[];
}

async function fetchNodesByPack(globalPackId: string): Promise<KnowledgeNode[]> {
  const { data, error } = await supabase
    .from('industry_knowledge_nodes')
    .select('*')
    .eq('global_pack_id', globalPackId)
    .eq('is_active', true)
    .order('node_type')
    .order('node_key');

  if (error) throw error;
  return (data || []) as unknown as KnowledgeNode[];
}

async function fetchConnectedNodes(options: ConnectedNodesOptions): Promise<ConnectedNode[]> {
  const { nodeId, edgeTypes, direction = 'both' } = options;

  const { data, error } = await supabase.rpc('get_connected_nodes', {
    p_node_id: nodeId,
    p_edge_types: edgeTypes || null,
    p_direction: direction,
  });

  if (error) throw error;
  return (data || []) as unknown as ConnectedNode[];
}

async function traverseGraph(options: TraversalOptions): Promise<TraversalResult[]> {
  const { startNodeId, edgeTypes, maxDepth = 3, minWeight = 0 } = options;

  const { data, error } = await supabase.rpc('traverse_knowledge_graph', {
    p_start_node_id: startNodeId,
    p_edge_types: edgeTypes || null,
    p_max_depth: maxDepth,
    p_min_weight: minWeight,
  });

  if (error) throw error;
  return (data || []) as unknown as TraversalResult[];
}

async function fetchRelatedIndustries(
  globalPackId: string,
  minWeight = 0.5,
  limit = 5
): Promise<RelatedIndustry[]> {
  const { data, error } = await supabase.rpc('get_related_industries', {
    p_global_pack_id: globalPackId,
    p_min_weight: minWeight,
    p_limit: limit,
  });

  if (error) throw error;
  return (data || []) as unknown as RelatedIndustry[];
}

async function fetchIndustryRegulations(
  globalPackId: string,
  includeInherited = true
): Promise<IndustryRegulation[]> {
  const { data, error } = await supabase.rpc('get_industry_regulations', {
    p_global_pack_id: globalPackId,
    p_include_inherited: includeInherited,
  });

  if (error) throw error;
  return (data || []) as unknown as IndustryRegulation[];
}

// ============================================
// Query Hooks
// ============================================

/**
 * Fetch a single knowledge node by ID
 */
export function useKnowledgeNode(nodeId: string | null) {
  return useQuery({
    queryKey: knowledgeGraphKeys.node(nodeId || ''),
    queryFn: () => fetchNode(nodeId!),
    enabled: !!nodeId,
  });
}

/**
 * Fetch all nodes of a specific type
 */
export function useKnowledgeNodesByType(nodeType: KnowledgeNodeType | null) {
  return useQuery({
    queryKey: knowledgeGraphKeys.nodesByType(nodeType || 'industry'),
    queryFn: () => fetchNodesByType(nodeType!),
    enabled: !!nodeType,
  });
}

/**
 * Fetch all nodes for a global pack
 */
export function useKnowledgeNodesByPack(globalPackId: string | null) {
  return useQuery({
    queryKey: knowledgeGraphKeys.nodesByPack(globalPackId || ''),
    queryFn: () => fetchNodesByPack(globalPackId!),
    enabled: !!globalPackId,
  });
}

/**
 * Fetch nodes connected to a given node
 */
export function useConnectedNodes(options: ConnectedNodesOptions | null) {
  return useQuery({
    queryKey: knowledgeGraphKeys.connected(options?.nodeId || ''),
    queryFn: () => fetchConnectedNodes(options!),
    enabled: !!options?.nodeId,
  });
}

/**
 * Traverse the graph from a starting node
 */
export function useGraphTraversal(options: TraversalOptions | null) {
  return useQuery({
    queryKey: knowledgeGraphKeys.traversal(options?.startNodeId || ''),
    queryFn: () => traverseGraph(options!),
    enabled: !!options?.startNodeId,
  });
}

/**
 * Get related industries for a global pack
 */
export function useRelatedIndustries(
  globalPackId: string | null,
  minWeight = 0.5,
  limit = 5
) {
  return useQuery({
    queryKey: [...knowledgeGraphKeys.relatedIndustries(globalPackId || ''), minWeight, limit],
    queryFn: () => fetchRelatedIndustries(globalPackId!, minWeight, limit),
    enabled: !!globalPackId,
  });
}

/**
 * Get regulations for an industry
 */
export function useIndustryRegulations(
  globalPackId: string | null,
  includeInherited = true
) {
  return useQuery({
    queryKey: [...knowledgeGraphKeys.regulations(globalPackId || ''), includeInherited],
    queryFn: () => fetchIndustryRegulations(globalPackId!, includeInherited),
    enabled: !!globalPackId,
  });
}

// ============================================
// Mutation Hooks
// ============================================

/**
 * Create a new knowledge node
 */
export function useCreateKnowledgeNode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateNodeInput) => {
      const { data, error } = await supabase
        .from('industry_knowledge_nodes')
        .insert({
          global_pack_id: input.global_pack_id,
          node_type: input.node_type,
          node_key: input.node_key,
          display_name: toJson(input.display_name),
          description: toJson(input.description),
          properties: toJson(input.properties),
        })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as KnowledgeNode;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: knowledgeGraphKeys.nodes() });
      if (data.global_pack_id) {
        queryClient.invalidateQueries({ 
          queryKey: knowledgeGraphKeys.nodesByPack(data.global_pack_id) 
        });
      }
    },
  });
}

/**
 * Update a knowledge node
 */
export function useUpdateKnowledgeNode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      nodeId, 
      updates 
    }: { 
      nodeId: string; 
      updates: Partial<Omit<CreateNodeInput, 'node_type' | 'node_key'>> 
    }) => {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      
      if (updates.global_pack_id !== undefined) {
        updateData.global_pack_id = updates.global_pack_id;
      }
      if (updates.display_name !== undefined) {
        updateData.display_name = toJson(updates.display_name);
      }
      if (updates.description !== undefined) {
        updateData.description = toJson(updates.description);
      }
      if (updates.properties !== undefined) {
        updateData.properties = toJson(updates.properties);
      }

      const { data, error } = await supabase
        .from('industry_knowledge_nodes')
        .update(updateData)
        .eq('id', nodeId)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as KnowledgeNode;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: knowledgeGraphKeys.node(data.id) });
      queryClient.invalidateQueries({ queryKey: knowledgeGraphKeys.nodes() });
    },
  });
}

/**
 * Delete (deactivate) a knowledge node
 */
export function useDeleteKnowledgeNode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (nodeId: string) => {
      const { error } = await supabase
        .from('industry_knowledge_nodes')
        .update({ is_active: false })
        .eq('id', nodeId);

      if (error) throw error;
      return nodeId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: knowledgeGraphKeys.all });
    },
  });
}

/**
 * Create a new edge between nodes
 */
export function useCreateKnowledgeEdge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateEdgeInput) => {
      const { data, error } = await supabase
        .from('industry_knowledge_edges')
        .insert({
          source_node_id: input.source_node_id,
          target_node_id: input.target_node_id,
          edge_type: input.edge_type,
          weight: input.weight ?? 1.0,
          properties: toJson(input.properties),
          is_bidirectional: input.is_bidirectional ?? false,
        })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as KnowledgeEdge;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: knowledgeGraphKeys.connected(data.source_node_id) 
      });
      queryClient.invalidateQueries({ 
        queryKey: knowledgeGraphKeys.connected(data.target_node_id) 
      });
      queryClient.invalidateQueries({ queryKey: knowledgeGraphKeys.edges() });
    },
  });
}

/**
 * Update an edge
 */
export function useUpdateKnowledgeEdge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      edgeId, 
      updates 
    }: { 
      edgeId: string; 
      updates: Partial<Pick<CreateEdgeInput, 'weight' | 'properties' | 'is_bidirectional'>> 
    }) => {
      const updateData: Record<string, unknown> = {};
      
      if (updates.weight !== undefined) {
        updateData.weight = updates.weight;
      }
      if (updates.properties !== undefined) {
        updateData.properties = toJson(updates.properties);
      }
      if (updates.is_bidirectional !== undefined) {
        updateData.is_bidirectional = updates.is_bidirectional;
      }

      const { data, error } = await supabase
        .from('industry_knowledge_edges')
        .update(updateData)
        .eq('id', edgeId)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as KnowledgeEdge;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: knowledgeGraphKeys.all });
    },
  });
}

/**
 * Delete an edge
 */
export function useDeleteKnowledgeEdge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (edgeId: string) => {
      const { error } = await supabase
        .from('industry_knowledge_edges')
        .delete()
        .eq('id', edgeId);

      if (error) throw error;
      return edgeId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: knowledgeGraphKeys.all });
    },
  });
}

// ============================================
// Combined Hook for Full Graph Operations
// ============================================

/**
 * Main hook providing all knowledge graph operations
 */
export function useKnowledgeGraph(globalPackId?: string | null) {
  const nodesQuery = useKnowledgeNodesByPack(globalPackId || null);
  const relatedQuery = useRelatedIndustries(globalPackId || null);
  const regulationsQuery = useIndustryRegulations(globalPackId || null);

  const createNode = useCreateKnowledgeNode();
  const updateNode = useUpdateKnowledgeNode();
  const deleteNode = useDeleteKnowledgeNode();
  const createEdge = useCreateKnowledgeEdge();
  const updateEdge = useUpdateKnowledgeEdge();
  const deleteEdge = useDeleteKnowledgeEdge();

  return {
    // Data
    nodes: nodesQuery.data || [],
    relatedIndustries: relatedQuery.data || [],
    regulations: regulationsQuery.data || [],
    
    // Loading states
    isLoading: nodesQuery.isLoading || relatedQuery.isLoading || regulationsQuery.isLoading,
    isNodesLoading: nodesQuery.isLoading,
    isRelatedLoading: relatedQuery.isLoading,
    isRegulationsLoading: regulationsQuery.isLoading,

    // Errors
    error: nodesQuery.error || relatedQuery.error || regulationsQuery.error,

    // Mutations
    createNode: createNode.mutateAsync,
    updateNode: updateNode.mutateAsync,
    deleteNode: deleteNode.mutateAsync,
    createEdge: createEdge.mutateAsync,
    updateEdge: updateEdge.mutateAsync,
    deleteEdge: deleteEdge.mutateAsync,

    // Mutation states
    isCreatingNode: createNode.isPending,
    isUpdatingNode: updateNode.isPending,
    isDeletingNode: deleteNode.isPending,
    isCreatingEdge: createEdge.isPending,
    isUpdatingEdge: updateEdge.isPending,
    isDeletingEdge: deleteEdge.isPending,
  };
}
