// ============================================
// Semantic Search Edge Function
// Uses Supabase.ai.Session with gte-small model (384 dimensions)
// ============================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { withPerf, getServiceClient } from "../_shared/middleware/perf.ts";

// deno-lint-ignore no-explicit-any
declare const Supabase: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Initialize gte-small embedding model (384 dimensions)
const model = new Supabase.ai.Session('gte-small');

interface SearchRequest {
  query: string;
  organizationId: string;
  brandTemplateId?: string;
  contentTypes?: ('topic' | 'script' | 'carousel' | 'multichannel')[];
  limit?: number;
  minSimilarity?: number;
  filters?: {
    category?: string;
    pillar?: string;
    minPerformance?: number;
  };
}

interface SearchResult {
  content_type: string;
  content_id: string;
  content_text: string;
  similarity: number;
  metadata: Record<string, unknown>;
}

// Generate embedding for query using Supabase.ai.Session
async function generateQueryEmbedding(query: string): Promise<number[]> {
  console.log('Generating embedding for query:', query.substring(0, 100));

  const output = await model.run(query, {
    mean_pool: true,
    normalize: true,
  });

  return Array.from(output as Float32Array);
}

// Search embeddings using pgvector
// deno-lint-ignore no-explicit-any
async function searchEmbeddings(
  supabase: any,
  queryEmbedding: number[],
  organizationId: string,
  brandTemplateId?: string,
  contentTypes?: string[],
  limit: number = 5,
  minSimilarity: number = 0.7,
  filters?: { category?: string; pillar?: string; minPerformance?: number }
): Promise<SearchResult[]> {
  // Format embedding as PostgreSQL vector
  const embeddingStr = `[${queryEmbedding.join(',')}]`;

  // Use the search_embeddings database function
  const { data, error } = await supabase.rpc('search_embeddings', {
    query_embedding: embeddingStr,
    match_organization_id: organizationId,
    match_brand_template_id: brandTemplateId || null,
    match_content_types: contentTypes || null,
    match_threshold: minSimilarity,
    match_count: limit * 2, // Fetch more to allow for filtering
  });

  if (error) {
    console.error('Search error:', error);
    throw error;
  }

  // Apply additional filters
  let results: SearchResult[] = data || [];

  if (filters) {
    results = results.filter((r: SearchResult) => {
      if (filters.category && r.metadata?.category !== filters.category) return false;
      if (filters.pillar && r.metadata?.pillar !== filters.pillar) return false;
      if (filters.minPerformance && ((r.metadata?.performance_score as number) || 0) < filters.minPerformance) return false;
      return true;
    });
  }

  // Deduplicate by content_id (keep highest similarity)
  const deduped = new Map<string, SearchResult>();
  for (const r of results) {
    const key = `${r.content_type}:${r.content_id}`;
    if (!deduped.has(key) || deduped.get(key)!.similarity < r.similarity) {
      deduped.set(key, r);
    }
  }

  return Array.from(deduped.values())
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

Deno.Deno.serve(withPerf({ functionName: 'semantic-search' }, async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: SearchRequest = await req.json();
    const { 
      query, 
      organizationId, 
      brandTemplateId, 
      contentTypes, 
      limit = 5, 
      minSimilarity = 0.7,
      filters 
    } = body;

    if (!query || !organizationId) {
      return new Response(
        JSON.stringify({ error: 'query and organizationId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate limit
    const safeLimit = Math.min(Math.max(1, limit), 20);
    const safeSimilarity = Math.min(Math.max(0.5, minSimilarity), 0.95);

    console.log(`Semantic search: "${query.substring(0, 50)}..." (org: ${organizationId})`);

    // Generate query embedding
    const queryEmbedding = await generateQueryEmbedding(query);

    // Search in database
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const results = await searchEmbeddings(
      supabase,
      queryEmbedding,
      organizationId,
      brandTemplateId,
      contentTypes,
      safeLimit,
      safeSimilarity,
      filters
    );

    console.log(`Found ${results.length} results`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        query_info: {
          query: query.substring(0, 100),
          limit: safeLimit,
          min_similarity: safeSimilarity,
          content_types: contentTypes || 'all'
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('semantic-search error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));
