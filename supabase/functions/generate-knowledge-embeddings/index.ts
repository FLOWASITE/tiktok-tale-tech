// ============================================
// Generate Knowledge Embeddings Edge Function
// Creates vector embeddings for Knowledge Graph nodes
// ============================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

// Generate embedding using Lovable AI Gateway
async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) {
    throw new Error('LOVABLE_API_KEY not configured');
  }

  const response = await fetch('https://ai.gateway.lovable.dev/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-004',
      input: text,
      dimensions: 768,
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('[Embedding] API error:', response.status, errorData);
    throw new Error(`Embedding API error: ${response.status}`);
  }

  const data = await response.json();
  return data.data?.[0]?.embedding || [];
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

Deno.serve(async (req) => {
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
      
      // Process in batches of 5 to avoid rate limits
      for (let i = 0; i < texts.length; i += 5) {
        const batch = texts.slice(i, i + 5);
        const batchEmbeddings = await Promise.all(
          batch.map(t => generateEmbedding(t))
        );
        embeddings.push(...batchEmbeddings);
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

      // Update node with embedding
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
});
