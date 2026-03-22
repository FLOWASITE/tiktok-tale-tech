// ============================================
// Auto Suggest Connections Edge Function
// Phase 7.3: Creates cross-industry edges based on embedding similarity
// ============================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SuggestRequest {
  action: 'suggest' | 'apply' | 'status';
  similarity_threshold?: number;
  max_suggestions?: number;
  node_types?: string[];
  dry_run?: boolean;
}

interface ConnectionSuggestion {
  source_id: string;
  target_id: string;
  source_name: string;
  target_name: string;
  similarity: number;
  edge_type: string;
  reason: string;
}

interface SuggestResult {
  suggestions: ConnectionSuggestion[];
  created_edges: number;
  skipped_existing: number;
  duration_ms: number;
}

// Calculate cosine similarity between two embedding vectors
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  return magnitude > 0 ? dotProduct / magnitude : 0;
}

// Get display name from multilingual object
function getDisplayName(displayName: Record<string, string> | null): string {
  if (!displayName) return 'Unknown';
  return displayName.vi || displayName.en || 'Unknown';
}

// Determine edge type based on node types
function determineEdgeType(sourceType: string, targetType: string): string {
  if (sourceType === 'industry' && targetType === 'industry') {
    return 'related_to';
  }
  if (sourceType === 'regulation' || targetType === 'regulation') {
    return 'related_to';
  }
  if (sourceType === 'term' || targetType === 'term') {
    return 'related_to';
  }
  return 'semantically_similar';
}

Deno.Deno.serve(withPerf({ functionName: 'auto-suggest-connections', slowThresholdMs: 30000 }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: SuggestRequest = await req.json();
    const { 
      action = 'suggest',
      similarity_threshold = 0.85,
      max_suggestions = 100,
      node_types = ['industry'],
      dry_run = false,
    } = body;

    console.log('[AutoSuggest] Action:', action, 'Threshold:', similarity_threshold);
    const startTime = Date.now();

    if (action === 'status') {
      // Get stats on existing edges and nodes with embeddings
      const { count: edgeCount } = await supabase
        .from('industry_knowledge_edges')
        .select('*', { count: 'exact', head: true })
        .eq('edge_type', 'related_to');
      
      const { count: nodesWithEmbeddings } = await supabase
        .from('industry_knowledge_nodes')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .not('embedding', 'is', null);

      return new Response(
        JSON.stringify({
          existing_related_edges: edgeCount || 0,
          nodes_with_embeddings: nodesWithEmbeddings || 0,
          ready: (nodesWithEmbeddings || 0) > 10,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch all nodes with embeddings
    let query = supabase
      .from('industry_knowledge_nodes')
      .select('id, node_type, node_key, display_name, embedding')
      .eq('is_active', true)
      .not('embedding', 'is', null);

    if (node_types.length > 0) {
      query = query.in('node_type', node_types);
    }

    const { data: nodes, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Failed to fetch nodes: ${fetchError.message}`);
    }

    if (!nodes || nodes.length < 2) {
      return new Response(
        JSON.stringify({
          suggestions: [],
          created_edges: 0,
          skipped_existing: 0,
          duration_ms: Date.now() - startTime,
          message: 'Not enough nodes with embeddings',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[AutoSuggest] Processing ${nodes.length} nodes...`);

    // Fetch existing edges to avoid duplicates
    const { data: existingEdges } = await supabase
      .from('industry_knowledge_edges')
      .select('source_node_id, target_node_id');

    const existingEdgeSet = new Set(
      (existingEdges || []).map(e => `${e.source_node_id}-${e.target_node_id}`)
    );

    // Also add reverse direction
    (existingEdges || []).forEach(e => {
      existingEdgeSet.add(`${e.target_node_id}-${e.source_node_id}`);
    });

    // Parse embeddings and find similar pairs
    const suggestions: ConnectionSuggestion[] = [];
    let skippedExisting = 0;

    for (let i = 0; i < nodes.length && suggestions.length < max_suggestions; i++) {
      for (let j = i + 1; j < nodes.length && suggestions.length < max_suggestions; j++) {
        const nodeA = nodes[i];
        const nodeB = nodes[j];

        // Skip if edge already exists
        if (existingEdgeSet.has(`${nodeA.id}-${nodeB.id}`)) {
          skippedExisting++;
          continue;
        }

        // Parse embeddings
        let embeddingA: number[];
        let embeddingB: number[];
        
        try {
          embeddingA = typeof nodeA.embedding === 'string' 
            ? JSON.parse(nodeA.embedding) 
            : nodeA.embedding;
          embeddingB = typeof nodeB.embedding === 'string' 
            ? JSON.parse(nodeB.embedding) 
            : nodeB.embedding;
        } catch {
          continue;
        }

        const similarity = cosineSimilarity(embeddingA, embeddingB);

        if (similarity >= similarity_threshold) {
          suggestions.push({
            source_id: nodeA.id,
            target_id: nodeB.id,
            source_name: getDisplayName(nodeA.display_name),
            target_name: getDisplayName(nodeB.display_name),
            similarity: Math.round(similarity * 1000) / 1000,
            edge_type: determineEdgeType(nodeA.node_type, nodeB.node_type),
            reason: `Semantic similarity: ${(similarity * 100).toFixed(1)}%`,
          });
        }
      }
    }

    // Sort by similarity (highest first)
    suggestions.sort((a, b) => b.similarity - a.similarity);

    console.log(`[AutoSuggest] Found ${suggestions.length} suggestions, ${skippedExisting} already exist`);

    // Apply suggestions if not dry run
    let createdEdges = 0;
    if (action === 'apply' && !dry_run && suggestions.length > 0) {
      const edgesToInsert = suggestions.map(s => ({
        source_node_id: s.source_id,
        target_node_id: s.target_id,
        edge_type: s.edge_type,
        properties: {
          auto_generated: true,
          similarity_score: s.similarity,
          created_by: 'auto-suggest-connections',
        },
        weight: s.similarity,
      }));

      const { error: insertError, data: inserted } = await supabase
        .from('industry_knowledge_edges')
        .insert(edgesToInsert)
        .select('id');

      if (insertError) {
        console.error('[AutoSuggest] Insert error:', insertError);
      } else {
        createdEdges = inserted?.length || 0;
        console.log(`[AutoSuggest] Created ${createdEdges} edges`);
      }
    }

    const result: SuggestResult = {
      suggestions: suggestions.slice(0, 50), // Return top 50 for UI
      created_edges: createdEdges,
      skipped_existing: skippedExisting,
      duration_ms: Date.now() - startTime,
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[AutoSuggest] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));
