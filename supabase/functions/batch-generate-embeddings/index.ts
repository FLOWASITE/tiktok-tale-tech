// ============================================
// Batch Generate Embeddings Edge Function
// Processes all knowledge graph nodes without embeddings
// Supports progress tracking and resumable batching
// ============================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BatchRequest {
  action: 'start' | 'status' | 'resume';
  batch_size?: number;
  node_types?: string[];
}

interface BatchStatus {
  total_nodes: number;
  nodes_with_embeddings: number;
  nodes_pending: number;
  progress_percent: number;
  is_running: boolean;
  last_batch_at?: string;
  errors?: string[];
}

interface BatchResult {
  processed: number;
  succeeded: number;
  failed: number;
  errors: string[];
  duration_ms: number;
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
    console.error('[BatchEmbed] API error:', response.status, errorData);
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
  
  // Node key for additional context
  if (node.node_key) {
    parts.push(`Key: ${node.node_key}`);
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
    if (properties.parent_code) {
      parts.push(`Parent: ${properties.parent_code}`);
    }
  }
  
  return parts.join('\n');
}

// Get current batch status
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getBatchStatus(supabase: any): Promise<BatchStatus> {
  // Get total nodes count
  const { count: totalCount, error: totalError } = await supabase
    .from('industry_knowledge_nodes')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  if (totalError) {
    console.error('[BatchEmbed] Error counting total:', totalError);
  }

  // Get nodes with embeddings count
  const { count: withEmbeddingsCount, error: embeddingsError } = await supabase
    .from('industry_knowledge_nodes')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .not('embedding', 'is', null);

  if (embeddingsError) {
    console.error('[BatchEmbed] Error counting embeddings:', embeddingsError);
  }

  const total = totalCount || 0;
  const withEmbeddings = withEmbeddingsCount || 0;
  const pending = total - withEmbeddings;
  const progress = total > 0 ? Math.round((withEmbeddings / total) * 100) : 0;

  return {
    total_nodes: total,
    nodes_with_embeddings: withEmbeddings,
    nodes_pending: pending,
    progress_percent: progress,
    is_running: false,
  };
}

// Process a batch of nodes
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processBatch(
  supabase: any,
  batchSize: number,
  nodeTypes?: string[]
): Promise<BatchResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  // Fetch nodes without embeddings
  let query = supabase
    .from('industry_knowledge_nodes')
    .select('*')
    .eq('is_active', true)
    .is('embedding', null)
    .limit(batchSize);

  if (nodeTypes && nodeTypes.length > 0) {
    query = query.in('node_type', nodeTypes);
  }

  const { data: nodes, error: fetchError } = await query;

  if (fetchError) {
    console.error('[BatchEmbed] Fetch error:', fetchError);
    return {
      processed: 0,
      succeeded: 0,
      failed: 0,
      errors: [fetchError.message],
      duration_ms: Date.now() - startTime,
    };
  }

  if (!nodes || nodes.length === 0) {
    console.log('[BatchEmbed] No pending nodes found');
    return {
      processed: 0,
      succeeded: 0,
      failed: 0,
      errors: [],
      duration_ms: Date.now() - startTime,
    };
  }

  console.log(`[BatchEmbed] Processing ${nodes.length} nodes...`);

  // Process nodes in smaller concurrent batches to respect rate limits
  const concurrentLimit = 5;
  for (let i = 0; i < nodes.length; i += concurrentLimit) {
    const batch = nodes.slice(i, i + concurrentLimit);
    
    const results = await Promise.allSettled(
      batch.map(async (node: Record<string, unknown>) => {
        const nodeId = node.id as string;
        const nodeText = nodeToText(node);
        console.log(`[BatchEmbed] Processing node ${nodeId}: ${nodeText.substring(0, 100)}...`);
        
        const embedding = await generateEmbedding(nodeText);
        
        // Update node with embedding
        const { error: updateError } = await supabase
          .from('industry_knowledge_nodes')
          .update({ 
            embedding: `[${embedding.join(',')}]`,
            updated_at: new Date().toISOString(),
          })
          .eq('id', nodeId);

        if (updateError) {
          throw new Error(`Update failed for ${nodeId}: ${updateError.message}`);
        }

        return nodeId;
      })
    );

    // Count results
    for (const result of results) {
      processed++;
      if (result.status === 'fulfilled') {
        succeeded++;
      } else {
        failed++;
        errors.push(result.reason?.message || 'Unknown error');
        console.error('[BatchEmbed] Node error:', result.reason);
      }
    }

    // Small delay between concurrent batches to avoid rate limits
    if (i + concurrentLimit < nodes.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  const durationMs = Date.now() - startTime;
  console.log(`[BatchEmbed] Completed: ${succeeded}/${processed} succeeded in ${durationMs}ms`);

  return {
    processed,
    succeeded,
    failed,
    errors: errors.slice(0, 10), // Limit error messages
    duration_ms: durationMs,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: BatchRequest = await req.json();
    const { action, batch_size = 50, node_types } = body;

    console.log('[BatchEmbed] Action:', action, 'Batch size:', batch_size);

    // Get current status
    if (action === 'status') {
      const status = await getBatchStatus(supabase);
      return new Response(
        JSON.stringify(status),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Start or resume batch processing
    if (action === 'start' || action === 'resume') {
      const result = await processBatch(supabase, batch_size, node_types);
      const status = await getBatchStatus(supabase);
      
      return new Response(
        JSON.stringify({
          result,
          status,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use: status, start, resume' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[BatchEmbed] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
