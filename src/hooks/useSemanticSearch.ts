// ============================================
// Semantic Search Hook
// Vector similarity search for Knowledge Graph
// ============================================

import { useState, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  SemanticSearchResult,
  SemanticSearchOptions,
  KnowledgeNodeType,
} from '@/types/knowledgeGraph';

// ============================================
// Query Keys
// ============================================

export const semanticSearchKeys = {
  all: ['semantic-search'] as const,
  search: (query: string, options?: Partial<SemanticSearchOptions>) => 
    [...semanticSearchKeys.all, query, options] as const,
};

// ============================================
// Types
// ============================================

interface EmbeddingResponse {
  embedding: number[];
}

interface SearchState {
  results: SemanticSearchResult[];
  isSearching: boolean;
  error: Error | null;
  lastQuery: string | null;
}

// ============================================
// Embedding Generation (via Edge Function)
// ============================================

async function generateEmbedding(text: string): Promise<number[]> {
  const { data, error } = await supabase.functions.invoke<EmbeddingResponse>(
    'generate-knowledge-embeddings',
    {
      body: { text, action: 'embed' },
    }
  );

  if (error) throw error;
  if (!data?.embedding) throw new Error('Failed to generate embedding');
  
  return data.embedding;
}

// ============================================
// Search Function
// ============================================

async function performSemanticSearch(
  options: SemanticSearchOptions
): Promise<SemanticSearchResult[]> {
  const { query, nodeTypes, globalPackId, threshold = 0.7, limit = 10 } = options;
  const startTime = performance.now();

  // Generate embedding for query
  const embedding = await generateEmbedding(query);

  // Convert embedding array to string format for Supabase RPC
  const embeddingString = `[${embedding.join(',')}]`;

  // Call the database function
  const { data, error } = await supabase.rpc('search_knowledge_nodes', {
    p_query_embedding: embeddingString,
    p_node_types: nodeTypes || null,
    p_global_pack_id: globalPackId || null,
    p_threshold: threshold,
    p_limit: limit,
  });

  if (error) throw error;
  
  const results = (data || []) as unknown as SemanticSearchResult[];
  const durationMs = Math.round(performance.now() - startTime);

  // Log query to analytics (fire-and-forget)
  try {
    supabase.rpc('log_knowledge_graph_query', {
      p_query_type: 'semantic_search',
      p_query_params: { query, nodeTypes, threshold, limit },
      p_result_count: results.length,
      p_duration_ms: durationMs,
    });
  } catch {
    // Ignore logging errors
  }

  return results;
}

// ============================================
// Hooks
// ============================================

/**
 * Hook for performing semantic search with manual trigger
 */
export function useSemanticSearch() {
  const [state, setState] = useState<SearchState>({
    results: [],
    isSearching: false,
    error: null,
    lastQuery: null,
  });

  const search = useCallback(async (options: SemanticSearchOptions) => {
    setState(prev => ({ ...prev, isSearching: true, error: null }));

    try {
      const results = await performSemanticSearch(options);
      setState({
        results,
        isSearching: false,
        error: null,
        lastQuery: options.query,
      });
      return results;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Search failed');
      setState(prev => ({
        ...prev,
        isSearching: false,
        error: err,
      }));
      throw err;
    }
  }, []);

  const clear = useCallback(() => {
    setState({
      results: [],
      isSearching: false,
      error: null,
      lastQuery: null,
    });
  }, []);

  return {
    ...state,
    search,
    clear,
  };
}

/**
 * Hook for semantic search with React Query (auto-fetch)
 */
export function useSemanticSearchQuery(
  options: SemanticSearchOptions | null,
  enabled = true
) {
  return useQuery({
    queryKey: semanticSearchKeys.search(options?.query || '', options || undefined),
    queryFn: () => performSemanticSearch(options!),
    enabled: enabled && !!options?.query && options.query.length >= 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for semantic search mutation (on-demand)
 */
export function useSemanticSearchMutation() {
  return useMutation({
    mutationFn: performSemanticSearch,
  });
}

// ============================================
// Convenience Hooks
// ============================================

/**
 * Search for similar industries
 */
export function useSearchSimilarIndustries(
  query: string | null,
  threshold = 0.7,
  limit = 5
) {
  return useSemanticSearchQuery(
    query ? {
      query,
      nodeTypes: ['industry'],
      threshold,
      limit,
    } : null,
    !!query
  );
}

/**
 * Search for related regulations
 */
export function useSearchRegulations(
  query: string | null,
  globalPackId?: string,
  threshold = 0.6,
  limit = 10
) {
  return useSemanticSearchQuery(
    query ? {
      query,
      nodeTypes: ['regulation'],
      globalPackId,
      threshold,
      limit,
    } : null,
    !!query
  );
}

/**
 * Search for relevant terms/concepts
 */
export function useSearchTermsAndConcepts(
  query: string | null,
  globalPackId?: string,
  threshold = 0.6,
  limit = 15
) {
  return useSemanticSearchQuery(
    query ? {
      query,
      nodeTypes: ['term', 'concept'],
      globalPackId,
      threshold,
      limit,
    } : null,
    !!query
  );
}

/**
 * Universal search across all node types
 */
export function useUniversalSearch(
  query: string | null,
  options?: {
    nodeTypes?: KnowledgeNodeType[];
    globalPackId?: string;
    threshold?: number;
    limit?: number;
  }
) {
  return useSemanticSearchQuery(
    query ? {
      query,
      nodeTypes: options?.nodeTypes,
      globalPackId: options?.globalPackId,
      threshold: options?.threshold ?? 0.6,
      limit: options?.limit ?? 20,
    } : null,
    !!query
  );
}

// ============================================
// Batch Embedding Generation
// ============================================

/**
 * Hook for generating embeddings for multiple texts
 */
export function useGenerateEmbeddings() {
  return useMutation({
    mutationFn: async (texts: string[]): Promise<Map<string, number[]>> => {
      const results = new Map<string, number[]>();
      
      // Process in batches of 10
      const batchSize = 10;
      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        const embeddings = await Promise.all(
          batch.map(text => generateEmbedding(text))
        );
        
        batch.forEach((text, idx) => {
          results.set(text, embeddings[idx]);
        });
      }
      
      return results;
    },
  });
}

// ============================================
// Find Similar Nodes
// ============================================

/**
 * Hook to find nodes similar to an existing node
 */
export function useFindSimilarNodes(
  nodeId: string | null,
  limit = 5
) {
  return useQuery({
    queryKey: ['similar-nodes', nodeId, limit],
    queryFn: async () => {
      if (!nodeId) return [];

      // First get the node's embedding
      const { data: node, error: nodeError } = await supabase
        .from('industry_knowledge_nodes')
        .select('embedding, node_type, global_pack_id')
        .eq('id', nodeId)
        .single();

      if (nodeError || !node?.embedding) {
        throw new Error('Node not found or has no embedding');
      }

      // Search for similar nodes - embedding is already a string from DB
      const { data, error } = await supabase.rpc('search_knowledge_nodes', {
        p_query_embedding: node.embedding,
        p_node_types: [node.node_type],
        p_global_pack_id: null, // Search across all packs
        p_threshold: 0.7,
        p_limit: limit + 1, // +1 to exclude self
      });

      if (error) throw error;

      // Filter out the original node
      return ((data || []) as unknown as SemanticSearchResult[])
        .filter(result => result.node_id !== nodeId)
        .slice(0, limit);
    },
    enabled: !!nodeId,
  });
}
