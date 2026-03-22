// ============================================
// Generate Knowledge Embeddings Edge Function
// Creates vector embeddings for Knowledge Graph nodes
// Uses Supabase.ai.Session with gte-small model (384 dimensions)
// ============================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

// deno-lint-ignore no-explicit-any
declare const Supabase: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize gte-small embedding model (384 dimensions)
const model = new Supabase.ai.Session('gte-small');

interface EmbedRequest {
  action: 'embed' | 'batch_embed' | 'update_node';
  text?: string;
  texts?: string[];
  node_id?: string;
}

interface EmbeddingResponse {
  embedding?: number[];
  embeddings?: number[][];
  success?: boolean;
  error?: string;
}

// Generate embedding using Supabase.ai.Session (gte-small)
async function generateEmbedding(text: string): Promise<number[]> {
  console.log('[Embedding] Generating for text:', text.substring(0, 100) + '...');
  
  const output = await model.run(text, {
    mean_pool: true,
    normalize: true,
  });
  
  return Array.from(output as Float32Array);
}

// Generate text representation of a node for embedding
function nodeToText(node: Record<string, unknown>): string {
  const parts: string[] = [];
  
  // Node type
  if (node.node_type) {
    parts.push(`Type: ${node.node_type}`);
  }
  
  // Display name (multilingual)
  const displayName = node.display_name as Record<string, string> | null;
  if (displayName) {
    if (displayName.vi) parts.push(`Name (VI): ${displayName.vi}`);
    if (displayName.en) parts.push(`Name (EN): ${displayName.en}`);
  }
  
  // Description (multilingual)
  const description = node.description as Record<string, string> | null;
  if (description) {
    if (description.vi) parts.push(`Description (VI): ${description.vi}`);
    if (description.en) parts.push(`Description (EN): ${description.en}`);
  }
  
  // Properties
  const properties = node.properties as Record<string, unknown> | null;
  if (properties) {
    // Extract key properties for embedding
    if (properties.keywords) {
      const keywords = Array.isArray(properties.keywords) 
        ? properties.keywords.join(', ') 
        : properties.keywords;
      parts.push(`Keywords: ${keywords}`);
    }
    if (properties.category) {
      parts.push(`Category: ${properties.category}`);
    }
    if (properties.jurisdiction) {
      parts.push(`Jurisdiction: ${properties.jurisdiction}`);
    }
  }
  
  return parts.join('\n');
}

Deno.Deno.serve(withPerf({ functionName: 'generate-knowledge-embeddings', slowThresholdMs: 30000 }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: EmbedRequest = await req.json();
    const { action, text, texts, node_id } = body;

    console.log('[Embedding] Action:', action);

    // Single text embedding
    if (action === 'embed' && text) {
      const embedding = await generateEmbedding(text);
      return new Response(
        JSON.stringify({ embedding } as EmbeddingResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Batch text embedding
    if (action === 'batch_embed' && texts && texts.length > 0) {
      const embeddings: number[][] = [];
      
      // Process sequentially to avoid overwhelming the model
      for (const t of texts) {
        const embedding = await generateEmbedding(t);
        embeddings.push(embedding);
      }
      
      return new Response(
        JSON.stringify({ embeddings } as EmbeddingResponse),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update node embedding
    if (action === 'update_node' && node_id) {
      // Fetch node data
      const { data: node, error: fetchError } = await supabase
        .from('industry_knowledge_nodes')
        .select('*')
        .eq('id', node_id)
        .single();

      if (fetchError || !node) {
        return new Response(
          JSON.stringify({ success: false, error: 'Node not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Generate text representation and embedding
      const nodeText = nodeToText(node);
      console.log('[Embedding] Node text:', nodeText.substring(0, 200));
      
      const embedding = await generateEmbedding(nodeText);

      // Update node with embedding (format as PostgreSQL vector)
      const { error: updateError } = await supabase
        .from('industry_knowledge_nodes')
        .update({ 
          embedding: `[${embedding.join(',')}]`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', node_id);

      if (updateError) {
        console.error('[Embedding] Update error:', updateError);
        return new Response(
          JSON.stringify({ success: false, error: updateError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, embedding }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action or missing parameters' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Embedding] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));
