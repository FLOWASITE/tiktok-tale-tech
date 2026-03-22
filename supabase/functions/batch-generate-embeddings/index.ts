// ============================================
// Batch Generate Embeddings Edge Function
// Processes all knowledge graph nodes without embeddings
// Uses Supabase.ai.Session with gte-small model (384 dimensions)
// Enhanced with retry logic and better error handling
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

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 500,
  maxDelayMs: 5000,
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
  estimated_time_remaining_ms?: number;
  avg_time_per_node_ms?: number;
}

interface BatchResult {
  processed: number;
  succeeded: number;
  failed: number;
  retried: number;
  errors: string[];
  duration_ms: number;
  avg_time_per_node_ms: number;
}

// Sleep utility for delays
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Calculate exponential backoff delay
function getRetryDelay(attempt: number): number {
  const delay = RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt);
  return Math.min(delay, RETRY_CONFIG.maxDelayMs);
}

// Generate embedding with retry logic
async function generateEmbeddingWithRetry(text: string): Promise<number[]> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      const output = await model.run(text, {
        mean_pool: true,
        normalize: true,
      });
      
      return Array.from(output as Float32Array);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[BatchEmbed] Retry ${attempt + 1}/${RETRY_CONFIG.maxRetries}: ${lastError.message}`);
      
      if (attempt < RETRY_CONFIG.maxRetries) {
        const delay = getRetryDelay(attempt);
        await sleep(delay);
      }
    }
  }
  
  throw lastError || new Error('Max retries exceeded');
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

// Get current batch status with estimated time
// deno-lint-ignore no-explicit-any
async function getBatchStatus(supabase: any, avgTimePerNodeMs?: number): Promise<BatchStatus> {
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
  
  // Calculate estimated time remaining
  let estimatedTimeRemainingMs: number | undefined;
  if (avgTimePerNodeMs && pending > 0) {
    estimatedTimeRemainingMs = Math.round(pending * avgTimePerNodeMs);
  }

  return {
    total_nodes: total,
    nodes_with_embeddings: withEmbeddings,
    nodes_pending: pending,
    progress_percent: progress,
    is_running: false,
    estimated_time_remaining_ms: estimatedTimeRemainingMs,
    avg_time_per_node_ms: avgTimePerNodeMs,
  };
}

// Process a batch of nodes with retry logic
// deno-lint-ignore no-explicit-any
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
  let retried = 0;

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
      retried: 0,
      errors: [fetchError.message],
      duration_ms: Date.now() - startTime,
      avg_time_per_node_ms: 0,
    };
  }

  if (!nodes || nodes.length === 0) {
    console.log('[BatchEmbed] No pending nodes found');
    return {
      processed: 0,
      succeeded: 0,
      failed: 0,
      retried: 0,
      errors: [],
      duration_ms: Date.now() - startTime,
      avg_time_per_node_ms: 0,
    };
  }

  console.log(`[BatchEmbed] Processing ${nodes.length} nodes with retry enabled...`);

  // Process nodes sequentially to avoid model overload
  // Track cumulative time to avoid CPU timeout (edge functions have ~400ms CPU limit)
  const MAX_SAFE_TIME_MS = 8000; // Stop before 10s wall-clock to be safe
  
  for (const node of nodes) {
    // Early exit if approaching time limit
    const elapsedMs = Date.now() - startTime;
    if (elapsedMs > MAX_SAFE_TIME_MS) {
      console.log(`[BatchEmbed] Approaching time limit (${elapsedMs}ms), stopping early`);
      break;
    }
    
    processed++;
    const nodeId = node.id as string;
    const nodeStartTime = Date.now();
    
    try {
      const nodeText = nodeToText(node);
      console.log(`[BatchEmbed] Processing node ${processed}/${nodes.length}: ${nodeId}`);
      
      // Use retry-enabled embedding generation
      const embedding = await generateEmbeddingWithRetry(nodeText);
      
      // Track if retry was used
      if (Date.now() - nodeStartTime > RETRY_CONFIG.baseDelayMs * 1.5) {
        retried++;
      }
      
      // Update node with embedding
      const { error: updateError } = await supabase
        .from('industry_knowledge_nodes')
        .update({ 
          embedding: `[${embedding.join(',')}]`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', nodeId);

      if (updateError) {
        failed++;
        errors.push(`Update failed for ${nodeId}: ${updateError.message}`);
        console.error('[BatchEmbed] Update error:', updateError);
      } else {
        succeeded++;
      }
    } catch (err) {
      failed++;
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      errors.push(`Node ${nodeId}: ${errMsg}`);
      console.error('[BatchEmbed] Node error after retries:', err);
    }
    
    // Small delay between nodes to avoid rate limiting
    if (processed < nodes.length) {
      await sleep(100);
    }
  }

  const durationMs = Date.now() - startTime;
  const avgTimePerNodeMs = processed > 0 ? Math.round(durationMs / processed) : 0;
  
  console.log(`[BatchEmbed] Completed: ${succeeded}/${processed} in ${durationMs}ms (${retried} retried)`);

  return {
    processed,
    succeeded,
    failed,
    retried,
    errors: errors.slice(0, 10), // Limit error messages
    duration_ms: durationMs,
    avg_time_per_node_ms: avgTimePerNodeMs,
  };
}

Deno.Deno.serve(withPerf({ functionName: 'batch-generate-embeddings', slowThresholdMs: 30000 }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: BatchRequest = await req.json();

    // Hard clamp batch size to protect compute limits (WORKER_LIMIT)
    const requestedBatchSize = typeof body.batch_size === 'number' ? body.batch_size : undefined;
    const safeBatchSize = Math.min(3, Math.max(1, requestedBatchSize ?? 3));

    const { action, node_types } = body;

    console.log('[BatchEmbed] Action:', action, 'Requested batch size:', requestedBatchSize, 'Using:', safeBatchSize);

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
      const result = await processBatch(supabase, safeBatchSize, node_types);
      const status = await getBatchStatus(supabase, result.avg_time_per_node_ms);

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
}));
